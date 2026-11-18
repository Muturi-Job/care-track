require "rails_helper"

RSpec.describe "Analytics endpoints", type: :request do
  PRIVACY_KEY = %r{
    \A(?:patient_alias|alias|ward_or_bed|bed|tracking[_-]?code|episode[_-]?id|
      ip(?:[_-]?address)?|user[_-]?agent)\z
  }ix

  let(:template) { create(:procedure_template) }
  let(:started_at) { Time.zone.parse("2026-10-01 09:00:00") }

  before do
    Api::V1::Analytics::ReportsController::ANALYTICS_CACHE.clear
    MetricSetting.find_or_create_by!(key: "minimum_sample_size").update!(value: "2")
    MetricSetting.find_or_create_by!(key: "grace_minutes").update!(value: "5")
  end

  def timed_episode(first_stage_minutes:, second_stage_minutes:, index:, delayed: false)
    episode = create(
      :episode,
      procedure_template: template,
      current_stage_position: 3,
      discharged_at: started_at + first_stage_minutes + second_stage_minutes + 1.minute,
      created_at: started_at + index.hours
    )
    second_stage = template.stage_templates.find_by!(position: 2)
    terminal_stage = template.stage_templates.find_by!(position: 3)
    StageEvent.create!(
      episode: episode,
      stage_template: second_stage,
      event_type: "advanced",
      occurred_at: episode.created_at + first_stage_minutes
    )
    StageEvent.create!(
      episode: episode,
      stage_template: terminal_stage,
      event_type: "advanced",
      occurred_at: episode.created_at + first_stage_minutes + second_stage_minutes
    )
    if delayed
      episode.update!(status_flag: "delayed", delay_reason: "awaiting_bed")
      StageEvent.create!(
        episode: episode,
        stage_template: second_stage,
        event_type: "flagged",
        status_flag: "delayed",
        delay_reason: "awaiting_bed",
        occurred_at: episode.created_at + first_stage_minutes
      )
    end
    episode
  end

  def request_params
    { from: "2026-10-01", to: "2026-10-01" }
  end

  def measured_episode(index:, stage_minutes:, delayed: false)
    episode = create(
      :episode,
      procedure_template: template,
      current_stage_position: 3,
      discharged_at: started_at + index.hours + stage_minutes.sum.minutes,
      created_at: started_at + index.hours
    )
    stages = template.stage_templates.order(:position).to_a
    elapsed = 0
    stage_minutes.each_with_index do |minutes, stage_index|
      elapsed += minutes
      StageEvent.create!(
        episode: episode,
        stage_template: stages.fetch(stage_index + 1),
        event_type: "advanced",
        occurred_at: episode.created_at + elapsed.minutes
      )
    end
    if delayed
      episode.update!(status_flag: "delayed", delay_reason: "awaiting_bed")
      StageEvent.create!(
        episode: episode,
        stage_template: stages.fetch(1),
        event_type: "flagged",
        status_flag: "delayed",
        delay_reason: "awaiting_bed",
        occurred_at: episode.created_at + stage_minutes.first.minutes
      )
    end
    episode
  end

  def privacy_violations(value)
    case value
    when Hash
      value.flat_map do |key, child|
        (key.to_s.match?(PRIVACY_KEY) ? [ key ] : []) + privacy_violations(child)
      end
    when Array
      value.flat_map { |child| privacy_violations(child) }
    else
      []
    end
  end

  def expect_no_private_data(payload, private_values: [])
    expect(privacy_violations(payload)).to be_empty
    serialized = payload.is_a?(String) ? payload : JSON.generate(payload)
    private_values.compact.each do |value|
      expect(serialized).not_to include(value.to_s)
    end
  end

  it "returns exact stage percentiles, minutes lost, and short-duration exclusions" do
    [ 10, 20, 30, 40 ].each_with_index do |minutes, index|
      timed_episode(first_stage_minutes: minutes.minutes, second_stage_minutes: (20 + index * 10).minutes, index: index)
    end
    timed_episode(first_stage_minutes: 30.seconds, second_stage_minutes: 60.minutes, index: 4)

    get "/api/v1/analytics/bottlenecks", params: request_params

    expect(response).to have_http_status(:ok)
    admitted = response.parsed_body.fetch("stages").find { |stage| stage["stage"] == "Admitted" }
    expect(admitted).to include(
      "sample_size" => 4,
      "median_minutes" => 25.0,
      "p90_minutes" => 37.0,
      "expected_minutes" => 20,
      "minutes_lost" => 30.0,
      "share_over_expected" => 50.0,
      "excluded_short_count" => 1
    )

    get "/api/v1/analytics/data_quality", params: request_params
    expect(response.parsed_body).to include("excluded_short_stage_count" => 1)
  end

  it "suppresses stage groups that do not meet the configured sample size" do
    MetricSetting.find_or_create_by!(key: "minimum_sample_size").update!(value: "5")
    [ 10, 20, 30, 40 ].each_with_index do |minutes, index|
      timed_episode(first_stage_minutes: minutes.minutes, second_stage_minutes: 20.minutes, index: index)
    end

    get "/api/v1/analytics/bottlenecks", params: request_params

    admitted = response.parsed_body.fetch("stages").find { |stage| stage["stage"] == "Admitted" }
    expect(admitted).to include("insufficient_data" => true)
    expect(admitted).not_to have_key("median_minutes")
  end

  it "does not count an advance that was undone as a stage entry" do
    MetricSetting.find_or_create_by!(key: "minimum_sample_size").update!(value: "1")
    episode = create(:episode, procedure_template: template, current_stage_position: 3, created_at: started_at)
    second_stage = template.stage_templates.find_by!(position: 2)
    terminal_stage = template.stage_templates.find_by!(position: 3)
    StageEvent.create!(episode: episode, stage_template: second_stage, event_type: "advanced",
      occurred_at: started_at + 30.minutes)
    StageEvent.create!(episode: episode, stage_template: template.stage_templates.find_by!(position: 1),
      event_type: "undone", occurred_at: started_at + 31.minutes)
    StageEvent.create!(episode: episode, stage_template: second_stage, event_type: "advanced",
      occurred_at: started_at + 60.minutes)
    StageEvent.create!(episode: episode, stage_template: terminal_stage, event_type: "advanced",
      occurred_at: started_at + 90.minutes)

    get "/api/v1/analytics/bottlenecks", params: request_params

    admitted = response.parsed_body.fetch("stages").find { |stage| stage["stage"] == "Admitted" }
    expect(admitted).to include("sample_size" => 1, "median_minutes" => 60.0)
  end

  it "calculates flagged delay minutes without returning identifying fields" do
    MetricSetting.find_or_create_by!(key: "minimum_sample_size").update!(value: "1")
    timed_episode(first_stage_minutes: 30.minutes, second_stage_minutes: 25.minutes, index: 0, delayed: true)

    get "/api/v1/analytics/delays", params: request_params

    expect(response.parsed_body).to include(
      "delay_count" => 1,
      "total_delay_minutes" => 15.0,
      "average_delay_minutes" => 15.0
    )
    expect(JSON.generate(response.parsed_body)).not_to match(/patient_alias|ward_or_bed|tracking_code|episode_id/)
  end

  it "never puts identifying episode fields in any analytics response" do
    2.times do |index|
      timed_episode(first_stage_minutes: 30.minutes, second_stage_minutes: 25.minutes, index: index)
    end

    %w[overview bottlenecks delays inquiries data_quality].each do |report|
      get "/api/v1/analytics/#{report}", params: request_params
      expect(response).to have_http_status(:ok)
      expect(JSON.generate(response.parsed_body)).not_to match(/patient_alias|ward_or_bed|tracking_code|episode_id/)
    end
  end

  it "matches hand-calculated overview KPIs, every stage statistic, delay minutes, and saved time" do
    template.stage_templates.find_by!(position: 3).update!(expected_minutes: nil)
    MetricSetting.find_or_create_by!(key: "minimum_sample_size").update!(value: "1")
    MetricSetting.find_or_create_by!(key: "grace_minutes").update!(value: "5")
    MetricSetting.find_or_create_by!(key: "minutes_per_inquiry").update!(value: "4")
    MetricSetting.find_or_create_by!(key: "baseline_inquiries_per_episode").update!(value: "3.0")
    first = measured_episode(index: 0, stage_minutes: [ 10, 30 ], delayed: true)
    second = measured_episode(index: 1, stage_minutes: [ 30, 50 ])
    StageEvent.create!(
      episode: second,
      stage_template: template.stage_templates.find_by!(position: 2),
      event_type: "flagged",
      status_flag: "call_care_team",
      occurred_at: second.created_at + 31.minutes
    )
    2.times do |index|
      create(:inquiry, episode: first, channel: index.zero? ? "phone" : "desk",
        logged_at: first.created_at + (index + 1).minutes)
    end
    create(:inquiry, episode: second, channel: "ward", logged_at: second.created_at + 1.minute)
    2.times do |index|
      create(:family_session, episode: first, session_id: "family-first-#{index}",
        first_seen_at: first.created_at + (index + 5).minutes)
    end
    create(:family_session, episode: second, session_id: "family-second",
      first_seen_at: second.created_at + 5.minutes)
    FeedbackResponse.create!(tracking_code: first.tracking_code, answer: "yes",
      created_at: first.created_at + 1.minute)
    FeedbackResponse.create!(tracking_code: second.tracking_code, answer: "no",
      created_at: second.created_at + 1.minute)

    get "/api/v1/analytics/overview", params: request_params

    expect(response.parsed_body).to include(
      "episodes_count" => 2,
      "completed_count" => 2,
      "average_total_minutes" => 60.0,
      "expected_total_minutes" => 40.0,
      "on_time_rate" => 50.0,
      "delay_rate" => 50.0,
      "call_care_team_count" => 1,
      "inquiries_total" => 3,
      "inquiries_per_episode" => 1.5,
      "baseline_inquiries_per_episode" => 3.0,
      "inquiries_per_episode_difference" => -1.5,
      "family_checks_per_episode" => 1.5,
      "informed_rate" => { "yes" => 1, "somewhat" => 0, "no" => 1, "rate" => 50.0 },
      "estimated_staff_minutes_saved" => {
        "minutes" => 12,
        "hours" => 0.2,
        "inputs" => {
          "inquiries" => 3,
          "minutes_per_inquiry" => 4,
          "assumption" => "Estimated minutes saved = inquiries × minutes per inquiry"
        }
      }
    )

    get "/api/v1/analytics/bottlenecks", params: request_params
    stages = response.parsed_body.fetch("stages")
    expect(stages.find { |stage| stage["stage"] == "Admitted" }).to include(
      "sample_size" => 2,
      "median_minutes" => 20.0,
      "p90_minutes" => 28.0,
      "expected_minutes" => 20,
      "minutes_lost" => 10.0,
      "share_over_expected" => 50.0
    )
    expect(stages.find { |stage| stage["stage"] == "Preparing" }).to include(
      "sample_size" => 2,
      "median_minutes" => 40.0,
      "p90_minutes" => 48.0,
      "expected_minutes" => 20,
      "minutes_lost" => 40.0,
      "share_over_expected" => 100.0
    )
    expect(stages.find { |stage| stage["stage"] == "Discharged" })
      .to include("insufficient_data" => true)

    get "/api/v1/analytics/delays", params: request_params
    expect(response.parsed_body).to include(
      "delay_count" => 1,
      "total_delay_minutes" => 10.0,
      "average_delay_minutes" => 10.0
    )
  end

  it "handles an empty database without raising for any report" do
    %w[overview bottlenecks delays inquiries data_quality].each do |report|
      get "/api/v1/analytics/#{report}", params: request_params
      expect(response).to have_http_status(:ok)
    end
    expect(response.parsed_body).to include(
      "episodes_count" => 0,
      "complete_stage_history_count" => 0,
      "episodes_without_stage_events" => 0
    )
  end

  it "suppresses a single in-progress episode and reports its missing history" do
    MetricSetting.find_or_create_by!(key: "minimum_sample_size").update!(value: "2")
    episode = create(:episode, procedure_template: template, current_stage_position: 1, created_at: started_at)

    get "/api/v1/analytics/overview", params: request_params
    expect(response.parsed_body).to include(
      "episodes_count" => 1,
      "average_total_minutes" => { "insufficient_data" => true }
    )

    get "/api/v1/analytics/data_quality", params: request_params
    expect(response.parsed_body).to include(
      "episodes_without_stage_events" => 1,
      "complete_stage_history_count" => 0
    )
    expect(Episode.exists?(episode.id)).to be(true)
  end

  it "excludes an unfinished current stage from duration statistics" do
    MetricSetting.find_or_create_by!(key: "minimum_sample_size").update!(value: "1")
    episode = create(:episode, procedure_template: template, current_stage_position: 2, created_at: started_at)
    StageEvent.create!(
      episode: episode,
      stage_template: template.stage_templates.find_by!(position: 2),
      event_type: "advanced",
      occurred_at: started_at + 30.minutes
    )

    get "/api/v1/analytics/bottlenecks", params: request_params
    stages = response.parsed_body.fetch("stages")
    expect(stages.find { |stage| stage["stage"] == "Admitted" }).to include("median_minutes" => 30.0)
    expect(stages.find { |stage| stage["stage"] == "Preparing" }).to include("insufficient_data" => true)
  end

  it "keeps identifying keys and values out of all JSON reports and CSV exports" do
    first = timed_episode(first_stage_minutes: 30.minutes, second_stage_minutes: 25.minutes, index: 0)
    second = timed_episode(first_stage_minutes: 35.minutes, second_stage_minutes: 30.minutes, index: 1)
    private_values = [ first.patient_alias, first.ward_or_bed, first.tracking_code, first.id,
      second.patient_alias, second.ward_or_bed, second.tracking_code, second.id,
      "203.0.113.42", "analytics-private-user-agent" ]
    headers = { "REMOTE_ADDR" => "203.0.113.42", "HTTP_USER_AGENT" => "analytics-private-user-agent" }

    %w[overview bottlenecks delays inquiries data_quality].each do |report|
      get "/api/v1/analytics/#{report}", params: request_params, headers: headers
      expect(response).to have_http_status(:ok)
      expect_no_private_data(response.parsed_body, private_values: private_values)

      get "/api/v1/analytics/export.csv", params: request_params.merge(report: report), headers: headers
      expect(response).to have_http_status(:ok)
      expect_no_private_data(CSV.parse(response.body, headers: true).map(&:to_h), private_values: private_values)
    end
  end
end
