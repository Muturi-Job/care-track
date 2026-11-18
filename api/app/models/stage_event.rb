class StageEvent < ApplicationRecord
  belongs_to :episode
  belongs_to :stage_template

  enum :event_type, {
    advanced: "advanced",
    undone: "undone",
    flagged: "flagged",
    flag_cleared: "flag_cleared"
  }, validate: true

  # The flag state when the event happened, snapshotted so the analysis still
  # knows why time was lost after the episode has been cleared.
  enum :status_flag, {
    normal: "normal",
    delayed: "delayed",
    call_care_team: "call_care_team"
  }, validate: { allow_nil: true }

  # Same fixed list as episodes.delay_reason.
  enum :delay_reason, {
    theatre_running_behind: "theatre_running_behind",
    awaiting_bed: "awaiting_bed",
    awaiting_team: "awaiting_team",
    other: "other"
  }, validate: { allow_nil: true }

  before_validation :default_occurred_at

  validates :occurred_at, presence: true
  validates :idempotency_key, uniqueness: true, allow_nil: true
  validates :recorded_by_device, length: { maximum: 50 }, allow_nil: true
  validate :delay_reason_only_when_delayed
  validate :stage_template_belongs_to_episode_template

  private

  def default_occurred_at
    self.occurred_at ||= Time.current
  end

  def delay_reason_only_when_delayed
    return if delay_reason.blank? || delayed?

    errors.add(:delay_reason, "is only allowed when the flag is delayed")
  end

  # A stage only makes sense within its own procedure's sequence; this stops a
  # mis-keyed event from pointing at another procedure's stage.
  def stage_template_belongs_to_episode_template
    return if episode.nil? || stage_template.nil?
    return if stage_template.procedure_template_id == episode.procedure_template_id

    errors.add(:stage_template, "must belong to the episode's procedure template")
  end
end
