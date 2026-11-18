# Every staff action that changes an episode's stage or flag goes through here.
# Controllers stay thin, and each rule below has a spec (CLAUDE.md rule 6).
#
# Access control note: this service assumes the caller is staff. Phase A has no
# authentication (CLAUDE.md rule 1); the controller marks where it will go.
class StageTransitionService
  # Undo is a short grace period for a mis-tap, not a general edit window.
  UNDO_WINDOW = 2.minutes
  FLAGGABLE_STATUSES = %w[delayed call_care_team].freeze
  MAX_IDEMPOTENCY_KEY_LENGTH = 100

  Result = Struct.new(:episode, :event, :replayed, keyword_init: true)

  # Raised inside a transaction so a rejected rule leaves nothing behind.
  class Rejected < StandardError
    attr_reader :code, :http_status

    def initialize(code, http_status: 422, message: nil)
      @code = code
      @http_status = http_status
      super(message || self.class.message_for(code))
    end

    def self.message_for(code)
      {
        terminal_stage: "This episode is already at its final stage.",
        nothing_to_undo: "There is no recent advance to undo.",
        undo_window_expired: "Undo is only available for two minutes after an advance.",
        invalid_status: "Use delayed or call_care_team, or clear the flag instead.",
        validation_failed: "That change is not valid for this episode.",
        idempotency_key_required: "An Idempotency-Key header is required.",
        invalid_idempotency_key: "An Idempotency-Key must be 100 characters or fewer.",
        idempotency_conflict: "That Idempotency-Key was already used for another episode."
      }.fetch(code, code.to_s.humanize)
    end
  end

  # Idempotent advance: the row lock serialises concurrent taps, and the
  # Idempotency-Key makes a retried tap a no-op.
  def advance(episode_id:, idempotency_key:, recorded_by_device: nil, now: Time.current)
    key = normalize_key(idempotency_key)

    Episode.transaction do
      episode = Episode.lock.find(episode_id)

      replay = replay_for(episode, key)
      return replay if replay

      next_stage = episode.procedure_template.stage_at(episode.current_stage_position + 1)
      raise Rejected.new(:terminal_stage) if next_stage.nil?

      event = StageEvent.create!(
        episode: episode,
        stage_template: next_stage,
        event_type: "advanced",
        occurred_at: now,
        idempotency_key: key,
        status_flag: episode.status_flag,
        delay_reason: episode.delay_reason,
        recorded_by_device: recorded_by_device
      )

      episode.update!(advance_attributes(episode, next_stage, now))
      Result.new(episode: episode, event: event, replayed: false)
    end
  rescue ActiveRecord::RecordNotUnique
    # A different episode used the same key at the same moment.
    raise Rejected.new(:idempotency_conflict, http_status: :conflict)
  rescue ActiveRecord::RecordInvalid => e
    raise Rejected.new(:validation_failed, message: e.record.errors.full_messages.to_sentence)
  end

  def undo(episode_id:, now: Time.current)
    Episode.transaction do
      episode = Episode.lock.find(episode_id)

      advance = latest_position_event(episode)
      raise Rejected.new(:nothing_to_undo) unless advance&.event_type == "advanced"
      raise Rejected.new(:undo_window_expired) if advance.occurred_at < now - UNDO_WINDOW

      previous_stage = episode.procedure_template.stage_at(episode.current_stage_position - 1)
      raise Rejected.new(:nothing_to_undo) if previous_stage.nil?

      event = StageEvent.create!(
        episode: episode,
        stage_template: previous_stage,
        event_type: "undone",
        occurred_at: now
      )

      episode.update!(undo_attributes(episode, previous_stage))
      Result.new(episode: episode, event: event, replayed: false)
    end
  rescue ActiveRecord::RecordInvalid => e
    raise Rejected.new(:validation_failed, message: e.record.errors.full_messages.to_sentence)
  end

  def flag(episode_id:, status_flag:, delay_reason: nil, recorded_by_device: nil, now: Time.current)
    status = status_flag.to_s
    raise Rejected.new(:invalid_status) unless FLAGGABLE_STATUSES.include?(status)

    Episode.transaction do
      episode = Episode.lock.find(episode_id)
      reason = delay_reason.to_s.presence

      # Re-tapping the same flag changes nothing, so it adds no history.
      return no_change(episode) if episode.status_flag == status && episode.delay_reason == reason

      episode.status_flag = status
      episode.delay_reason = reason
      unless episode.valid?
        raise Rejected.new(:validation_failed, message: episode.errors.full_messages.to_sentence)
      end

      event = StageEvent.create!(
        episode: episode,
        stage_template: episode.current_stage_template,
        event_type: "flagged",
        occurred_at: now,
        status_flag: status,
        delay_reason: reason,
        recorded_by_device: recorded_by_device
      )

      episode.save!
      Result.new(episode: episode, event: event, replayed: false)
    end
  rescue ActiveRecord::RecordInvalid => e
    raise Rejected.new(:validation_failed, message: e.record.errors.full_messages.to_sentence)
  end

  # Clearing an already-clear flag is a no-op: no event, because nothing
  # changed (CLAUDE.md: history is the record of changes).
  def clear_flag(episode_id:, recorded_by_device: nil, now: Time.current)
    Episode.transaction do
      episode = Episode.lock.find(episode_id)
      return no_change(episode) if episode.normal?

      event = StageEvent.create!(
        episode: episode,
        stage_template: episode.current_stage_template,
        event_type: "flag_cleared",
        occurred_at: now,
        status_flag: "normal",
        delay_reason: nil,
        recorded_by_device: recorded_by_device
      )

      episode.update!(status_flag: "normal", delay_reason: nil)
      Result.new(episode: episode, event: event, replayed: false)
    end
  rescue ActiveRecord::RecordInvalid => e
    raise Rejected.new(:validation_failed, message: e.record.errors.full_messages.to_sentence)
  end

  private

  def no_change(episode)
    Result.new(episode: episode, event: nil, replayed: false)
  end

  def normalize_key(value)
    key = value.to_s.strip
    raise Rejected.new(:idempotency_key_required, http_status: :bad_request) if key.empty?

    if key.length > MAX_IDEMPOTENCY_KEY_LENGTH
      raise Rejected.new(:invalid_idempotency_key, http_status: :bad_request)
    end

    key
  end

  # Checked after the row lock is taken, so a retry that waited for the first
  # request sees the committed event instead of advancing again.
  def replay_for(episode, key)
    event = StageEvent.find_by(idempotency_key: key)
    return nil if event.nil?

    unless event.episode_id == episode.id
      raise Rejected.new(:idempotency_conflict, http_status: :conflict)
    end

    Result.new(episode: episode, event: event, replayed: true)
  end

  def advance_attributes(episode, next_stage, now)
    attributes = { current_stage_position: next_stage.position }
    return attributes unless next_stage.is_terminal?

    attributes.merge(discharged_at: now, link_expires_at: now + Episode.link_ttl)
  end

  # The stage being left decides whether the episode was discharged.
  def undo_attributes(episode, previous_stage)
    attributes = { current_stage_position: previous_stage.position }
    attributes[:discharged_at] = nil if episode.current_stage_template&.is_terminal?
    attributes
  end

  # Only a position-changing event can be undone, so one advance cannot be
  # undone twice by repeated taps.
  def latest_position_event(episode)
    episode.stage_events
           .where(event_type: %w[advanced undone])
           .order(occurred_at: :desc, created_at: :desc)
           .first
  end
end
