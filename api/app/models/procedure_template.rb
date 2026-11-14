class ProcedureTemplate < ApplicationRecord
  has_many :stage_templates,
           -> { order(:position) },
           dependent: :destroy,
           inverse_of: :procedure_template
  has_many :episodes, dependent: :restrict_with_error

  validates :name, presence: true, uniqueness: true
  validates_with StageSequenceValidator

  def terminal_stage
    stage_templates.find(&:is_terminal?)
  end

  def stage_count
    stage_templates.size
  end

  # The family-facing label for a position, or nil if there is no such stage.
  def stage_at(position)
    stage_templates.find { |stage| stage.position == position }
  end
end
