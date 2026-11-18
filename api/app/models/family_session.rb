# One family visitor session for an episode, counted without storing anything
# that could identify the person: no IP address, no user agent (CLAUDE.md
# rule 2). The family page records a session once per page load, never on the
# ten-second poll.
class FamilySession < ApplicationRecord
  MAX_SESSION_ID_LENGTH = 36

  belongs_to :episode

  before_validation :default_seen_times

  validates :session_id,
            presence: true,
            length: { maximum: MAX_SESSION_ID_LENGTH },
            uniqueness: { scope: :episode_id }
  validates :first_seen_at, presence: true
  validates :last_seen_at, presence: true

  # Creates the row on first sight and only moves last_seen_at afterwards.
  def self.record!(episode:, session_id:, now: Time.current)
    session = find_or_initialize_by(episode: episode, session_id: session_id)
    session.first_seen_at ||= now
    session.last_seen_at = now
    session.save!
    session
  rescue ActiveRecord::RecordNotUnique
    # Two tabs opened at once: the loser of the race touches the winner.
    find_by!(episode: episode, session_id: session_id).tap do |existing|
      existing.update!(last_seen_at: now)
    end
  end

  private

  def default_seen_times
    self.first_seen_at ||= Time.current
    self.last_seen_at ||= first_seen_at
  end
end
