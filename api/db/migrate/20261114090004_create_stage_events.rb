class CreateStageEvents < ActiveRecord::Migration[8.0]
  def change
    create_table :stage_events, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.references :episode, type: :uuid, null: false, foreign_key: true, index: false
      t.references :stage_template, type: :uuid, null: false, foreign_key: true
      t.string :event_type, null: false
      t.datetime :occurred_at, null: false, default: -> { "CURRENT_TIMESTAMP" }
      # Optional: lets a retried tap be written once. NULLs are distinct in
      # PostgreSQL, so events without a key are unaffected.
      t.string :idempotency_key
      t.timestamps
    end

    add_index :stage_events, %i[episode_id occurred_at]
    add_index :stage_events, :idempotency_key, unique: true
  end
end
