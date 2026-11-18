require "rails_helper"

RSpec.describe "Family session capture", type: :request do
  let(:episode) { create(:episode) }

  def record_session(code, session_id:, from_ip: "203.0.113.60")
    post "/api/v1/family/#{code}/session",
         params: { session_id: session_id },
         headers: { "REMOTE_ADDR" => from_ip, "HTTP_USER_AGENT" => "RSpec browser" }
  end

  describe "POST /api/v1/family/:tracking_code/session" do
    it "creates one family session for a known code" do
      expect do
        record_session(episode.tracking_code, session_id: "session-1")
      end.to change(FamilySession, :count).by(1)

      expect(response).to have_http_status(:no_content)
      expect(response.body).to be_blank

      session = FamilySession.last
      expect(session.episode_id).to eq(episode.id)
      expect(session.session_id).to eq("session-1")
      expect(session.first_seen_at).to be_present
      expect(session.last_seen_at).to be_present
    end

    it "touches last_seen_at without creating a second row" do
      original = create(
        :family_session,
        episode: episode,
        session_id: "session-1",
        first_seen_at: 1.hour.ago,
        last_seen_at: 1.hour.ago
      )
      previous_last_seen = original.last_seen_at

      expect do
        record_session(episode.tracking_code, session_id: "session-1")
      end.not_to change(FamilySession, :count)

      expect(response).to have_http_status(:no_content)
      expect(original.reload.last_seen_at).to be > previous_last_seen
      expect(original.first_seen_at).to be_within(2.seconds).of(1.hour.ago)
    end

    it "stores no IP address or user agent" do
      record_session(episode.tracking_code, session_id: "session-1")

      attributes = FamilySession.last.attributes
      expect(attributes.keys).not_to include("ip", "ip_address", "remote_ip", "user_agent")
      expect(attributes.values).not_to include("203.0.113.60", "RSpec browser")
    end

    it "returns the same empty 204 for an unknown code and stores nothing" do
      expect do
        record_session("ZZZZZZZZZZ", session_id: "session-1")
      end.not_to change(FamilySession, :count)

      expect(response).to have_http_status(:no_content)
      expect(response.body).to be_blank
    end

    it "returns 204 for an expired link and stores nothing" do
      episode.update!(link_expires_at: 1.hour.ago)

      expect do
        record_session(episode.tracking_code, session_id: "session-1")
      end.not_to change(FamilySession, :count)

      expect(response).to have_http_status(:no_content)
    end

    it "requires a session id" do
      record_session(episode.tracking_code, session_id: "")

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to eq("invalid_session_id")
      expect(FamilySession.count).to eq(0)
    end

    it "rejects a session id longer than 36 characters" do
      record_session(episode.tracking_code, session_id: "a" * 37)

      expect(response).to have_http_status(:unprocessable_entity)
      expect(FamilySession.count).to eq(0)
    end

    it "validates the session id before the code lookup, so it does not leak existence" do
      record_session(episode.tracking_code, session_id: "a" * 37)
      known_status = response.status
      known_body = response.body

      record_session("ZZZZZZZZZZ", session_id: "a" * 37)

      expect(response.status).to eq(known_status)
      expect(response.body).to eq(known_body)
    end
  end

  describe "rate limiting" do
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

    it "throttles a client that pings more often than the limit" do
      limit = ENV.fetch("RACK_ATTACK_SESSION_LIMIT", 20).to_i

      limit.times do |index|
        record_session(episode.tracking_code, session_id: "session-#{index}", from_ip: "203.0.113.70")
        expect(response).to have_http_status(:no_content)
      end

      record_session(episode.tracking_code, session_id: "one-too-many", from_ip: "203.0.113.70")

      expect(response).to have_http_status(:too_many_requests)
    end

    it "leaves other IPs alone" do
      limit = ENV.fetch("RACK_ATTACK_SESSION_LIMIT", 20).to_i

      limit.times do |index|
        record_session(episode.tracking_code, session_id: "session-#{index}", from_ip: "203.0.113.71")
      end
      record_session(episode.tracking_code, session_id: "one-too-many", from_ip: "203.0.113.71")
      expect(response).to have_http_status(:too_many_requests)

      record_session(episode.tracking_code, session_id: "session-ok", from_ip: "203.0.113.72")

      expect(response).to have_http_status(:no_content)
    end
  end
end
