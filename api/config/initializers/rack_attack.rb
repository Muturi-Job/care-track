# Rate limiting (CLAUDE.md rule 3). Family members reach an episode through a
# tracking code in the URL, so both the request rate and the rate of wrong
# codes are limited per IP. Rack::Attack slows brute force; it is not
# authentication and does not decide who may see what.
#
# Rack::Attack is inserted into the middleware stack by its own Railtie; the
# rules live here and the counters live in Rails.cache.
#
# Limits come from the environment (.env.example):
#   RACK_ATTACK_ENABLED            toggle, default on
#   RACK_ATTACK_FAMILY_LIMIT       family requests per IP per minute, default 30
#   RACK_ATTACK_FAMILY_MISS_LIMIT  unknown codes before a ban, default 10
#   RACK_ATTACK_SESSION_LIMIT      family session pings per IP per hour, default 20
#   RACK_ATTACK_STAFF_LIMIT        staff requests per IP per hour, default 600

Rack::Attack.enabled = ENV.fetch("RACK_ATTACK_ENABLED", "true") != "false"

# One calm, family-safe body for every refusal (rule 4).
too_many_requests = lambda do |_request|
  body = { error: "Too many requests. Please call the care team." }.to_json
  [ 429, { "content-type" => "application/json" }, [ body ] ]
end

Rack::Attack.throttled_responder = too_many_requests
Rack::Attack.blocklisted_responder = too_many_requests

# Polling every ten seconds is normal; this leaves room for a few tabs while
# still bounding a script.
Rack::Attack.throttle(
  "family progress by ip",
  limit: ENV.fetch("RACK_ATTACK_FAMILY_LIMIT", 30).to_i,
  period: 1.minute
) do |request|
  request.ip if request.path_info.start_with?("/api/v1/family")
end

# The family page records one session per page load, never on the ten-second
# poll. A much tighter limit than page polling keeps session logging from
# becoming a way to track a household across visits.
Rack::Attack.throttle(
  "family session by ip",
  limit: ENV.fetch("RACK_ATTACK_SESSION_LIMIT", 20).to_i,
  period: 1.hour
) do |request|
  if request.post? && request.path_info.match?(%r{\A/api/v1/family/[^/]+/session\z})
    request.ip
  end
end

# Guessing a tracking code is the one realistic attack on the family endpoint.
# The controller records each unknown code through FamilyGuard; after
# RACK_ATTACK_FAMILY_MISS_LIMIT misses in ten minutes the IP is blocked for an
# hour. Requests that find a real episode never count.
Rack::Attack.blocklist("family code guessing") do |request|
  request.path_info.start_with?("/api/v1/family") && FamilyGuard.banned?(request.ip)
end

# Staff endpoints are not public, but a runaway client still deserves a bound.
Rack::Attack.throttle(
  "staff by ip",
  limit: ENV.fetch("RACK_ATTACK_STAFF_LIMIT", 600).to_i,
  period: 1.hour
) do |request|
  if request.path_info.start_with?(
    "/api/v1/episodes",
    "/api/v1/inquiries",
    "/api/v1/settings",
    "/api/v1/procedure_templates"
  )
    request.ip
  end
end
