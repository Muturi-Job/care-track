Rails.application.routes.draw do
  # ACCESS CONTROL LATER: no authentication exists in Phase A. Every endpoint
  # below will need a policy once real patients are involved.
  namespace :api do
    namespace :v1 do
      # Liveness probe used by the web home page. README documents the contract.
      get "health", to: "health#show"

      # Public: one family member's view, reached by tracking code alone.
      get "family/:tracking_code", to: "family#show"

      # Public: the page's one feedback question (answer + tracking code only).
      post "family/:tracking_code/feedback", to: "family_feedback#create"

      # Public: one anonymous family session per page load. Never called by the
      # ten-second poll.
      post "family/:tracking_code/session", to: "family_sessions#create"

      # Staff: metrics captured for the prototype analysis.
      post "episodes/:id/inquiries", to: "inquiries#create"
      delete "inquiries/:id", to: "inquiries#destroy"

      get "settings/metrics", to: "metric_settings#show"
      patch "settings/metrics", to: "metric_settings#update"

      namespace :analytics do
        get :overview, to: "reports#overview"
        get :bottlenecks, to: "reports#bottlenecks"
        get :delays, to: "reports#delays"
        get :inquiries, to: "reports#inquiries"
        get :data_quality, to: "reports#data_quality"
        get "export.csv", to: "reports#export"
      end

      resources :procedure_templates, only: :index

      # Production keeps these endpoints on the private backend network; the
      # public reverse proxy protects the web staff routes.
      resources :episodes, only: %i[index show create update] do
        post :advance, on: :member
        post :undo, on: :member
        post :flag, on: :member
        post "flag/clear", to: "episodes#clear_flag", on: :member
      end
    end
  end
end
