namespace :demo do
  desc "Replace analytics demo data with 60 days of synthetic history"
  task analytics: :environment do
    DemoAnalytics.clear!
    DemoAnalytics.create!
    puts "Synthetic demo data only: created 400 clearly labelled demo episodes across 60 days."
  end

  namespace :analytics do
    desc "Remove analytics demo records only"
    task clear: :environment do
      DemoAnalytics.clear!
      puts "Synthetic demo data only: removed demo episodes and their dependent analytics records."
    end
  end
end

class DemoAnalytics
  TEMPLATE_NAMES = [ "Day Surgery", "Orthopaedic Surgery" ].freeze
  REASON_WEIGHTS = [
    [ "theatre_running_behind", 45 ],
    [ "awaiting_bed", 25 ],
    [ "awaiting_team", 20 ],
    [ "other", 10 ]
  ].freeze
  CHANNELS = %w[phone desk ward other].freeze
  EXPECTED_MINUTES = [ 15, 45, 15, 90, 30, 60, 45, 60 ].freeze
  SESSION_ID = "demo-analytics"

  def self.create!
    random = Random.new(41)
    templates = ProcedureTemplate.where(name: TEMPLATE_NAMES).index_by(&:name)
    raise "Run db:seed before demo:analytics" unless templates.size == TEMPLATE_NAMES.size

    now = Time.current
    available_days = (0..59).map { |offset| now.to_date - offset.days }
      .reject { |day| day.saturday? || day.sunday? }
    400.times do |index|
      day = available_days.fetch(random.rand(available_days.size))
      start_position = random.rand(0..4)
      recovery_at = day.in_time_zone.change(hour: 14, min: 15 + start_position * 10)
      durations = stage_durations(random, day)
      created_at = recovery_at - durations.first(5).sum.minutes
      template = templates.values[index % templates.size]
      episode = Episode.create!(
        procedure_template: template,
        patient_alias: format("Demo %03d", index + 1),
        ward_or_bed: "Demo",
        current_stage_position: 9,
        discharged_at: created_at + durations.sum.minutes,
        link_expires_at: created_at + durations.sum.minutes + Episode.link_ttl,
        demo_data: true,
        created_at: created_at,
        updated_at: created_at + durations.sum.minutes
      )

      create_stage_history(episode, created_at, durations)
      create_flags(episode, created_at, durations, random)
      create_inquiries(episode, created_at, random, now)
      create_sessions(episode, created_at, random)
      create_feedback(episode, created_at, random)
    end

    MetricSetting.find_or_initialize_by(key: "baseline_inquiries_per_episode")
      .update!(value: "3.0")
  end

  def self.clear!
    Episode.demo_data.find_each do |episode|
      FeedbackResponse.where(tracking_code: episode.tracking_code).delete_all
      episode.destroy!
    end
  end

  def self.stage_durations(random, day)
    EXPECTED_MINUTES.each_with_index.map do |expected, index|
      variation = random.rand(-expected * 0.15..expected * 0.2).round
      duration = [ expected + variation, 3 ].max
      duration += 32 if index == 2 && day.monday?
      duration += random.rand(25..55) if index == 5 && day.on_weekday?
      duration
    end
  end

  def self.create_stage_history(episode, started_at, durations)
    stages = episode.procedure_template.stage_templates.order(:position).to_a
    time = started_at
    stages.first(8).each_with_index do |stage, index|
      time += durations[index].minutes
      StageEvent.create!(
        episode: episode,
        stage_template: stages[index + 1],
        event_type: "advanced",
        occurred_at: time
      )
    end
  end

  def self.create_flags(episode, started_at, durations, random)
    stage = episode.procedure_template.stage_templates.find_by!(position: 6)
    flagged_at = started_at + durations.first(5).sum.minutes + 20.minutes
    if random.rand < 0.18
      reason = weighted_reason(random)
      episode.update!(status_flag: "delayed", delay_reason: reason)
      StageEvent.create!(
        episode: episode, stage_template: stage, event_type: "flagged",
        status_flag: "delayed", delay_reason: reason, occurred_at: flagged_at
      )
    end
    return unless random.rand < 0.025

    StageEvent.create!(
      episode: episode, stage_template: stage, event_type: "flagged",
      status_flag: "call_care_team", occurred_at: flagged_at + 10.minutes
    )
  end

  def self.create_inquiries(episode, started_at, random, now)
    older_period = started_at < now - 39.days
    count = older_period ? 3 : (random.rand < 0.6 ? 1 : 2)
    count.times do |index|
      Inquiry.create!(
        episode: episode,
        channel: CHANNELS.fetch(random.rand(CHANNELS.size)),
        logged_at: started_at + random.rand(20..280).minutes + index.minutes
      )
    end
  end

  def self.create_sessions(episode, started_at, random)
    random.rand(2..6).times do |index|
      FamilySession.create!(
        episode: episode,
        session_id: "#{SESSION_ID}-#{episode.patient_alias.delete(" ")}-#{index}",
        first_seen_at: started_at + random.rand(60..210).minutes,
        last_seen_at: started_at + random.rand(220..400).minutes
      )
    end
  end

  def self.create_feedback(episode, started_at, random)
    bucket = random.rand(100)
    answer = bucket < 70 ? "yes" : bucket < 90 ? "somewhat" : "no"
    FeedbackResponse.create!(
      tracking_code: episode.tracking_code,
      answer: answer,
      created_at: started_at + 10.hours
    )
  end

  def self.weighted_reason(random)
    selected = random.rand(100)
    total = 0
    REASON_WEIGHTS.find do |reason, weight|
      total += weight
      selected < total
    end.first
  end
end
