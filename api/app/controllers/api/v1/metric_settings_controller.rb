module Api
  module V1
    # Read and update the numbers the analytics sheet uses. Values are checked
    # against a range per key before they are stored.
    class MetricSettingsController < ApplicationController
      # ACCESS CONTROL LATER: metric settings are staff-only in a real system;
      # add authentication and an authorisation policy here.
      def show
        render json: { settings: MetricSetting.typed_settings }
      end

      def update
        settings = settings_params.to_h.map { |key, value| build_setting(key, value) }

        if settings.all?(&:valid?)
          MetricSetting.transaction { settings.each(&:save!) }
          render json: { settings: MetricSetting.typed_settings }
        else
          render json: {
            error: "invalid_settings",
            details: errors_for(settings)
          }, status: :unprocessable_entity
        end
      end

      private

      def build_setting(key, value)
        MetricSetting.find_or_initialize_by(key: key).tap do |setting|
          setting.value = value.to_s
        end
      end

      def errors_for(settings)
        settings.each_with_object({}) do |setting, details|
          next if setting.errors.empty?

          details[setting.key] = setting.errors.full_messages
        end
      end

      def settings_params
        source.permit(*MetricSetting::DEFINITIONS.keys)
      end

      def source
        return params[:settings] if params[:settings].present?
        return params[:metric_settings] if params[:metric_settings].present?

        params
      end
    end
  end
end
