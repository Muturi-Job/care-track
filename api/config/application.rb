require_relative "boot"

require "rails"
# Only the frameworks this API uses (CLAUDE.md rule 5).
require "active_model/railtie"
require "active_record/railtie"
require "action_controller/railtie"

Bundler.require(*Rails.groups)

module CareTrack
  class Application < Rails::Application
    config.load_defaults 8.0

    # API-only: no views, no cookies, no sessions.
    config.api_only = true

    config.autoload_lib(ignore: %w[assets tasks])

    # --skip-test was used, so specs are the test framework.
    config.generators do |generators|
      generators.test_framework :rspec
      generators.fixture_replacement :factory_bot, dir: "spec/factories"
    end
  end
end
