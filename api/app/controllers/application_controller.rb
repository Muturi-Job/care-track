class ApplicationController < ActionController::API
  # ACCESS CONTROL LATER: Phase A has no authentication by design
  # (CLAUDE.md rule 1). When real access control arrives, authentication and
  # authorisation callbacks belong here so they run before every action.
  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found

  private

  def render_not_found
    render json: { error: "not_found" }, status: :not_found
  end
end
