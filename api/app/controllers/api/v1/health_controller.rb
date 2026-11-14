module Api
  module V1
    # Liveness endpoint for the web app and for deploys.
    #
    # It returns no patient data, so it is safe to call without a tracking
    # code. ACCESS CONTROL LATER: still add authentication if this ever grows
    # beyond a liveness probe.
    class HealthController < ApplicationController
      def show
        render json: {
          status: overall_status,
          database: database_status,
          checked_at: Time.current.utc.iso8601
        }
      end

      private

      # "degraded" rather than an error page: the app answered, the database
      # did not. The family page would show calm fallback copy.
      # (Named overall_status so it does not shadow ActionController#status.)
      def overall_status
        database_status == "ok" ? "ok" : "degraded"
      end

      def database_status
        ActiveRecord::Base.connection_pool.with_connection do |connection|
          connection.select_value("SELECT 1") ? "ok" : "unavailable"
        end
      rescue ActiveRecord::ActiveRecordError
        "unavailable"
      end
    end
  end
end
