require "rails_helper"

RSpec.describe StageEvent, type: :model do
  it "is valid as built by the factory" do
    expect(build(:stage_event)).to be_valid
  end

  it "defaults the occurrence time" do
    event = build(:stage_event, occurred_at: nil)

    expect(event).to be_valid
    expect(event.occurred_at).to be_present
  end

  it "accepts each of the four event types" do
    %w[advanced undone flagged flag_cleared].each do |event_type|
      expect(build(:stage_event, event_type: event_type)).to be_valid
    end
  end

  it "rejects an event type outside the fixed list" do
    expect(build(:stage_event, event_type: "skipped")).not_to be_valid
  end

  it "rejects a stage from another procedure template" do
    other_stage = create(:stage_template)

    event = build(:stage_event, stage_template: other_stage)

    expect(event).not_to be_valid
    expect(event.errors[:stage_template]).to include(
      "must belong to the episode's procedure template"
    )
  end

  it "uses the current stage by default" do
    event = create(:stage_event)

    expect(event.stage_template.position).to eq(event.episode.current_stage_position)
  end

  describe "idempotency key" do
    it "rejects a duplicate key" do
      first = create(:stage_event, idempotency_key: "tap-1")
      second = build(:stage_event, episode: first.episode, idempotency_key: "tap-1")

      expect(second).not_to be_valid
      expect(second.errors[:idempotency_key]).to include("has already been taken")
    end

    it "allows many events without a key" do
      episode = create(:episode)

      expect(build(:stage_event, episode: episode, idempotency_key: nil)).to be_valid
      expect(build(:stage_event, episode: episode, idempotency_key: nil)).to be_valid
    end
  end
end
