class ProcedureTemplateSerializer
  def initialize(template)
    @template = template
  end

  def as_json(*)
    {
      id: template.id,
      name: template.name,
      active: template.active,
      stages: template.stage_templates.map { |stage| stage_json(stage) }
    }
  end

  private

  attr_reader :template

  def stage_json(stage)
    {
      position: stage.position,
      label: stage.label,
      family_explanation: stage.family_explanation,
      expected_minutes: stage.expected_minutes,
      is_terminal: stage.is_terminal
    }
  end
end
