class AddAnalyticsFieldsToStageEvents < ActiveRecord::Migration[8.0]
  # The flag state an event was recorded under. Snapshots like this let the
  # analysis see why time was lost even after the episode's flag is cleared.
  def up
    add_column :stage_events, :status_flag, :string
    add_column :stage_events, :delay_reason, :string
    add_column :stage_events, :recorded_by_device, :string, limit: 50

    # Backfill what can still be known: when the episode is flagged right now,
    # its flag is the best available record of an old flagged event. Cleared
    # flags cannot be reconstructed from the episode row.
    execute <<~SQL
      UPDATE stage_events
      SET status_flag = episodes.status_flag,
          delay_reason = episodes.delay_reason
      FROM episodes
      WHERE stage_events.episode_id = episodes.id
        AND stage_events.event_type = 'flagged'
        AND episodes.status_flag IN ('delayed', 'call_care_team')
    SQL
  end

  def down
    remove_column :stage_events, :recorded_by_device
    remove_column :stage_events, :delay_reason
    remove_column :stage_events, :status_flag
  end
end
