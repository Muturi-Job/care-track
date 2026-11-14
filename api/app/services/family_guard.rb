# Counts family requests that miss, so a client guessing tracking codes is
# banned for a while (Rack::Attack, config/initializers/rack_attack.rb).
#
# A hit on a real link is never a miss, so normal family use — even polling
# every ten seconds — cannot trigger this. The state lives in Rails.cache and
# the thresholds come from the environment (.env.example).
class FamilyGuard
  MISS_LIMIT_ENV = "RACK_ATTACK_FAMILY_MISS_LIMIT"
  DEFAULT_MISS_LIMIT = 10
  MISS_WINDOW = 10.minutes
  BAN_WINDOW = 1.hour

  class << self
    # Records one unknown-code request. Returns true once the IP is banned.
    def record_miss(ip)
      Rack::Attack::Fail2Ban.filter(discriminator(ip), options) { true }
    end

    # Read-only: the blocklist asks this before the request is served.
    def banned?(ip)
      Rack::Attack::Fail2Ban.banned?(discriminator(ip))
    end

    def max_misses
      [ ENV.fetch(MISS_LIMIT_ENV, DEFAULT_MISS_LIMIT).to_i, 1 ].max
    end

    private

    def options
      { maxretry: max_misses, findtime: MISS_WINDOW, bantime: BAN_WINDOW }
    end

    def discriminator(ip)
      "family-miss:#{ip}"
    end
  end
end
