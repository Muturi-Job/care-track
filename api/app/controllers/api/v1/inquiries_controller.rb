module Api
  module V1
    # Staff-facing inquiry capture. Production access is restricted by the
    # reverse proxy; the Rails app has no authentication in Phase A.
    class InquiriesController < ApplicationController
      # ACCESS CONTROL LATER: logging and undoing inquiries is staff-only in a
      # real system; add authentication and an authorisation policy here.
      rescue_from InquiryLoggingService::Rejected, with: :render_rejected

      # POST /api/v1/episodes/:id/inquiries
      def create
        result = service.log(
          episode_id: params[:id],
          channel: inquiry_params[:channel],
          idempotency_key: request.headers["Idempotency-Key"]
        )

        render json: {
          id: result.inquiry.id,
          inquiry_count: result.count
        }, status: result.replayed ? :ok : :created
      end

      # DELETE /api/v1/inquiries/:id
      def destroy
        service.undo(inquiry_id: params[:id])

        head :no_content
      end

      private

      def service
        @service ||= InquiryLoggingService.new
      end

      def inquiry_params
        source.permit(:channel)
      end

      def source
        params[:inquiry].present? ? params[:inquiry] : params
      end

      def render_rejected(error)
        render json: { error: error.code.to_s, message: error.message }, status: error.http_status
      end
    end
  end
end
