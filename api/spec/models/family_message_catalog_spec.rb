require "rails_helper"

RSpec.describe FamilyMessageCatalog do
  describe "special statuses" do
    it "has approved wording for every family-visible status" do
      visible = Episode.status_flags.keys - [ "normal" ]

      expect(described_class::SPECIAL_STATUS_MESSAGES.keys).to match_array(visible)
    end

    it "falls back to the rule 4 copy for an unknown status" do
      expect(described_class.for_status("something_new")).to eq("Please call the care team.")
    end

    it "says nothing when there is no special status" do
      expect(described_class.for_status("normal")).to eq(described_class::FALLBACK)
    end
  end

  describe "blocked wording (CLAUDE.md rule 4)" do
    it "uses no blocked words in any approved copy" do
      expect(described_class.all_texts).to all(be_present)

      described_class.all_texts.each do |text|
        used = described_class.blocked_words_in(text)

        expect(used).to eq([]),
          "#{text.inspect} uses blocked words: #{used.join(', ')}"
      end
    end

    it "checks against a configurable blocked list" do
      allow(ENV).to receive(:fetch).and_call_original
      allow(ENV).to receive(:fetch).with("FAMILY_BLOCKED_WORDS", anything)
        .and_return("outcome, diagnosis")

      expect(described_class.blocked_words).to eq(%w[outcome diagnosis])
      expect(described_class.blocked_words_in("The outcome was good")).to eq(%w[outcome])
    end

    it "falls back to the default outcome-related list" do
      allow(ENV).to receive(:fetch).and_call_original
      allow(ENV).to receive(:fetch).with("FAMILY_BLOCKED_WORDS", anything).and_return("")

      expect(described_class.blocked_words).to include("outcome", "diagnosis", "prognosis")
    end

    it "matches whole words, so ordinary copy is not flagged" do
      expect(described_class.blocked_words_in("Please take care of yourself")).to eq([])
      expect(described_class.blocked_words_in("Our prognosis has changed")).to eq(%w[prognosis])
    end
  end
end
