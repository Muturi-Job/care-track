# One answer to "Did this page help you feel informed?".
#
# Deliberately stores nothing that could identify a person (CLAUDE.md rule 2):
# the answer, the tracking code it came from, and when it arrived.
class FeedbackResponse < ApplicationRecord
  ANSWERS = %w[yes somewhat no].freeze

  validates :tracking_code, presence: true
  validates :answer, inclusion: { in: ANSWERS }
end
