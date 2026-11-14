FactoryBot.define do
  factory :procedure_template do
    sequence(:name) { |n| "Procedure #{n}" }
    active { true }

    # Built (not created) so a template can be saved with its whole sequence in
    # one go, which is what StageSequenceValidator expects.
    after(:build) do |template|
      labels = [ "Admitted", "Preparing", "Discharged" ]

      labels.each_with_index do |label, index|
        template.stage_templates.build(
          position: index + 1,
          label: label,
          family_explanation: "A short, plain explanation for the family.",
          expected_minutes: 20,
          is_terminal: index == labels.size - 1
        )
      end
    end
  end

  # An empty shell is not a valid template (it has no terminal stage), so the
  # stage factory always hangs off a valid template and appends the next
  # position.
  factory :stage_template do
    procedure_template
    position { (procedure_template.stage_templates.map(&:position).max || 0) + 1 }
    label { "Preparing" }
    family_explanation { "The care team is getting things ready." }
    expected_minutes { 30 }
    is_terminal { false }
  end

  factory :episode do
    association :procedure_template, factory: :procedure_template
    sequence(:patient_alias) { |n| "Patient #{n}" }
    ward_or_bed { "Ward 3, Bed 2" }
    current_stage_position { 2 }
    status_flag { "normal" }
  end

  factory :stage_event do
    episode
    event_type { "advanced" }
    occurred_at { Time.current }

    stage_template do
      stages = episode.procedure_template.stage_templates
      stages.find { |stage| stage.position == episode.current_stage_position } || stages.first
    end
  end
end
