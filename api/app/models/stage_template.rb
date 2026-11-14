class StageTemplate < ApplicationRecord
  belongs_to :procedure_template, inverse_of: :stage_templates

  validates :position,
            presence: true,
            numericality: { only_integer: true, greater_than: 0 },
            uniqueness: { scope: :procedure_template_id }
  validates :label, presence: true
  # Family-facing copy is mandatory: a stage with no plain explanation would
  # leave the progress page guessing (CLAUDE.md rule 4).
  validates :family_explanation, presence: true
  validates :expected_minutes,
            numericality: { only_integer: true, greater_than: 0 },
            allow_nil: true
  validates :is_terminal, inclusion: { in: [ true, false ] }

  scope :in_order, -> { order(:position) }
end
