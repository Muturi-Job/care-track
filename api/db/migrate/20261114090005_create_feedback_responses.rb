class CreateFeedbackResponses < ActiveRecord::Migration[8.0]
  # One answer to the family page's single question (CLAUDE.md rule 2): the
  # answer, the tracking code it came from, and when it arrived. No episode
  # reference and no patient data.
  def change
    create_table :feedback_responses, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.string :tracking_code, null: false
      t.string :answer, null: false
      t.datetime :created_at, null: false, default: -> { "CURRENT_TIMESTAMP" }
    end

    add_index :feedback_responses, :tracking_code
  end
end
