class AddDemoDataAndAnalyticsIndexes < ActiveRecord::Migration[8.0]
  def change
    add_column :episodes, :demo_data, :boolean, null: false, default: false
    add_index :episodes, [ :created_at, :procedure_template_id ], name: "index_episodes_for_analytics"
    add_index :stage_events, [ :event_type, :occurred_at, :episode_id ],
      name: "index_stage_events_for_analytics"
    add_index :stage_events, [ :stage_template_id, :event_type, :occurred_at ],
      name: "index_stage_events_by_stage_for_analytics"
    add_index :stage_events, [ :episode_id, :event_type, :occurred_at ],
      name: "index_stage_events_by_episode_for_analytics"
    add_index :inquiries, [ :logged_at, :episode_id ], name: "index_inquiries_for_analytics"
    add_index :inquiries, [ :episode_id, :logged_at, :channel ],
      name: "index_inquiries_by_episode_for_analytics"
    add_index :feedback_responses, [ :tracking_code, :created_at ], name: "index_feedback_for_analytics"
    add_index :family_sessions, [ :episode_id, :first_seen_at ],
      name: "index_family_sessions_for_analytics"
  end
end
