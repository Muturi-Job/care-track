require "rails_helper"

RSpec.describe Episode, type: :model do
  describe "tracking codes (CLAUDE.md rule 3)" do
    it "generates a 10-character code from the unambiguous alphabet on create" do
      episode = create(:episode)

      expect(episode.tracking_code).to match(/\A[A-HJ-NP-Z2-9]{10}\z/)
    end

    it "is unique and random across many draws" do
      codes = Array.new(200) { described_class.generate_tracking_code }

      expect(codes.uniq.size).to eq(200)
      expect(codes).to all(match(/\A[A-HJ-NP-Z2-9]{10}\z/))
    end

    it "keeps an explicitly supplied code" do
      expect(create(:episode, tracking_code: "ABCDEFGHJK").tracking_code).to eq("ABCDEFGHJK")
    end

    it "retries when a generated code is already taken" do
      existing = create(:episode)
      allow(described_class).to receive(:generate_tracking_code)
        .and_return(existing.tracking_code, "ABCDEFGHJK")

      expect(create(:episode).tracking_code).to eq("ABCDEFGHJK")
    end

    it "rejects a code that does not match the alphabet" do
      expect(build(:episode, tracking_code: "abcdefghjk")).not_to be_valid
      expect(build(:episode, tracking_code: "ABCDEFGHII")).not_to be_valid
      expect(build(:episode, tracking_code: "SHORT")).not_to be_valid
    end

    it "rejects a duplicate code" do
      existing = create(:episode)

      expect(build(:episode, tracking_code: existing.tracking_code)).not_to be_valid
    end
  end

  describe "stage position" do
    it "must match a stage on the procedure template" do
      episode = build(:episode, current_stage_position: 99)

      expect(episode).not_to be_valid
      expect(episode.errors[:current_stage_position]).to include(
        "must match a stage on the procedure template"
      )
    end

    it "must be a positive whole number" do
      expect(build(:episode, current_stage_position: 0)).not_to be_valid
      expect(build(:episode, current_stage_position: 1.5)).not_to be_valid
    end

    it "exposes the current stage template" do
      expect(create(:episode).current_stage_template.label).to eq("Preparing")
    end
  end

  describe "status" do
    it "defaults to normal" do
      expect(create(:episode)).to be_normal
    end

    it "allows call_care_team without a delay reason" do
      expect(build(:episode, status_flag: "call_care_team")).to be_valid
    end

    it "allows a delay reason when delayed" do
      episode = build(:episode, status_flag: "delayed", delay_reason: "awaiting_bed")

      expect(episode).to be_valid
      expect(episode).to be_delayed
    end

    it "rejects a delay reason when the episode is not delayed" do
      episode = build(:episode, delay_reason: "awaiting_bed")

      expect(episode).not_to be_valid
      expect(episode.errors[:delay_reason]).to include(
        "is only allowed when the episode is delayed"
      )
    end

    it "rejects a delay reason outside the fixed list" do
      expect(build(:episode, status_flag: "delayed", delay_reason: "traffic")).not_to be_valid
    end

    it "rejects a status flag outside the fixed list" do
      expect(build(:episode, status_flag: "lost")).not_to be_valid
    end
  end

  describe "link expiry" do
    it "defaults to seven days from creation" do
      expect(create(:episode).link_expires_at).to be_within(1.minute).of(7.days.from_now)
    end

    it "is not expired while in the future" do
      expect(create(:episode)).not_to be_expired
    end

    it "is expired once the expiry time has passed" do
      expect(create(:episode, link_expires_at: 1.hour.ago)).to be_expired
    end
  end

  describe "minimum data (CLAUDE.md rule 2)" do
    it "stores only the agreed fields" do
      expect(described_class.column_names).to match_array(
        %w[
          id procedure_template_id patient_alias ward_or_bed tracking_code
          current_stage_position status_flag delay_reason discharged_at
          link_expires_at created_at updated_at
        ]
      )
    end

    it "requires an alias and a ward or bed" do
      expect(build(:episode, patient_alias: nil)).not_to be_valid
      expect(build(:episode, ward_or_bed: nil)).not_to be_valid
    end

    it "leaves discharge time empty until discharge" do
      expect(create(:episode).discharged_at).to be_nil
    end
  end
end
