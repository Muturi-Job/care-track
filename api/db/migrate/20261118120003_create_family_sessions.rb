class CreateFamilySessions < ActiveRecord::Migration[8.0]
  # One row per browser session per episode, used only to count distinct
  # family visitors. No IP address and no user agent: those would be personal
  # data (CLAUDE.md rule 2).
  def change
    create_table :family_sessions, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.references :episode, type: :uuid, null: false, foreign_key: true
      t.string :session_id, limit: 36, null: false
      t.datetime :first_seen_at, null: false, default: -> { "CURRENT_TIMESTAMP" }
      t.datetime :last_seen_at, null: false, default: -> { "CURRENT_TIMESTAMP" }
    end

    add_index :family_sessions, %i[episode_id session_id], unique: true
  end
end
