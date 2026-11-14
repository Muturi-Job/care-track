#!/usr/bin/env ruby
# Export only event timing/stage references and family feedback needed for
# prototype analysis. Run through Rails so it uses the configured DB.

require "csv"
require "fileutils"

output_dir = ARGV.fetch(0, File.expand_path("exports", __dir__))
FileUtils.mkdir_p(output_dir)

Rails.application.eager_load!

stage_events_path = File.join(output_dir, "stage_events.csv")
CSV.open(stage_events_path, "wb", write_headers: true,
                              headers: %w[tracking_code episode_id stage_template_id event_type occurred_at]) do |csv|
  StageEvent.includes(:episode).order(:occurred_at, :id).each do |event|
    csv << [
      event.episode.tracking_code,
      event.episode_id,
      event.stage_template_id,
      event.event_type,
      event.occurred_at&.utc&.iso8601
    ]
  end
end

feedback_path = File.join(output_dir, "feedback_responses.csv")
CSV.open(feedback_path, "wb", write_headers: true,
                          headers: %w[tracking_code answer created_at]) do |csv|
  FeedbackResponse.order(:created_at, :id).find_each do |response|
    csv << [ response.tracking_code, response.answer, response.created_at&.utc&.iso8601 ]
  end
end

puts "Exported stage events to #{stage_events_path}"
puts "Exported family feedback to #{feedback_path}"
