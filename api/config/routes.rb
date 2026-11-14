Rails.application.routes.draw do
  # ACCESS CONTROL LATER: no authentication exists in Phase A. Every endpoint
  # below will need a policy once real patients are involved.
  namespace :api do
    namespace :v1 do
      # Liveness probe used by the web home page. README documents the contract.
      get "health", to: "health#show"
    end
  end
end
