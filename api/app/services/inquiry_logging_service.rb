# Logging and undoing inquiries. Kept out of the controller so the
# Idempotency-Key and undo-window rules can be tested directly (CLAUDE.md
# rule 6).
#
# Access control note: this service assumes the caller is staff. Phase A has no
# authentication (CLAUDE.md rule 1); the controller marks where it will go.
class InquiryLoggingService
  MAX_IDEMPOTENCY_KEY_LENGTH = 100

  Result = Struct.new(:inquiry, :count, :replayed, keyword_init: true)

  class Rejected < StandardError
    attr_reader :code, :http_status

    def initialize(code, http_status: 422, message: nil)
      @code = code
      @http_status = http_status
      super(message || self.class.message_for(code))
    end

    def self.message_for(code)
      {
        invalid_channel: "Use phone, desk, ward, or other.",
        idempotency_key_required: "An Idempotency-Key header is required.",
        invalid_idempotency_key: "An Idempotency-Key must be 100 characters or fewer.",
        idempotency_conflict: "That Idempotency-Key was already used for another episode.",
        undo_window_expired: "Inquiries can only be removed for two minutes after logging.",
        validation_failed: "That inquiry could not be saved."
      }.fetch(code, code.to_s.humanize)
    end
  end

  # Idempotent log: the episode row lock serialises concurrent taps, and the
  # Idempotency-Key turns a retried tap into the same result.
  def log(episode_id:, channel:, idempotency_key:, now: Time.current)
    key = normalize_key(idempotency_key)
    channel = channel.to_s
    raise Rejected.new(:invalid_channel) unless Inquiry::CHANNELS.include?(channel)

    Episode.transaction do
      episode = Episode.lock.find(episode_id)

      replay = replay_for(episode, key)
      return replay if replay

      inquiry = Inquiry.create!(
        episode: episode,
        channel: channel,
        logged_at: now,
        idempotency_key: key
      )

      Result.new(inquiry: inquiry, count: episode.inquiries.count, replayed: false)
    end
  rescue ActiveRecord::RecordNotUnique
    raise Rejected.new(:idempotency_conflict, http_status: :conflict)
  rescue ActiveRecord::RecordInvalid => e
    raise Rejected.new(:validation_failed, message: e.record.errors.full_messages.to_sentence)
  end

  def undo(inquiry_id:, now: Time.current)
    Inquiry.transaction do
      inquiry = Inquiry.lock.find(inquiry_id)
      raise Rejected.new(:undo_window_expired) unless inquiry.undoable?(now: now)

      inquiry.destroy!
      inquiry
    end
  end

  private

  def normalize_key(value)
    key = value.to_s.strip
    raise Rejected.new(:idempotency_key_required, http_status: :bad_request) if key.empty?

    if key.length > MAX_IDEMPOTENCY_KEY_LENGTH
      raise Rejected.new(:invalid_idempotency_key, http_status: :bad_request)
    end

    key
  end

  # Checked after the episode lock is taken, so a retry that waited for the
  # first request sees the committed inquiry instead of logging again.
  def replay_for(episode, key)
    inquiry = Inquiry.find_by(idempotency_key: key)
    return nil if inquiry.nil?

    unless inquiry.episode_id == episode.id
      raise Rejected.new(:idempotency_conflict, http_status: :conflict)
    end

    Result.new(inquiry: inquiry, count: episode.inquiries.count, replayed: true)
  end
end
