# Demo data for the Phase A prototype. Idempotent: safe to run repeatedly.
#
# Every word here is family-facing (CLAUDE.md rule 4): calm, plain, and free of
# clinical detail or outcomes.
module Seeds
  STAGES = [
    {
      label: "Admitted",
      family_explanation: "They have arrived and are settling in. A member of the care team will come and say hello.",
      expected_minutes: 15
    },
    {
      label: "Preparing",
      family_explanation: "The care team is getting things ready. This can take a little while, and there is nothing you need to do.",
      expected_minutes: 45
    },
    {
      label: "Heading to theatre",
      family_explanation: "They are on their way to the procedure room now.",
      expected_minutes: 15
    },
    {
      label: "Procedure started",
      family_explanation: "The procedure has started. We will update this page when there is news.",
      expected_minutes: 90
    },
    {
      label: "Procedure complete",
      family_explanation: "The procedure has finished, and the care team is still looking after them.",
      expected_minutes: 30
    },
    {
      label: "In recovery",
      family_explanation: "They are resting in recovery. The care team is close by and will take them back to the ward when they are ready.",
      expected_minutes: 60
    },
    {
      label: "Moved to ward",
      family_explanation: "They are back on the ward and resting.",
      expected_minutes: 45
    },
    {
      label: "Ready for visitors",
      family_explanation: "You are welcome to come and visit. Please speak to the ward staff when you arrive.",
      expected_minutes: 60
    },
    {
      label: "Discharged",
      family_explanation: "They are ready to leave. Please follow the instructions the care team has given you.",
      expected_minutes: nil,
      is_terminal: true
    }
  ].freeze

  PROCEDURE_NAMES = [ "Day Surgery", "Orthopaedic Surgery" ].freeze

  DEMO_EPISODES = [
    {
      patient_alias: "Patient A",
      procedure: "Day Surgery",
      ward_or_bed: "Ward 3, Bed 2",
      position: 3
    },
    {
      patient_alias: "Patient B",
      procedure: "Orthopaedic Surgery",
      ward_or_bed: "Ward 5, Bed 8",
      position: 6
    },
    {
      patient_alias: "Patient C",
      procedure: "Day Surgery",
      ward_or_bed: "Ward 3, Bed 4",
      position: 9,
      discharged: true
    }
  ].freeze

  def self.run
    templates = PROCEDURE_NAMES.index_with { |name| template_for(name) }

    create_demo_episodes(templates)
    report
  end

  def self.template_for(name)
    existing = ProcedureTemplate.find_by(name: name)
    return existing if existing

    template = ProcedureTemplate.new(name: name)
    STAGES.each_with_index do |stage, index|
      template.stage_templates.build(stage.merge(position: index + 1))
    end
    template.save!
    template
  end

  def self.create_demo_episodes(templates)
    DEMO_EPISODES.each do |attributes|
      next if Episode.exists?(patient_alias: attributes[:patient_alias])

      Episode.create!(
        procedure_template: templates.fetch(attributes[:procedure]),
        patient_alias: attributes[:patient_alias],
        ward_or_bed: attributes[:ward_or_bed],
        current_stage_position: attributes[:position],
        discharged_at: attributes[:discharged] ? Time.current : nil
      )
    end
  end

  def self.report
    puts "CareTrack demo data ready (#{Episode.count} episodes):"

    Episode.order(:patient_alias).each do |episode|
      stage = episode.current_stage_template
      puts "  #{episode.patient_alias} - #{episode.procedure_template.name}, " \
           "stage #{stage.position} (#{stage.label}) -> /p/#{episode.tracking_code}"
    end
  end
end

Seeds.run
