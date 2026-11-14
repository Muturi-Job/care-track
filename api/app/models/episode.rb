class Episode < ApplicationRecord
  # Unambiguous uppercase alphabet: no I, O, 0 or 1, so a code can be read
  # aloud or typed without confusion. 32^10 possibilities.
  TRACKING_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".chars.freeze
  TRACKING_CODE_LENGTH = 10
  TRACKING_CODE_FORMAT = /\A[#{TRACKING_CODE_ALPHABET.join}]{#{TRACKING_CODE_LENGTH}}\z/

  LINK_TTL = 7.days

  belongs_to :procedure_template
  has_many :stage_events, dependent: :destroy
  has_many :stage_templates, through: :procedure_template

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

  def current_stage_template
    procedure_template.stage_at(current_stage_position)
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
    self.link_expires_at ||= LINK_TTL.from_now
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
