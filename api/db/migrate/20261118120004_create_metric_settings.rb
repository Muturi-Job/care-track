class CreateMetricSettings < ActiveRecord::Migration[8.0]
  DEFAULTS = {
    "grace_minutes" => "5",
    "minutes_per_inquiry" => "3",
    "baseline_inquiries_per_episode" => "",
    "minimum_sample_size" => "5"
  }.freeze

  def up
    create_table :metric_settings do |t|
      t.string :key, null: false
      t.string :value, null: false, default: ""
    end

    add_index :metric_settings, :key, unique: true

    # Seeded here as well as in db/seeds.rb so a migrated database always has
    # usable settings, even when seeds are not run.
    DEFAULTS.each do |key, value|
      execute <<~SQL
        INSERT INTO metric_settings (key, value)
        VALUES (#{connection.quote(key)}, #{connection.quote(value)})
        ON CONFLICT (key) DO NOTHING
      SQL
    end
  end

  def down
    drop_table :metric_settings
  end
end
