require "csv"

module Api
  module V1
    module Analytics
      class ReportsController < ApplicationController
        # ACCESS CONTROL LATER: analytics are staff-only once access control exists.
        REPORTS = %w[overview bottlenecks delays inquiries data_quality].freeze
        ANALYTICS_CACHE = ActiveSupport::Cache::MemoryStore.new

        def overview
          render_report("overview")
        end

        def bottlenecks
          render_report("bottlenecks")
        end

        def delays
          render_report("delays")
        end

        def inquiries
          render_report("inquiries")
        end

        def data_quality
          render_report("data_quality")
        end

        def export
          report = params[:report].to_s
          return render(json: { error: "unknown_report" }, status: :bad_request) unless REPORTS.include?(report)

          analytics = build_report
          csv = ANALYTICS_CACHE.fetch(cache_key(report, analytics), expires_in: 60.seconds) do
            analytics.export(report)
          end
          send_data csv, type: "text/csv; charset=utf-8",
            disposition: "attachment; filename=caretrack-#{report}.csv"
        rescue ArgumentError => error
          render json: { error: "invalid_analytics_range", message: error.message }, status: :unprocessable_entity
        end

        private

        def render_report(name)
          report = build_report
          result = ANALYTICS_CACHE.fetch(cache_key(name, report), expires_in: 60.seconds) do
            report.generate(name)
          end
          render json: result
        rescue ArgumentError => error
          render json: { error: "invalid_analytics_range", message: error.message }, status: :unprocessable_entity
        end

        def build_report
          ::Analytics::Report.new(
            from: params[:from],
            to: params[:to],
            procedure_template_id: params[:procedure_template_id]
          )
        end

        def cache_key(name, report)
          [
            "analytics",
            name,
            report.from.iso8601,
            report.to.iso8601,
            report.procedure_template_id.presence || "all",
            MetricSetting.current.sort.flatten.join(":")
          ].join("/")
        end
      end
    end
  end
end
