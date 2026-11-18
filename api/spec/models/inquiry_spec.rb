require "rails_helper"

RSpec.describe Inquiry, type: :model do
  it "is valid as built by the factory" do
    expect(build(:inquiry)).to be_valid
  end

  it "accepts each of the four channels" do
    %w[phone desk ward other].each do |channel|
      expect(build(:inquiry, channel: channel)).to be_valid
    end
  end

  it "rejects a channel outside the fixed list" do
    inquiry = build(:inquiry, channel: "email")

    expect(inquiry).not_to be_valid
    expect(inquiry.errors[:channel]).to be_present
  end

  it "defaults logged_at" do
    inquiry = build(:inquiry, logged_at: nil)

    expect(inquiry).to be_valid
    expect(inquiry.logged_at).to be_present
  end

  it "allows an inquiry without an episode" do
    expect(build(:inquiry, episode: nil)).to be_valid
  end

  it "stores no personal data columns" do
    expect(described_class.column_names).to match_array(
      %w[id episode_id channel logged_at idempotency_key]
    )
  end

  describe "#undoable?" do
    it "is true inside the two-minute window" do
      inquiry = build(:inquiry, logged_at: 119.seconds.ago)

      expect(inquiry.undoable?).to be(true)
    end

    it "is false once two minutes have passed" do
      inquiry = build(:inquiry, logged_at: 3.minutes.ago)

      expect(inquiry.undoable?).to be(false)
    end
  end

  describe "idempotency key" do
    it "rejects a duplicate key" do
      create(:inquiry, idempotency_key: "tap-1")

      duplicate = build(:inquiry, idempotency_key: "tap-1")

      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:idempotency_key]).to include("has already been taken")
    end

    it "allows many inquiries without a key" do
      episode = create(:episode)

      expect(build(:inquiry, episode: episode, idempotency_key: nil)).to be_valid
      expect(build(:inquiry, episode: episode, idempotency_key: nil)).to be_valid
    end

    it "rejects a key longer than 100 characters" do
      expect(build(:inquiry, idempotency_key: "k" * 101)).not_to be_valid
    end
  end
end
