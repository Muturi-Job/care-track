# The only generated family-facing wording the API is allowed to send.
#
# Family copy for a *stage* lives on the stage itself (CLAUDE.md: stages are
# data). Everything the code has to say on its own — special statuses, expired
# links, the end of the sequence — lives here, so it can be reviewed in one
# place and checked against the blocked-word list (rule 4).
class FamilyMessageCatalog
  # Rule 4: any state the page cannot explain shows this.
  FALLBACK = "Please call the care team."

  SPECIAL_STATUS_MESSAGES = {
    "delayed" => "The team is running a little behind schedule. We will keep updating this page.",
    "call_care_team" => "Please call the care team on the number below."
  }.freeze

  MESSAGES = {
    link_not_found: "We could not find this page. Please check the link, or call the care team.",
    link_expired: "This tracking link is no longer active. Please call the care team if you need an update.",
    final_stage: "This is the last step on this page. Please call the care team if you need an update."
  }.freeze

  # Outcome, diagnosis and prognosis language is never allowed on a family
  # page. FAMILY_BLOCKED_WORDS replaces this list if it is set.
  BLOCKED_WORDS = %w[
    diagnosis diagnoses prognosis prognoses outcome outcomes
    cancer tumour tumor benign malignant
    complication complications success successful failed failure
    died death recovered recovery cured cure result results
    positive negative
  ].freeze

  BLOCKED_WORDS_ENV = "FAMILY_BLOCKED_WORDS"

  class << self
    # The approved wording for a status flag. Unknown or future statuses get the
    # fallback rather than invented copy.
    def for_status(status_flag)
      SPECIAL_STATUS_MESSAGES.fetch(status_flag.to_s, FALLBACK)
    end

    def message(key)
      MESSAGES.fetch(key)
    end

    # Every string this catalog can send, for the blocked-word spec.
    def all_texts
      [ FALLBACK ] + SPECIAL_STATUS_MESSAGES.values + MESSAGES.values
    end

    def blocked_words
      configured = ENV.fetch(BLOCKED_WORDS_ENV, "")
                      .split(",")
                      .map { |word| word.strip.downcase }
                      .reject(&:empty?)

      configured.empty? ? BLOCKED_WORDS : configured
    end

    # Which blocked words a piece of copy uses, matched on whole words so
    # "cared" does not match "care".
    def blocked_words_in(text)
      blocked_words.select { |word| text.to_s.downcase.match?(/\b#{Regexp.escape(word)}\b/) }
    end
  end
end
