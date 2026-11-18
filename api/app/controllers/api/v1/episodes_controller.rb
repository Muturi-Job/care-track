module Api
  module V1
    # Staff-facing episode endpoints. Production access is restricted by the
    # reverse proxy; the Rails app has no authentication in Phase A.
    class EpisodesController < ApplicationController
      # ACCESS CONTROL LATER: every action here is staff-only in a real system;
      # add authentication and an authorisation policy before use with patients.
      before_action :reject_disabled_creation, only: :create

      rescue_from StageTransitionService::Rejected, with: :render_rejected

      def index
        now = Time.current
        episodes = Episode.active.includes(:inquiries, procedure_template: :stage_templates)
        episodes = episodes.search(params[:q]) if params[:q].present?

        ordered = episodes.sort_by do |episode|
          [ episode.attention_rank(now: now), -episode.minutes_overdue(now: now), episode.created_at ]
        end

        render json: { episodes: ordered.map { |episode| serialize(episode, include_history: false, now: now) } }
      end

      def create
        episode = Episode.new(create_params)

        if episode.save
          render_episode(episode, status: :created)
        else
          render_validation_errors(episode)
        end
      end

      # The staff detail page: one episode with its stage history.
      def show
        render_episode(Episode.find(params[:id]))
      end

      def update
        episode = Episode.find(params[:id])

        if episode.update(update_params)
          render_episode(episode)
        else
          render_validation_errors(episode)
        end
      end

      def advance
        result = transitions.advance(
          episode_id: params[:id],
          idempotency_key: request.headers["Idempotency-Key"],
          recorded_by_device: recorded_by_device
        )

        render_episode(result.episode)
      end

      def undo
        result = transitions.undo(episode_id: params[:id])

        render_episode(result.episode)
      end

      def flag
        result = transitions.flag(
          episode_id: params[:id],
          status_flag: flag_params[:status_flag],
          delay_reason: flag_params[:delay_reason],
          recorded_by_device: recorded_by_device
        )

        render_episode(result.episode)
      end

      def clear_flag
        result = transitions.clear_flag(
          episode_id: params[:id],
          recorded_by_device: recorded_by_device
        )

        render_episode(result.episode)
      end

      private

      def reject_disabled_creation
        return unless ENV.fetch("STAFF_CREATION_ENABLED", "true") == "false"

        render json: { error: "staff_creation_disabled" }, status: :not_found
      end

      def transitions
        @transitions ||= StageTransitionService.new
      end

      # Anonymous device token supplied by the staff client. The header is
      # preferred, with a body parameter as a fallback for simple clients, and
      # it is capped so a malformed value cannot break a stage change.
      def recorded_by_device
        value = request.headers["X-Device-Id"].presence || params[:recorded_by_device].presence
        if value.blank? && params[:episode].is_a?(ActionController::Parameters)
          value = params[:episode][:recorded_by_device]
        end

        value.to_s.strip.first(50).presence
      end

      def serialize(episode, include_history: true, now: Time.current)
        EpisodeSerializer.new(episode, include_history: include_history, now: now).as_json
      end

      def render_episode(episode, status: :ok)
        render json: { episode: serialize(episode) }, status: status
      end

      def render_validation_errors(episode)
        render json: { error: "invalid_episode", details: episode.errors.to_hash },
               status: 422
      end

      def render_rejected(error)
        render json: { error: error.code.to_s, message: error.message }, status: error.http_status
      end

      # Accepts {"episode": {...}} or a bare body, so simple clients are not
      # forced into a wrapper.
      def create_params
        source.permit(:patient_alias, :procedure_template_id, :ward_or_bed)
      end

      # Alias and bed only: the procedure is fixed once an episode exists.
      def update_params
        source.permit(:patient_alias, :ward_or_bed)
      end

      def flag_params
        source.permit(:status_flag, :delay_reason)
      end

      def source
        params[:episode].present? ? params[:episode] : params
      end
    end
  end
end
