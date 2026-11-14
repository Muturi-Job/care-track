require "rails_helper"

RSpec.describe StageTemplate, type: :model do
  it "is valid as built by the factory" do
    expect(build(:stage_template)).to be_valid
  end

  it "requires a label" do
    stage = build(:stage_template, label: nil)

    expect(stage).not_to be_valid
    expect(stage.errors[:label]).to include("can't be blank")
  end

  it "requires a plain-language family explanation" do
    stage = build(:stage_template, family_explanation: nil)

    expect(stage).not_to be_valid
    expect(stage.errors[:family_explanation]).to include("can't be blank")
  end

  it "requires a positive whole position" do
    expect(build(:stage_template, position: 0)).not_to be_valid
    expect(build(:stage_template, position: 1.5)).not_to be_valid
  end

  it "allows an omitted expected duration" do
    expect(build(:stage_template, expected_minutes: nil)).to be_valid
  end

  it "rejects a non-positive expected duration" do
    expect(build(:stage_template, expected_minutes: 0)).not_to be_valid
  end

  it "rejects a duplicate position within the same template" do
    template = create(:procedure_template)
    existing = create(:stage_template, procedure_template: template)

    duplicate = build(:stage_template, procedure_template: template, position: existing.position)

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:position]).to include("has already been taken")
  end

  it "allows the same position on a different template" do
    first = create(:stage_template)

    expect(build(:stage_template, position: first.position)).to be_valid
  end

  it "requires the terminal flag to be a boolean" do
    expect(build(:stage_template, is_terminal: nil)).not_to be_valid
  end
end
