class CreateProcedureTemplates < ActiveRecord::Migration[8.0]
  def change
    # UUID primary keys need a server-side default.
    enable_extension "pgcrypto" unless extension_enabled?("pgcrypto")

    create_table :procedure_templates, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.string :name, null: false
      t.boolean :active, null: false, default: true
      t.timestamps
    end

    add_index :procedure_templates, :name, unique: true
  end
end
