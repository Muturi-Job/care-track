require "rails_helper"

RSpec.describe "Family endpoint throttling", type: :request do
  around do |example|
    previous = Rack::Attack.enabled
    Rack::Attack.enabled = true
    begin
      example.run
    ensure
      Rack::Attack.enabled = previous
    end
  end

  before { Rack::Attack.cache.store.clear }

  let(:episode) { create(:episode) }

  def fetch_page(code, from_ip:)
    get "/api/v1/family/#{code}", headers: { "REMOTE_ADDR" => from_ip }
  end

  describe "request rate" do
    it "throttles one IP that asks more often than the limit" do
      limit = ENV.fetch("RACK_ATTACK_FAMILY_LIMIT", 30).to_i

      limit.times do
        fetch_page(episode.tracking_code, from_ip: "203.0.113.10")
        expect(response).to have_http_status(:ok)
      end

      fetch_page(episode.tracking_code, from_ip: "203.0.113.10")

      expect(response).to have_http_status(:too_many_requests)
      expect(response.parsed_body["error"]).to include("Too many requests")
    end

    it "leaves other IPs alone" do
      limit = ENV.fetch("RACK_ATTACK_FAMILY_LIMIT", 30).to_i

      limit.times { fetch_page(episode.tracking_code, from_ip: "203.0.113.11") }
      fetch_page(episode.tracking_code, from_ip: "203.0.113.11")
      expect(response).to have_http_status(:too_many_requests)

      fetch_page(episode.tracking_code, from_ip: "203.0.113.12")

      expect(response).to have_http_status(:ok)
    end
  end

  describe "repeated unknown codes" do
    it "blocks an IP that keeps guessing, even for a real link afterwards" do
      allow(FamilyGuard).to receive(:max_misses).and_return(3)

      3.times do
        fetch_page("ZZZZZZZZZZ", from_ip: "203.0.113.20")
        expect(response).to have_http_status(:not_found)
      end

      fetch_page(episode.tracking_code, from_ip: "203.0.113.20")

      expect(response).to have_http_status(:too_many_requests)
      expect(response.parsed_body["error"]).to include("Too many requests")
    end

    it "bans only the IP that guessed" do
      allow(FamilyGuard).to receive(:max_misses).and_return(1)

      fetch_page("ZZZZZZZZZZ", from_ip: "203.0.113.30")
      fetch_page("ZZZZZZZZZZ", from_ip: "203.0.113.30")
      expect(response).to have_http_status(:too_many_requests)

      fetch_page(episode.tracking_code, from_ip: "203.0.113.31")

      expect(response).to have_http_status(:ok)
    end

    it "never counts a real link as a guess" do
      allow(FamilyGuard).to receive(:max_misses).and_return(2)

      5.times do
        fetch_page(episode.tracking_code, from_ip: "203.0.113.40")
        expect(response).to have_http_status(:ok)
      end
    end

    it "does not count an expired link as a guess" do
      allow(FamilyGuard).to receive(:max_misses).and_return(1)
      episode.update!(link_expires_at: 1.hour.ago)

      2.times do
        fetch_page(episode.tracking_code, from_ip: "203.0.113.50")
        expect(response).to have_http_status(:gone)
      end
    end
  end
end
