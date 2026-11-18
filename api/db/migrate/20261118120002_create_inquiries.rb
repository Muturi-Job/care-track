class CreateInquiries < ActiveRecord::Migration[8.0]
  # One logged inquiry: a phone call, a desk visit, a ward visit, or another
  # contact. Deliberately no notes, names, or phone numbers (CLAUDE.md rule 2).
  #
  # idempotency_key makes a double tap write one row, the same way advance does.
  def change
    create_table :inquiries, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.references :episode, type: :uuid, null: true, foreign_key: true
      t.string :channel, null: false
      t.datetime :logged_at, null: false, default: -> { "CURRENT_TIMESTAMP" }
      t.string :idempotency_key
    end

    add_index :inquiries, :logged_at
    add_index :inquiries, :idempotency_key, unique: true
  end
end
