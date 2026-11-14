Rails.application.routes.draw do
  # ACCESS CONTROL LATER: no authentication exists in Phase A. Every endpoint
  # below will need a policy once real patients are involved.
  namespace :api do
    namespace :v1 do
      # Liveness probe used by the web home page. README documents the contract.
      get "health", to: "health#show"

      # Public: one family member's view, reached by tracking code alone.
      get "family/:tracking_code", to: "family#show"

      resources :procedure_templates, only: :index

      # Staff endpoints: no tracking code is involved, so they are the first
      # place real access control will be needed.
      resources :episodes, only: %i[index create update] do
        post :advance, on: :member
        post :undo, on: :member
        post :flag, on: :member
        post "flag/clear", to: "episodes#clear_flag", on: :member
      end
    end
  end
end
