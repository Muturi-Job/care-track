class StageEvent < ApplicationRecord
  belongs_to :episode
  belongs_to :stage_template

  enum :event_type, {
    advanced: "advanced",
    undone: "undone",
    flagged: "flagged",
    flag_cleared: "flag_cleared"
  }, validate: true

  before_validation :default_occurred_at

  validates :occurred_at, presence: true
  validates :idempotency_key, uniqueness: true, allow_nil: true
  validate :stage_template_belongs_to_episode_template

  private

  def default_occurred_at
    self.occurred_at ||= Time.current
  end

  # A stage only makes sense within its own procedure's sequence; this stops a
  # mis-keyed event from pointing at another procedure's stage.
  def stage_template_belongs_to_episode_template
    return if episode.nil? || stage_template.nil?
    return if stage_template.procedure_template_id == episode.procedure_template_id

    errors.add(:stage_template, "must belong to the episode's procedure template")
  end
end
