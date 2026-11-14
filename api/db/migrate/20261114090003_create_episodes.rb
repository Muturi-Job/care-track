class CreateEpisodes < ActiveRecord::Migration[8.0]
  def change
    create_table :episodes, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.references :procedure_template, type: :uuid, null: false, foreign_key: true
      t.string :patient_alias, null: false
      t.string :ward_or_bed, null: false
      # The only thing that grants family access (CLAUDE.md rule 3).
      t.string :tracking_code, null: false
      t.integer :current_stage_position, null: false, default: 1
      t.string :status_flag, null: false, default: "normal"
      t.string :delay_reason
      t.datetime :discharged_at
      t.datetime :link_expires_at
      t.timestamps
    end

    add_index :episodes, :tracking_code, unique: true
    add_index :episodes, :status_flag
  end
end
