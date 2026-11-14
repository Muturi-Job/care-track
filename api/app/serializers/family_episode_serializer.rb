# The family progress page (CLAUDE.md rule 3): only what that page renders.
#
# Deliberately absent: ids, ward or bed, tracking code (it is already in the
# URL), raw delay reasons, staff detail, and anything clinical.
class FamilyEpisodeSerializer
  # The stage data holds one expected time, so the page gets a range instead of
  # a number that would read like a promise (rule 4): +/- 25%, rounded to five
  # minutes.
  DURATION_SPREAD = 0.25
  DURATION_STEP = 5

  DEFAULT_CONTACT_PHONE = "0000 000 000"
  DEFAULT_CONTACT_TEXT = "The care team can be reached through the ward."
  DEFAULT_VISITING_TEXT = "Visiting is arranged with the ward. Please call before you visit."

  def initialize(episode)
    @episode = episode
  end

  def as_json(*)
    {
      patient_alias: episode.patient_alias,
      procedure: episode.procedure_template.name,
      stages: stages,
      current_stage: current_stage,
      special_status: special_status,
      what_happens_next: what_happens_next,
      expected_duration: expected_duration,
      last_updated_at: episode.updated_at.utc.iso8601,
      hospital_contact: hospital_contact,
      hospital_visiting: ENV.fetch("HOSPITAL_VISITING_TEXT", DEFAULT_VISITING_TEXT)
    }
  end

  private

  attr_reader :episode

  def stages
    @stages ||= episode.procedure_template.stage_templates.map do |stage|
      {
        label: stage.label,
        family_explanation: stage.family_explanation.presence || FamilyMessageCatalog::FALLBACK,
        state: state_for(stage.position)
      }
    end
  end

  def state_for(position)
    if position < episode.current_stage_position
      "done"
    elsif position == episode.current_stage_position
      "current"
    else
      "upcoming"
    end
  end

  # If the position matches no stage the page cannot explain anything, so it
  # gets the rule 4 fallback rather than a guessed label.
  def current_stage
    stages.find { |stage| stage[:state] == "current" } ||
      { label: nil, family_explanation: FamilyMessageCatalog::FALLBACK, state: "current" }
  end

  def special_status
    return nil if episode.normal?

    {
      kind: episode.status_flag,
      message: FamilyMessageCatalog.for_status(episode.status_flag)
    }
  end

  # The next stage's own explanation is the best description of what is coming.
  def what_happens_next
    next_stage = episode.procedure_template.stage_at(episode.current_stage_position + 1)
    return FamilyMessageCatalog.message(:final_stage) if next_stage.nil?

    next_stage.family_explanation.presence || FamilyMessageCatalog::FALLBACK
  end

  def expected_duration
    expected = episode.current_stage_template&.expected_minutes
    return nil if expected.nil?

    {
      min_minutes: friendly_minutes(expected * (1 - DURATION_SPREAD)),
      max_minutes: friendly_minutes(expected * (1 + DURATION_SPREAD))
    }
  end

  def friendly_minutes(minutes)
    rounded = (minutes / DURATION_STEP.to_f).round * DURATION_STEP
    [ rounded, DURATION_STEP ].max
  end

  def hospital_contact
    {
      phone: ENV.fetch("HOSPITAL_CONTACT_PHONE", DEFAULT_CONTACT_PHONE),
      text: ENV.fetch("HOSPITAL_CONTACT_TEXT", DEFAULT_CONTACT_TEXT)
    }
  end
end
