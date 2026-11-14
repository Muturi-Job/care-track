# Rate limiting (CLAUDE.md rule 3). Family members reach an episode through a
# long random tracking code, so the family endpoint is throttled per IP to make
# code guessing impractical.
#
# Limits come from the environment (.env.example):
#   RACK_ATTACK_ENABLED       toggle, default on
#   RACK_ATTACK_FAMILY_LIMIT  requests per IP per hour, default 60
#   RACK_ATTACK_STAFF_LIMIT   requests per IP per hour, default 600
#
# Rack::Attack is not authentication: it slows brute force, it does not decide
# who may see what.

Rack::Attack.enabled = ENV.fetch("RACK_ATTACK_ENABLED", "true") != "false"

Rack::Attack.throttled_responder = lambda do |_request|
  body = { error: "Too many requests. Please call the care team." }.to_json
  [ 429, { "content-type" => "application/json" }, [ body ] ]
end

# The family endpoint arrives in Phase B; the throttle is defined now so it
# cannot ship unprotected.
Rack::Attack.throttle(
  "family progress by ip",
  limit: ENV.fetch("RACK_ATTACK_FAMILY_LIMIT", 60).to_i,
  period: 1.hour
) do |request|
  request.ip if request.path.start_with?("/api/v1/family/")
end
