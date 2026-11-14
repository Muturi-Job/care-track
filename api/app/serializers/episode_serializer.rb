class EpisodeSerializer
  def initialize(episode, include_history: false, now: Time.current)
    @episode = episode
    @include_history = include_history
    @now = now
  end

  def as_json(*)
    payload = {
      id: episode.id,
      patient_alias: episode.patient_alias,
      ward_or_bed: episode.ward_or_bed,
      procedure_template_id: episode.procedure_template_id,
      procedure_name: episode.procedure_template.name,
      current_stage_position: episode.current_stage_position,
      stage_label: stage&.label,
      is_final_stage: stage.present? && stage.is_terminal?,
      next_stage_label: next_stage&.label,
      expected_minutes: stage&.expected_minutes,
      minutes_in_current_stage: episode.minutes_in_current_stage(now: now),
      minutes_overdue: episode.minutes_overdue(now: now),
      status_flag: episode.status_flag,
      delay_reason: episode.delay_reason,
      tracking_code: episode.tracking_code,
      family_path: family_path,
      discharged_at: episode.discharged_at,
      link_expires_at: episode.link_expires_at,
      created_at: episode.created_at,
      updated_at: episode.updated_at
    }

    payload[:history] = history if include_history
    payload
  end

  private

  attr_reader :episode, :now, :include_history

  def stage
    @stage ||= episode.current_stage_template
  end

  # The staff card's one-tap button names the stage it will move to; at the
  # final stage there is no next stage and the button is disabled.
  def next_stage
    @next_stage ||= episode.procedure_template.stage_at(episode.current_stage_position + 1)
  end

  # The family page lives in the web app, not the API.
  def family_path
    "/f/#{episode.tracking_code}"
  end

  def history
    episode.stage_events
           .includes(:stage_template)
           .order(occurred_at: :desc, created_at: :desc)
           .map do |event|
             {
               event_type: event.event_type,
               stage_position: event.stage_template.position,
               stage_label: event.stage_template.label,
               occurred_at: event.occurred_at
             }
           end
  end
end
