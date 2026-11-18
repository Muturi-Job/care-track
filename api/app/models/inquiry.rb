# One logged inquiry — a phone call, a desk visit, a ward visit, or another
# contact. Deliberately stores no notes, names, or phone numbers (CLAUDE.md
# rule 2). The episode reference is optional so an inquiry can still be counted
# if it is logged before it is matched to an episode.
class Inquiry < ApplicationRecord
  CHANNELS = %w[phone desk ward other].freeze
  UNDO_WINDOW = 2.minutes

  belongs_to :episode, optional: true

  enum :channel, {
    phone: "phone",
    desk: "desk",
    ward: "ward",
    other: "other"
  }, validate: true

  before_validation :default_logged_at

  validates :logged_at, presence: true
  validates :idempotency_key,
            uniqueness: true,
            allow_nil: true,
            length: { maximum: 100 }

  scope :logged_since, ->(time) { where(logged_at: time..) }

  # Undo is a short correction window for a mis-tap, not a general edit.
  def undoable?(now: Time.current)
    logged_at.present? && logged_at >= now - UNDO_WINDOW
  end

  private

  def default_logged_at
    self.logged_at ||= Time.current
  end
end
