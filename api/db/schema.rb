# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_11_14_090005) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pgcrypto"

  create_table "episodes", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "procedure_template_id", null: false
    t.string "patient_alias", null: false
    t.string "ward_or_bed", null: false
    t.string "tracking_code", null: false
    t.integer "current_stage_position", default: 1, null: false
    t.string "status_flag", default: "normal", null: false
    t.string "delay_reason"
    t.datetime "discharged_at"
    t.datetime "link_expires_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["procedure_template_id"], name: "index_episodes_on_procedure_template_id"
    t.index ["status_flag"], name: "index_episodes_on_status_flag"
    t.index ["tracking_code"], name: "index_episodes_on_tracking_code", unique: true
  end

  create_table "feedback_responses", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "tracking_code", null: false
    t.string "answer", null: false
    t.datetime "created_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.index ["tracking_code"], name: "index_feedback_responses_on_tracking_code"
  end

  create_table "procedure_templates", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name", null: false
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_procedure_templates_on_name", unique: true
  end

  create_table "stage_events", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "episode_id", null: false
    t.uuid "stage_template_id", null: false
    t.string "event_type", null: false
    t.datetime "occurred_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.string "idempotency_key"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["episode_id", "occurred_at"], name: "index_stage_events_on_episode_id_and_occurred_at"
    t.index ["idempotency_key"], name: "index_stage_events_on_idempotency_key", unique: true
    t.index ["stage_template_id"], name: "index_stage_events_on_stage_template_id"
  end

  create_table "stage_templates", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "procedure_template_id", null: false
    t.integer "position", null: false
    t.string "label", null: false
    t.text "family_explanation", null: false
    t.integer "expected_minutes"
    t.boolean "is_terminal", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["procedure_template_id", "position"], name: "index_stage_templates_on_procedure_template_id_and_position", unique: true
  end

  add_foreign_key "episodes", "procedure_templates"
  add_foreign_key "stage_events", "episodes"
  add_foreign_key "stage_events", "stage_templates"
  add_foreign_key "stage_templates", "procedure_templates"
end
