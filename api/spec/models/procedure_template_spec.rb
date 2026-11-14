require "rails_helper"

RSpec.describe ProcedureTemplate, type: :model do
  def template_with(positions:, terminal_positions:)
    template = ProcedureTemplate.new(name: "Sequence test")

    positions.each do |position|
      template.stage_templates.build(
        position: position,
        label: "Stage #{position}",
        family_explanation: "A short, plain explanation.",
        is_terminal: terminal_positions.include?(position)
      )
    end

    template
  end

  it "is valid with a contiguous sequence and exactly one terminal stage" do
    expect(template_with(positions: [ 1, 2, 3 ], terminal_positions: [ 3 ])).to be_valid
  end

  it "is valid as built by the factory" do
    expect(create(:procedure_template)).to be_valid
  end

  it "rejects a gap in the positions" do
    template = template_with(positions: [ 1, 3 ], terminal_positions: [ 3 ])

    expect(template).not_to be_valid
    expect(template.errors[:stage_templates]).to include(a_string_matching(/contiguous/))
  end

  it "rejects duplicate positions" do
    template = template_with(positions: [ 1, 1, 2 ], terminal_positions: [ 2 ])

    expect(template).not_to be_valid
  end

  it "rejects more than one terminal stage" do
    template = template_with(positions: [ 1, 2, 3 ], terminal_positions: [ 2, 3 ])

    expect(template).not_to be_valid
    expect(template.errors[:stage_templates]).to include(a_string_matching(/exactly one terminal/))
  end

  it "rejects a sequence with no terminal stage" do
    template = template_with(positions: [ 1, 2, 3 ], terminal_positions: [])

    expect(template).not_to be_valid
    expect(template.errors[:stage_templates]).to include(a_string_matching(/exactly one terminal/))
  end

  it "rejects a template with no stages at all" do
    expect(ProcedureTemplate.new(name: "Empty template")).not_to be_valid
  end

  it "requires a name" do
    template = build(:procedure_template, name: nil)

    expect(template).not_to be_valid
    expect(template.errors[:name]).to include("can't be blank")
  end

  it "requires a unique name" do
    existing = create(:procedure_template)

    expect(build(:procedure_template, name: existing.name)).not_to be_valid
  end

  it "keeps stages in position order" do
    template = create(:procedure_template)

    expect(template.stage_templates.map(&:position)).to eq([ 1, 2, 3 ])
    expect(template.stage_count).to eq(3)
    expect(template.terminal_stage.position).to eq(3)
    expect(template.stage_at(2).label).to eq("Preparing")
    expect(template.stage_at(99)).to be_nil
  end
end
