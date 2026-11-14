module Api
  module V1
    # The one-question feedback prompt at the bottom of the family page.
    #
    # Like the progress page it is reached with the tracking code alone
    # (CLAUDE.md rule 3), and it stores no personal data (rule 2).
    class FamilyFeedbackController < ApplicationController
      # ACCESS CONTROL LATER: real access control would tie a code to one
      # family member; Phase A has neither by design.
      def create
        episode = Episode.find_by(tracking_code: params[:tracking_code])
        return render_unknown_code if episode.nil?
        return render_expired_link if episode.expired?

        feedback = FeedbackResponse.new(
          tracking_code: episode.tracking_code,
          answer: params[:answer]
        )

        if feedback.save
          render json: { received: true }, status: :created
        else
          render json: {
            error: "invalid_answer",
            message: "Please choose one of the answers."
          }, status: :unprocessable_entity
        end
      end

      private

      # A miss is counted so repeated guessing gets the IP banned, exactly as
      # on the progress endpoint.
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
