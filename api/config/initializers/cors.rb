# CORS: allow only the web origin(s) listed in CORS_ORIGINS (CLAUDE.md rule 3).
# The browser normally reaches the API through the Next.js server, but direct
# calls from local dev must still be restricted to a known origin.
#
# ACCESS CONTROL LATER: CORS is not access control. Add request authentication
# before trusting any origin list here.
allowed_origins = ENV.fetch("CORS_ORIGINS", "http://localhost:3000")
                    .split(",")
                    .map(&:strip)
                    .reject(&:empty?)

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*allowed_origins)
    resource "/api/*",
             headers: :any,
             methods: [ :get, :post, :patch, :put, :delete, :options, :head ],
             expose: [ "ETag" ]
  end
end
