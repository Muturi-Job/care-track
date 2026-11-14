Rails.application.configure do
  config.enable_reloading = false
  config.eager_load = ENV["CI"].present?
  config.public_file_server.headers = { "cache-control" => "public, max-age=3600" }
  config.consider_all_requests_local = true
  config.action_dispatch.show_exceptions = :rescuable
  config.action_controller.allow_forgery_protection = false
  config.active_support.deprecation = :stderr

  # Rack::Attack keeps its counters in Rails.cache, and the framework default
  # (file store) cannot increment, so the family throttle specs need this.
  config.cache_store = :memory_store
end
