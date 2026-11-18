module Api
  module V1
    # The family page records one anonymous session per page load. Like the
    # progress page it is reached with the tracking code alone (CLAUDE.md
    # rule 3).
    #
    # It stores no IP address and no user agent (rule 2), and an unknown code
    # gets the same 204 as a known one so the response reveals nothing.
    class FamilySessionsController < ApplicationController
      # ACCESS CONTROL LATER: real access control would tie a code to one
      # family member; Phase A has neither by design.
      def create
        session_id = params[:session_id].to_s.strip
        return render_invalid_session_id unless valid_session_id?(session_id)

        episode = Episode.find_by(tracking_code: params[:tracking_code])
        return head :no_content if episode.nil? || episode.expired?

        FamilySession.record!(episode: episode, session_id: session_id)
        head :no_content
      end

      private

      # Validated before the code lookup so a malformed request gets the same
      # answer whether or not the code exists.
      def valid_session_id?(session_id)
        session_id.present? && session_id.length <= FamilySession::MAX_SESSION_ID_LENGTH
      end

      def render_invalid_session_id
        render json: { error: "invalid_session_id" }, status: :unprocessable_entity
      end
    end
  end
end
