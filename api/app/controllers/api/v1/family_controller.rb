module Api
  module V1
    # The public side of the app: a family member's view of one episode.
    #
    # The tracking code in the path is the whole of the access (CLAUDE.md
    # rule 3), so nothing that is not on the progress page may be returned.
    class FamilyController < ApplicationController
      # ACCESS CONTROL LATER: real access control would tie a code to one
      # family member (or require sign-in); Phase A has neither by design.
      def show
        episode = Episode.find_by(tracking_code: params[:tracking_code])
        return render_unknown_code if episode.nil?
        return render_expired_link if episode.expired?

        payload = FamilyEpisodeSerializer.new(episode).as_json
        return head :not_modified if revalidated?(payload, episode)

        render json: payload
      end

      private

      # Polling every ten seconds should cost a 304, not a body, whenever
      # nothing has changed since the family last looked. The ETag is the
      # response body itself, so it changes exactly when the page would.
      def revalidated?(payload, episode)
        response.etag = payload.to_json
        response.last_modified = episode.updated_at
        request.fresh?(response)
      end

      # A miss is counted so repeated guessing gets the IP banned; the response
      # stays deliberately vague.
      def render_unknown_code
        FamilyGuard.record_miss(request.ip)
        render json: {
          error: "not_found",
          message: FamilyMessageCatalog.message(:link_not_found)
        }, status: :not_found
      end

      def render_expired_link
        render json: {
          error: "link_expired",
          message: FamilyMessageCatalog.message(:link_expired)
        }, status: :gone
      end
    end
  end
end
