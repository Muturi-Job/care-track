class CreateStageTemplates < ActiveRecord::Migration[8.0]
  def change
    create_table :stage_templates, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.references :procedure_template, type: :uuid, null: false, foreign_key: true, index: false
      t.integer :position, null: false
      t.string :label, null: false
      t.text :family_explanation, null: false
      t.integer :expected_minutes
      t.boolean :is_terminal, null: false, default: false
      t.timestamps
    end

    # One stage per position, and the lookup path for an ordered sequence.
    add_index :stage_templates, %i[procedure_template_id position], unique: true
  end
end
