require "rails_helper"

RSpec.describe FamilySession, type: :model do
  it "is valid as built by the factory" do
    expect(build(:family_session)).to be_valid
  end

  it "stores no IP address or user agent" do
    expect(described_class.column_names).not_to include("ip_address", "ip", "user_agent")
    expect(described_class.column_names).to match_array(
      %w[id episode_id session_id first_seen_at last_seen_at]
    )
  end

  it "requires a session id" do
    expect(build(:family_session, session_id: nil)).not_to be_valid
    expect(build(:family_session, session_id: "")).not_to be_valid
  end

  it "accepts a 36-character session id but not a longer one" do
    expect(build(:family_session, session_id: "a" * 36)).to be_valid
    expect(build(:family_session, session_id: "a" * 37)).not_to be_valid
  end

  it "is unique per episode and session id" do
    existing = create(:family_session)
    duplicate = build(
      :family_session,
      episode: existing.episode,
      session_id: existing.session_id
    )

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:session_id]).to include("has already been taken")
  end

  it "allows the same session id on a different episode" do
    existing = create(:family_session)

    expect(build(:family_session, session_id: existing.session_id)).to be_valid
  end

  describe ".record!" do
    it "creates a row on first sight and keeps first_seen_at" do
      episode = create(:episode)
      session_id = SecureRandom.uuid
      first_seen = Time.current.change(usec: 0)

      session = described_class.record!(episode: episode, session_id: session_id, now: first_seen)

      expect(session.first_seen_at).to be_within(0.001).of(first_seen)
      expect(session.last_seen_at).to be_within(0.001).of(first_seen)
    end

    it "touches last_seen_at without creating a second row" do
      episode = create(:episode)
      session_id = SecureRandom.uuid
      first_seen = 1.hour.ago.change(usec: 0)
      later = Time.current.change(usec: 0)

      original = described_class.record!(episode: episode, session_id: session_id, now: first_seen)
      touched = described_class.record!(episode: episode, session_id: session_id, now: later)

      expect(touched.id).to eq(original.id)
      expect(touched.first_seen_at).to be_within(0.001).of(first_seen)
      expect(touched.last_seen_at).to be_within(0.001).of(later)
      expect(described_class.where(episode: episode, session_id: session_id).count).to eq(1)
    end
  end
end
