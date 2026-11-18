module Analytics
  class Report
    REPORTS = %w[overview bottlenecks delays inquiries data_quality].freeze

    attr_reader :from, :to, :procedure_template_id, :minimum_sample_size, :settings

    def initialize(params = {})
      @from = parse_date(params[:from]) || 29.days.ago.to_date
      @to = parse_date(params[:to]) || Time.zone.today
      raise ArgumentError, "from must be on or before to" if @from > @to

      @procedure_template_id = params[:procedure_template_id].presence&.to_s
      if procedure_template_id && !procedure_template_id.match?(/\A[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\z/i)
        raise ArgumentError, "procedure_template_id must be a UUID"
      end
      @settings = MetricSetting.typed_settings
      @minimum_sample_size = settings.fetch("minimum_sample_size")
    end

    def generate(report)
      raise ArgumentError, "unknown report" unless REPORTS.include?(report.to_s)

      send(report)
    end

    def export(report)
      result = generate(report)
      rows = flatten(result)
      CSV.generate do |csv|
        csv << %w[metric value]
        rows.each { |row| csv << row }
      end
    end

    private

    def parse_date(value)
      return if value.blank?

      date = value.to_s
      raise ArgumentError unless date.match?(/\A\d{4}-\d{2}-\d{2}\z/)

      Date.iso8601(date)
    rescue Date::Error
      raise ArgumentError, "from and to must be ISO dates"
    end

    def range_start
      from.beginning_of_day
    end

    def range_end
      (to + 1).beginning_of_day
    end

    def episode_filter
      clauses = [ "episodes.created_at >= :range_start", "episodes.created_at < :range_end" ]
      clauses << "episodes.procedure_template_id = :procedure_template_id" if procedure_template_id
      [ clauses.join(" AND "), query_binds ]
    end

    def query_binds
      binds = { range_start: range_start, range_end: range_end }
      binds[:procedure_template_id] = procedure_template_id if procedure_template_id
      binds
    end

    def episode_scope
      sql, binds = episode_filter
      Episode.where(sql, **binds)
    end

    def demo_records?
      episode_scope.where(demo_data: true).exists?
    end

    def duration_cte
      template_clause = procedure_template_id ? "AND e.procedure_template_id = :procedure_template_id" : ""
      <<~SQL
        WITH selected_episodes AS (
          SELECT e.id, e.procedure_template_id, e.created_at
          FROM episodes e
          WHERE e.created_at >= :range_start AND e.created_at < :range_end
            #{template_clause}
        ), position_events AS (
          SELECT se.id, se.episode_id, se.stage_template_id, se.event_type, se.occurred_at,
                 LEAD(se.event_type) OVER (
                   PARTITION BY se.episode_id
                   ORDER BY se.occurred_at, se.created_at, se.id
                 ) AS next_position_event_type
          FROM stage_events se
          INNER JOIN selected_episodes e ON e.id = se.episode_id
          WHERE se.event_type IN ('advanced', 'undone')
        ), entries AS (
          SELECT e.id AS episode_id, e.procedure_template_id,
                 st.id AS stage_template_id, st.position, st.label,
                 st.expected_minutes, e.created_at AS entered_at
          FROM selected_episodes e
          JOIN stage_templates st ON st.procedure_template_id = e.procedure_template_id
            AND st.position = 1
          UNION ALL
          SELECT e.id, e.procedure_template_id, st.id, st.position, st.label,
                 st.expected_minutes, pe.occurred_at
          FROM selected_episodes e
          JOIN position_events pe ON pe.episode_id = e.id
            AND pe.event_type = 'advanced'
            AND pe.next_position_event_type IS DISTINCT FROM 'undone'
          JOIN stage_templates st ON st.id = pe.stage_template_id
        ), durations AS (
          SELECT episode_id, procedure_template_id, stage_template_id, position, label,
                 expected_minutes, entered_at,
                 LEAD(entered_at) OVER (PARTITION BY episode_id ORDER BY entered_at, position) AS left_at,
                 EXTRACT(EPOCH FROM (LEAD(entered_at) OVER
                   (PARTITION BY episode_id ORDER BY entered_at, position) - entered_at)) AS seconds
          FROM entries
        )
      SQL
    end

    def select_all(sql, binds = query_binds)
      sanitized = ActiveRecord::Base.send(:sanitize_sql_array, [ sql, binds ])
      ActiveRecord::Base.connection.select_all(sanitized).to_a
    end

    def suppressed(count)
      count < minimum_sample_size
    end

    def rounded(value, digits = 1)
      value.nil? ? nil : value.to_f.round(digits)
    end

    def percent(numerator, denominator)
      return nil if denominator.to_i.zero?

      (numerator.to_f * 100 / denominator).round(1)
    end

    def base_info
      {
        from: from.iso8601,
        to: to.iso8601,
        procedure_template_id: procedure_template_id,
        minimum_sample_size: minimum_sample_size,
        has_demo_data: demo_records?
      }
    end

    def overview
      episodes = episode_scope
      count = episodes.count
      completed = episodes.where.not(discharged_at: nil).count
      completed_episodes = episodes.where.not(discharged_at: nil)
      completed_sql = completed_episodes.select(:id).to_sql
      actual_rows = select_all(<<~SQL)
        #{duration_cte}
        SELECT episode_id, SUM(seconds) / 60.0 AS total_minutes
        FROM durations
        WHERE left_at IS NOT NULL AND seconds >= 60
          AND episode_id IN (#{completed_sql})
        GROUP BY episode_id
      SQL
      total_times = actual_rows.to_h do |row|
        [ row.fetch("episode_id"), row.fetch("total_minutes").to_f ]
      end
      expected_rows = select_all(<<~SQL)
        SELECT e.id AS episode_id, SUM(COALESCE(st.expected_minutes, 0)) AS expected_minutes
        FROM episodes e
        INNER JOIN stage_templates st ON st.procedure_template_id = e.procedure_template_id
        WHERE e.id IN (#{completed_sql})
        GROUP BY e.id
      SQL
      expected_per_episode = expected_rows.to_h do |row|
        [ row.fetch("episode_id"), row.fetch("expected_minutes").to_f ]
      end
      on_time = total_times.count do |id, actual|
        expected = expected_per_episode[id]
        expected && actual <= expected + settings.fetch("grace_minutes")
      end
      delay_count = StageEvent.joins(:episode).where(episodes: { id: episodes.select(:id) },
        event_type: "flagged", status_flag: "delayed", occurred_at: range_start...range_end)
        .distinct.count(:episode_id)
      call_scope = StageEvent.joins(:episode).where(episodes: { id: episodes.select(:id) },
        event_type: "flagged", status_flag: "call_care_team")
        .where(occurred_at: range_start...range_end)
      call_count = call_scope.count
      call_sample = call_scope.distinct.count(:episode_id)
      inquiries = Inquiry.where(episode_id: episodes.select(:id), logged_at: range_start...range_end).count
      sessions = FamilySession.joins(:episode).where(episodes: { id: episodes.select(:id) },
        first_seen_at: range_start...range_end).count
      feedback = FeedbackResponse.joins("INNER JOIN episodes ON episodes.tracking_code = feedback_responses.tracking_code")
        .where(episodes: { id: episodes.select(:id) }, feedback_responses: { created_at: range_start...range_end })
        .group(:answer).count
      informed = feedback.fetch("yes", 0) + feedback.fetch("somewhat", 0)
      feedback_sample = FeedbackResponse.joins("INNER JOIN episodes ON episodes.tracking_code = feedback_responses.tracking_code")
        .where(episodes: { id: episodes.select(:id) }, feedback_responses: { created_at: range_start...range_end })
        .distinct.count(:tracking_code)
      baseline = settings["baseline_inquiries_per_episode"]
      inquiry_rate = count.zero? ? nil : rounded(inquiries.to_f / count, 2)
      saved_inputs = {
        inquiries: inquiries,
        minutes_per_inquiry: settings.fetch("minutes_per_inquiry"),
        assumption: "Estimated minutes saved = inquiries × minutes per inquiry"
      }
      saved_minutes = inquiries * settings.fetch("minutes_per_inquiry")

      informed_rate = if suppressed(feedback_sample)
        { insufficient_data: true }
      else
        {
          yes: feedback.fetch("yes", 0),
          somewhat: feedback.fetch("somewhat", 0),
          no: feedback.fetch("no", 0),
          rate: feedback.values.sum.zero? ? nil : percent(informed, feedback.values.sum)
        }
      end
      result = base_info.merge(
        episodes_count: count,
        completed_count: completed,
        average_total_minutes: suppressed(completed) ? { insufficient_data: true } :
          completed.zero? ? nil : rounded(total_times.values.sum / completed),
        expected_total_minutes: suppressed(completed) ? { insufficient_data: true } :
          completed.zero? ? nil : rounded(expected_per_episode.values.sum.to_f / completed),
        on_time_rate: suppressed(completed) ? { insufficient_data: true } : percent(on_time, total_times.length),
        delay_rate: suppressed(count) ? { insufficient_data: true } : percent(delay_count, count),
        call_care_team_count: suppressed(call_sample) ? { insufficient_data: true } : call_count,
        inquiries_total: suppressed(count) ? { insufficient_data: true } : inquiries,
        inquiries_per_episode: suppressed(count) ? { insufficient_data: true } : inquiry_rate,
        baseline_inquiries_per_episode: baseline,
        inquiries_per_episode_difference: baseline.nil? || suppressed(count) || inquiry_rate.nil? ? nil : rounded(inquiry_rate - baseline, 2),
        family_checks_per_episode: suppressed(count) ? { insufficient_data: true } :
          count.zero? ? nil : rounded(sessions.to_f / count, 2),
        informed_rate: informed_rate,
        estimated_staff_minutes_saved: {
          minutes: saved_minutes,
          hours: rounded(saved_minutes / 60.0, 2),
          inputs: saved_inputs
        }
      )
      result[:insights] = overview_insights(result)
      result
    end

    def overview_insights(overview)
      insights = []
      stage_lost = aggregate_stage_rows
        .reject { |row| row[:insufficient_data] }
      top = stage_lost.max_by { |row| row[:minutes_lost].to_f }
      if top
        insights << {
          type: "highest_minutes_lost",
          stage: top[:stage],
          minutes_lost: top[:minutes_lost],
          sample_size: top[:sample_size]
        }
      end
      if overview[:inquiries_per_episode] && overview[:baseline_inquiries_per_episode]
        insights << {
          type: "inquiries_vs_baseline",
          inquiries_per_episode: overview[:inquiries_per_episode],
          baseline: overview[:baseline_inquiries_per_episode],
          difference: overview[:inquiries_per_episode_difference]
        }
      end
      hourly_groups = select_all(<<~SQL)
        #{duration_cte}
        SELECT stage_template_id, label AS stage,
               EXTRACT(DOW FROM entered_at)::integer AS weekday,
               EXTRACT(HOUR FROM entered_at)::integer AS hour,
               COUNT(DISTINCT episode_id) AS sample_size,
               AVG(GREATEST(seconds / 60.0 - COALESCE(expected_minutes, 0), 0)) AS average_overrun_minutes
        FROM durations
        WHERE left_at IS NOT NULL AND seconds >= 60
        GROUP BY stage_template_id, label, weekday, hour
        HAVING COUNT(DISTINCT episode_id) >= #{minimum_sample_size}
      SQL
      top_hour = hourly_groups.max_by { |row| row.fetch("average_overrun_minutes").to_f }
      if top_hour
        insights << {
          type: "highest_hourly_overrun",
          stage: top_hour.fetch("stage"),
          weekday: top_hour.fetch("weekday").to_i,
          hour: top_hour.fetch("hour").to_i,
          average_overrun_minutes: rounded(top_hour.fetch("average_overrun_minutes")),
          sample_size: top_hour.fetch("sample_size").to_i,
          hour_range: format("%02d:00-%02d:00", top_hour.fetch("hour").to_i, top_hour.fetch("hour").to_i + 1)
        }
      end
      reason_counts = StageEvent.joins(:episode).where(episodes: { id: episode_scope.select(:id) },
        event_type: "flagged", status_flag: "delayed", occurred_at: range_start...range_end)
        .group(:delay_reason).distinct.count(:episode_id)
      reason, reason_sample = reason_counts.max_by { |_key, value| value } || [ nil, 0 ]
      if reason && !suppressed(reason_sample)
        insights << {
          type: "most_common_delay_reason",
          reason: reason,
          count: reason_sample,
          sample_size: reason_sample
        }
      end
      insights
    end

    def aggregate_stage_rows
      templates = StageTemplate.all
      templates = templates.where(procedure_template_id: procedure_template_id) if procedure_template_id
      template_groups = templates.distinct.order(:position, :label, :expected_minutes)
        .pluck(:position, :label, :expected_minutes)
      stats_rows = select_all(<<~SQL)
        #{duration_cte}
        SELECT position, label, expected_minutes,
               COUNT(DISTINCT episode_id) FILTER (WHERE seconds >= 60) AS sample_size,
               COUNT(*) FILTER (WHERE seconds < 60) AS excluded_short_count,
               percentile_cont(0.5) WITHIN GROUP (ORDER BY seconds / 60.0)
                 FILTER (WHERE seconds >= 60) AS median_minutes,
               percentile_cont(0.9) WITHIN GROUP (ORDER BY seconds / 60.0)
                 FILTER (WHERE seconds >= 60) AS p90_minutes,
               SUM(GREATEST(seconds / 60.0 - COALESCE(expected_minutes, 0), 0))
                 FILTER (WHERE seconds >= 60) AS minutes_lost,
               COUNT(DISTINCT episode_id) FILTER (WHERE seconds / 60.0 >
                 COALESCE(expected_minutes, 0) + #{settings.fetch("grace_minutes")} AND seconds >= 60) AS over_expected
        FROM durations
        WHERE left_at IS NOT NULL
        GROUP BY position, label, expected_minutes
      SQL
      stats = stats_rows.index_by do |row|
        [ row.fetch("position").to_i, row.fetch("label"), row["expected_minutes"]&.to_i ]
      end
      template_groups.map do |position, label, expected_minutes|
        stage_stats = stats[[ position, label, expected_minutes ]]
        episode_count = stage_stats ? stage_stats.fetch("sample_size").to_i : 0
        if suppressed(episode_count)
          { stage: label, position: position, insufficient_data: true }
        else
          {
            stage: label, position: position, sample_size: episode_count,
            median_minutes: rounded(stage_stats.fetch("median_minutes")),
            p90_minutes: rounded(stage_stats.fetch("p90_minutes")),
            expected_minutes: expected_minutes,
            minutes_lost: rounded(stage_stats.fetch("minutes_lost")),
            share_over_expected: percent(stage_stats.fetch("over_expected"), episode_count),
            excluded_short_count: stage_stats.fetch("excluded_short_count").to_i
          }
        end
      end
    end

    def bottlenecks
      stages = aggregate_stage_rows
      heatmap_rows = select_all(<<~SQL)
        #{duration_cte}
        SELECT EXTRACT(DOW FROM entered_at)::integer AS weekday,
               EXTRACT(HOUR FROM entered_at)::integer AS hour,
               COUNT(DISTINCT episode_id) AS sample_size,
               AVG(GREATEST(seconds / 60.0 - COALESCE(expected_minutes, 0), 0)) AS average_overrun_minutes
        FROM durations
        WHERE left_at IS NOT NULL AND seconds >= 60
        GROUP BY weekday, hour ORDER BY weekday, hour
      SQL
      observed = heatmap_rows.index_by { |row| [ row.fetch("weekday").to_i, row.fetch("hour").to_i ] }
      heatmap = (0..6).flat_map do |weekday|
        (0..23).map do |hour|
          row = observed[[ weekday, hour ]]
          if row.nil? || suppressed(row.fetch("sample_size").to_i)
            { weekday: weekday, hour: hour, insufficient_data: true }
          else
            {
              weekday: weekday, hour: hour,
              count: row.fetch("sample_size").to_i,
              average_overrun_minutes: rounded(row.fetch("average_overrun_minutes"))
            }
          end
        end
      end
      top_hour = heatmap.reject { |cell| cell[:insufficient_data] }.max_by { |cell| cell[:average_overrun_minutes] }
      {
        **base_info,
        stages: stages,
        heatmap: heatmap,
        insights: top_hour ? [ {
          type: "highest_hourly_overrun",
          weekday: top_hour[:weekday],
          hour: top_hour[:hour],
          average_overrun_minutes: top_hour[:average_overrun_minutes],
          sample_size: top_hour[:count]
        } ] : []
      }
    end

    def delays
      episodes = episode_scope
      delayed_ids = StageEvent.joins(:episode).where(episodes: { id: episodes.select(:id) })
        .where(event_type: "flagged", status_flag: "delayed", occurred_at: range_start...range_end)
        .distinct.pluck(:episode_id)
      reasons = StageEvent.joins(:episode).where(episodes: { id: delayed_ids })
        .where(event_type: "flagged", status_flag: "delayed", occurred_at: range_start...range_end)
        .group(:delay_reason).distinct.count(:episode_id)
      selected_ids = episode_scope.select(:id)
      event_rows = select_all(<<~SQL)
        SELECT se.occurred_at, st.label AS stage
        FROM stage_events se
        INNER JOIN episodes e ON e.id = se.episode_id
        INNER JOIN stage_templates st ON st.id = se.stage_template_id
        WHERE e.id IN (#{selected_ids.to_sql})
          AND se.event_type = 'flagged' AND se.status_flag = 'call_care_team'
          AND se.occurred_at >= #{ActiveRecord::Base.connection.quote(range_start)}
          AND se.occurred_at < #{ActiveRecord::Base.connection.quote(range_end)}
        ORDER BY se.occurred_at
      SQL
      call_scope = StageEvent.joins(:episode).where(episodes: { id: episodes.select(:id) },
        event_type: "flagged", status_flag: "call_care_team", occurred_at: range_start...range_end)
      call_sample = call_scope.distinct.count(:episode_id)
      call_count = call_scope.count
      delayed_scope = episodes.where(id: delayed_ids).select(:id).to_sql
      delay_minutes = select_all(<<~SQL).first.fetch("total_minutes").to_f
        #{duration_cte}
        SELECT COALESCE(SUM(GREATEST(seconds / 60.0 - COALESCE(expected_minutes, 0), 0)), 0) AS total_minutes
        FROM durations
        WHERE left_at IS NOT NULL AND seconds >= 60
          AND episode_id IN (#{delayed_scope})
      SQL
      daily = StageEvent.joins(:episode).where(episodes: { id: delayed_ids })
        .where(event_type: "flagged", status_flag: "delayed", occurred_at: range_start...range_end)
        .group("DATE(stage_events.occurred_at)").distinct.count(:episode_id).map do |date, count|
          suppressed(count) ? { date: date.to_s, insufficient_data: true } : { date: date.to_s, count: count }
        end
      common_reason, common_reason_count = reasons.max_by { |_reason, value| value } || [ nil, 0 ]
      insights = common_reason && !suppressed(common_reason_count) ? [ {
        type: "most_common_delay_reason",
        reason: common_reason,
        count: common_reason_count,
        sample_size: delayed_ids.size
      } ] : []
      {
        **base_info,
        delay_count: suppressed(delayed_ids.size) ? { insufficient_data: true } : delayed_ids.size,
        total_delay_minutes: suppressed(delayed_ids.size) ? { insufficient_data: true } : rounded(delay_minutes),
        average_delay_minutes: suppressed(delayed_ids.size) ? { insufficient_data: true } :
          delayed_ids.empty? ? nil : rounded(delay_minutes.to_f / delayed_ids.size),
        reason_mix: reasons.map do |reason, count|
          suppressed(count) ? { reason: reason, insufficient_data: true } : { reason: reason, count: count }
        end,
        delays_by_stage: delays_by_stage(delayed_ids),
        daily_trend: daily,
        call_care_team_count: suppressed(call_sample) ? { insufficient_data: true } : call_count,
        call_care_team_events: if suppressed(call_sample)
          { insufficient_data: true }
        else
          event_rows.map do |row|
            time = row.fetch("occurred_at").in_time_zone
            { date: time.to_date.iso8601, time: time.strftime("%H:%M"), stage: row.fetch("stage") }
          end
        end,
        insights: insights
      }
    end

    def delays_by_stage(ids)
      return [] if ids.empty?

      StageEvent.joins(:stage_template).where(episode_id: ids, event_type: "flagged", status_flag: "delayed")
        .where(occurred_at: range_start...range_end)
        .group("stage_templates.label", "stage_templates.position").order("stage_templates.position")
        .distinct.count(:episode_id).map do |(label, position), count|
          suppressed(count) ? { stage: label, position: position, insufficient_data: true } :
            { stage: label, position: position, count: count }
        end
    end

    def inquiries
      episodes = episode_scope
      episode_ids = episodes.select(:id)
      inquiry_scope = Inquiry.where(episode_id: episode_ids, logged_at: range_start...range_end)
      total = inquiry_scope.count
      episode_count = episodes.count
      channels = inquiry_groups(inquiry_scope, :channel).map do |channel, count, sample|
        suppressed(sample) ? { channel: channel, insufficient_data: true } :
          { channel: channel, count: count }
      end
      inquiry_episode_count = inquiry_scope.distinct.count(:episode_id)
      daily = inquiry_groups(inquiry_scope, "DATE(logged_at)").map do |group, count, sample|
        suppressed(sample) ? { date: group.to_s, insufficient_data: true } : { date: group.to_s, count: count }
      end
      hourly = inquiry_groups(inquiry_scope, "EXTRACT(HOUR FROM logged_at)::integer").map do |hour, count, sample|
        suppressed(sample) ? { hour: hour.to_i, insufficient_data: true } : { hour: hour.to_i, count: count }
      end
      sessions = FamilySession.joins(:episode).where(episodes: { id: episode_ids },
        first_seen_at: range_start...range_end).count
      baseline = settings["baseline_inquiries_per_episode"]
      rate = episode_count.zero? ? nil : rounded(total.to_f / episode_count, 2)
      feedback = FeedbackResponse.joins("INNER JOIN episodes ON episodes.tracking_code = feedback_responses.tracking_code")
        .where(episodes: { id: episode_ids }, feedback_responses: { created_at: range_start...range_end })
        .group("DATE_TRUNC('week', feedback_responses.created_at)", :answer).count
      feedback_scope = FeedbackResponse.joins("INNER JOIN episodes ON episodes.tracking_code = feedback_responses.tracking_code")
        .where(episodes: { id: episode_ids }, feedback_responses: { created_at: range_start...range_end })
      feedback_counts = feedback_scope.group(:answer).count
      feedback_sample = feedback_scope.distinct.count(:tracking_code)
      informed_rate = if suppressed(feedback_sample)
        { insufficient_data: true }
      else
        answer_total = feedback_counts.values.sum
        {
          yes: feedback_counts.fetch("yes", 0),
          somewhat: feedback_counts.fetch("somewhat", 0),
          no: feedback_counts.fetch("no", 0),
          rate: answer_total.zero? ? nil : percent(feedback_counts.fetch("yes", 0) + feedback_counts.fetch("somewhat", 0), answer_total)
        }
      end
      feedback_by_week_sample = feedback_scope.group("DATE_TRUNC('week', feedback_responses.created_at)")
        .distinct.count(:tracking_code)
      weekly = feedback.group_by { |(week, _answer), _count| week }.map do |week, values|
        counts = values.to_h { |((_, answer), amount)| [ answer, amount ] }
        sample = feedback_by_week_sample.fetch(week, 0)
        if suppressed(sample)
          { week: week.to_date.iso8601, insufficient_data: true }
        else
          { week: week.to_date.iso8601, yes: counts.fetch("yes", 0), somewhat: counts.fetch("somewhat", 0), no: counts.fetch("no", 0) }
        end
      end
      {
        **base_info,
        total: suppressed(episode_count) ? { insufficient_data: true } : total,
        by_channel: channels,
        by_day: daily,
        by_hour: hourly,
        per_episode: suppressed(episode_count) ? { insufficient_data: true } : rate,
        baseline_per_episode: baseline,
        difference_from_baseline: baseline.nil? || suppressed(episode_count) || rate.nil? ? nil : rounded(rate - baseline, 2),
        family_checks_per_episode: suppressed(episode_count) ? { insufficient_data: true } : rounded(sessions.to_f / [ episode_count, 1 ].max, 2),
        checks_to_inquiries_ratio: suppressed(inquiry_episode_count) ? { insufficient_data: true } :
          total.zero? ? nil : rounded(sessions.to_f / total, 2),
        informed_rate: informed_rate,
        feedback_by_week: weekly
      }
    end

    def data_quality
      episodes = episode_scope
      count = episodes.count
      selected_ids = episodes.select(:id).to_sql
      complete_count = ActiveRecord::Base.connection.select_value(<<~SQL).to_i
        SELECT COUNT(*)
        FROM episodes e
        INNER JOIN (
          SELECT procedure_template_id, COUNT(*) AS expected_stages
          FROM stage_templates GROUP BY procedure_template_id
        ) expected ON expected.procedure_template_id = e.procedure_template_id
        LEFT JOIN (
          SELECT episode_id, COUNT(DISTINCT stage_template_id) AS entered_stages
          FROM stage_events WHERE event_type = 'advanced' GROUP BY episode_id
        ) recorded ON recorded.episode_id = e.id
        WHERE e.id IN (#{selected_ids})
          AND COALESCE(recorded.entered_stages, 0) + 1 >= expected.expected_stages
      SQL
      excluded_short = select_all(<<~SQL).first.fetch("count").to_i
        #{duration_cte}
        SELECT COUNT(*) AS count FROM durations
        WHERE left_at IS NOT NULL AND seconds < 60
      SQL
      {
        **base_info,
        episodes_count: count,
        complete_stage_history_count: complete_count,
        complete_stage_history_rate: count.zero? ? nil : percent(complete_count, count),
        excluded_short_stage_count: excluded_short,
        episodes_without_stage_events: episodes.left_joins(:stage_events).where(stage_events: { id: nil }).count
      }
    end

    def inquiry_groups(scope, column)
      count_by_group = scope.group(column).count
      episodes_by_group = scope.group(column).distinct.count(:episode_id)
      count_by_group.map do |group, count|
        [ group, count, episodes_by_group.fetch(group, 0) ]
      end
    end

    def flatten(value, prefix = nil)
      case value
      when Hash
        value.flat_map do |key, child|
          flatten(child, [ prefix, key ].compact.join("."))
        end
      when Array
        value.flat_map.with_index { |child, index| flatten(child, "#{prefix}[#{index}]") }
      else
        [ [ prefix, value ] ]
      end
    end
  end
end
