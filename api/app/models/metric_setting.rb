# A small key/value store for the numbers the analytics sheet uses. Values are
# strings in the database and validated against the range for their key, so a
# bad setting cannot quietly distort the metrics.
class MetricSetting < ApplicationRecord
  DEFINITIONS = {
    "grace_minutes" => { type: :integer, min: 0, max: 240 },
    "minutes_per_inquiry" => { type: :integer, min: 1, max: 120 },
    "baseline_inquiries_per_episode" => { type: :decimal, min: 0, max: 10_000, allow_blank: true },
    "minimum_sample_size" => { type: :integer, min: 1, max: 10_000 }
  }.freeze

  DEFAULTS = {
    "grace_minutes" => "5",
    "minutes_per_inquiry" => "3",
    "baseline_inquiries_per_episode" => "",
    "minimum_sample_size" => "5"
  }.freeze

  validates :key,
            presence: true,
            uniqueness: true,
            inclusion: { in: DEFINITIONS.keys }
  validates :value, presence: true, unless: -> { allow_blank_value? }

  validate :value_is_a_number_in_range

  class << self
    # Stored values override defaults; a key missing from the table still
    # reports its default, so the endpoint works before seeds have run.
    def current
      DEFAULTS.merge(pluck(:key, :value).to_h)
    end

    # Numbers for JSON clients; an empty baseline becomes nil.
    def typed_settings
      current.each_with_object({}) do |(key, value), result|
        definition = DEFINITIONS.fetch(key)
        result[key] =
          if value.blank?
            nil
          elsif definition[:type] == :integer
            value.to_i
          else
            value.to_f
          end
      end
    end
  end

  private

  def allow_blank_value?
    DEFINITIONS.dig(key, :allow_blank)
  end

  def value_is_a_number_in_range
    definition = DEFINITIONS[key]
    return if definition.nil?

    if value.blank?
      return
    end

    number = parse_number(definition[:type])
    return if number.nil?

    return if number.between?(definition[:min], definition[:max])

    errors.add(
      :value,
      "must be between #{definition[:min]} and #{definition[:max]}"
    )
  end

  def parse_number(type)
    pattern = type == :integer ? /\A\d+\z/ : /\A\d+(?:\.\d+)?\z/
    unless value.match?(pattern)
      errors.add(:value, type == :integer ? "must be a whole number" : "must be a number")
      return nil
    end

    BigDecimal(value)
  end
end
