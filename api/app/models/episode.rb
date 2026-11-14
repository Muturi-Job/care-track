class Episode < ApplicationRecord
  # Unambiguous uppercase alphabet: no I, O, 0 or 1, so a code can be read
  # aloud or typed without confusion. 32^10 possibilities.
  TRACKING_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".chars.freeze
  TRACKING_CODE_LENGTH = 10
  TRACKING_CODE_FORMAT = /\A[#{TRACKING_CODE_ALPHABET.join}]{#{TRACKING_CODE_LENGTH}}\z/

  belongs_to :procedure_template
  has_many :stage_events, dependent: :destroy
  has_many :stage_templates, through: :procedure_template

  # "Active" is the staff list's definition: not yet discharged.
  scope :active, -> { where(discharged_at: nil) }
  scope :search, ->(query) do
    term = "%#{sanitize_sql_like(query.to_s.strip)}%"
    where("patient_alias ILIKE :term OR ward_or_bed ILIKE :term", term: term)
  end

  enum :status_flag, {
    normal: "normal",
    delayed: "delayed",
    call_care_team: "call_care_team"
  }, default: :normal, validate: true

  enum :delay_reason, {
    theatre_running_behind: "theatre_running_behind",
    awaiting_bed: "awaiting_bed",
    awaiting_team: "awaiting_team",
    other: "other"
  }, validate: { allow_nil: true }

  before_validation :assign_tracking_code, on: :create
  before_validation :assign_link_expiry, on: :create

  validates :patient_alias, presence: true
  validates :ward_or_bed, presence: true
  validates :tracking_code,
            presence: true,
            uniqueness: true,
            format: { with: TRACKING_CODE_FORMAT }
  validates :current_stage_position, numericality: { only_integer: true, greater_than: 0 }

  validate :delay_reason_only_when_delayed
  validate :current_stage_position_matches_template

  def self.generate_tracking_code
    Array.new(TRACKING_CODE_LENGTH) do
      TRACKING_CODE_ALPHABET[SecureRandom.random_number(TRACKING_CODE_ALPHABET.size)]
    end.join
  end

  # How long a family link stays valid, in days (env-configurable). Falls back
  # to seven days if the value is missing or not a positive number.
  def self.link_ttl
    days = ENV.fetch("EPISODE_LINK_TTL_DAYS", 7).to_i
    (days.positive? ? days : 7).days
  end

  def current_stage_template
    procedure_template.stage_at(current_stage_position)
  end

  # When the episode arrived in its current stage: the last position-changing
  # event, or creation time if it has never moved. Derived from history rather
  # than updated_at, which also moves on alias edits and flags.
  #
  # Cached for the life of this instance. Every position change goes through
  # StageTransitionService on a freshly locked row, so the episode a response
  # serialises always has a fresh cache.
  def stage_entered_at
    @stage_entered_at ||= stage_events
      .where(event_type: %w[advanced undone])
      .maximum(:occurred_at) || created_at
  end

  def minutes_in_current_stage(now: Time.current)
    [ (now - stage_entered_at).to_i / 60, 0 ].max
  end

  def minutes_overdue(now: Time.current)
    expected = current_stage_template&.expected_minutes
    return 0 if expected.nil?

    [ minutes_in_current_stage(now: now) - expected, 0 ].max
  end

  # 0 = needs attention (flagged), 1 = overdue, 2 = on track. The staff list
  # sorts on this so the episodes that need a person come first.
  def attention_rank(now: Time.current)
    return 0 unless normal?

    minutes_overdue(now: now).positive? ? 1 : 2
  end

  def expired?
    link_expires_at.present? && link_expires_at.past?
  end

  private

  def assign_tracking_code
    return if tracking_code.present?

    self.tracking_code = generate_unique_tracking_code
  end

  def generate_unique_tracking_code
    loop do
      candidate = self.class.generate_tracking_code
      return candidate unless self.class.exists?(tracking_code: candidate)
    end
  end

  def assign_link_expiry
    self.link_expires_at ||= self.class.link_ttl.from_now
  end

  def delay_reason_only_when_delayed
    return if delay_reason.blank? || delayed?

    errors.add(:delay_reason, "is only allowed when the episode is delayed")
  end

  def current_stage_position_matches_template
    return if procedure_template.nil? || current_stage_position.nil?

    positions = procedure_template.stage_templates.map(&:position)
    return if positions.include?(current_stage_position)

    errors.add(:current_stage_position, "must match a stage on the procedure template")
  end
end
