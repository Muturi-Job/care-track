# Enforces the shape of a procedure's stage sequence (CLAUDE.md rule 4):
# positions must run 1..n with no gaps or duplicates, and exactly one stage is
# the terminal one. Runs on the parent so a sequence can be built all at once.
class StageSequenceValidator < ActiveModel::Validator
  def validate(record)
    stages = record.stage_templates.reject(&:marked_for_destruction?)
    errors = record.errors

    unless contiguous?(stages)
      errors.add(:stage_templates, "positions must run 1..n with no gaps or duplicates")
    end

    return if stages.count { |stage| stage.is_terminal? } == 1

    errors.add(:stage_templates, "must have exactly one terminal stage")
  end

  private

  def contiguous?(stages)
    stages.map(&:position).sort == (1..stages.size).to_a
  end
end
