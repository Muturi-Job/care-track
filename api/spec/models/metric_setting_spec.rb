require "rails_helper"

RSpec.describe MetricSetting, type: :model do
  it "is valid as built by the factory" do
    expect(build(:metric_setting)).to be_valid
  end

  it "defines the four analytics settings with their defaults" do
    expect(described_class::DEFAULTS).to eq(
      "grace_minutes" => "5",
      "minutes_per_inquiry" => "3",
      "baseline_inquiries_per_episode" => "",
      "minimum_sample_size" => "5"
    )
  end

  it "rejects a key outside the fixed list" do
    expect(build(:metric_setting, key: "secret_metric")).not_to be_valid
  end

  it "requires a unique key" do
    create(:metric_setting, key: "grace_minutes")

    duplicate = build(:metric_setting, key: "grace_minutes", value: "9")

    expect(duplicate).not_to be_valid
  end

  describe "numeric ranges" do
    it "accepts the edges of each range" do
      expect(build(:metric_setting, key: "grace_minutes", value: "0")).to be_valid
      expect(build(:metric_setting, key: "grace_minutes", value: "240")).to be_valid
      expect(build(:metric_setting, key: "minutes_per_inquiry", value: "1")).to be_valid
      expect(build(:metric_setting, key: "minutes_per_inquiry", value: "120")).to be_valid
      expect(build(:metric_setting, key: "baseline_inquiries_per_episode", value: "0")).to be_valid
      expect(build(:metric_setting, key: "minimum_sample_size", value: "1")).to be_valid
      expect(build(:metric_setting, key: "minimum_sample_size", value: "10000")).to be_valid
    end

    it "rejects values outside the range" do
      expect(build(:metric_setting, key: "grace_minutes", value: "241")).not_to be_valid
      expect(build(:metric_setting, key: "minutes_per_inquiry", value: "0")).not_to be_valid
      expect(build(:metric_setting, key: "baseline_inquiries_per_episode", value: "-1")).not_to be_valid
      expect(build(:metric_setting, key: "minimum_sample_size", value: "0")).not_to be_valid
    end

    it "rejects non-numeric values" do
      expect(build(:metric_setting, key: "grace_minutes", value: "five")).not_to be_valid
      expect(build(:metric_setting, key: "grace_minutes", value: "5.5")).not_to be_valid
      expect(build(:metric_setting, key: "baseline_inquiries_per_episode", value: "many")).not_to be_valid
    end

    it "allows the baseline to be empty" do
      expect(build(:metric_setting, key: "baseline_inquiries_per_episode", value: "")).to be_valid
    end

    it "requires the other keys to have a value" do
      expect(build(:metric_setting, key: "grace_minutes", value: "")).not_to be_valid
    end
  end

  describe ".typed_settings" do
    it "returns defaults as numbers when nothing is stored" do
      described_class.delete_all

      expect(described_class.typed_settings).to eq(
        "grace_minutes" => 5,
        "minutes_per_inquiry" => 3,
        "baseline_inquiries_per_episode" => nil,
        "minimum_sample_size" => 5
      )
    end

    it "prefers stored values" do
      create(:metric_setting, key: "grace_minutes", value: "9")
      create(:metric_setting, key: "baseline_inquiries_per_episode", value: "1.5")

      expect(described_class.typed_settings).to include(
        "grace_minutes" => 9,
        "baseline_inquiries_per_episode" => 1.5
      )
    end
  end
end
