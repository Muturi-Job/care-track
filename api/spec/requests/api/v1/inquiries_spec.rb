require "rails_helper"

RSpec.describe "Inquiry capture endpoints", type: :request do
  let(:episode) { create(:episode) }

  def log_inquiry(episode, key: "tap-1", channel: "phone")
    post "/api/v1/episodes/#{episode.id}/inquiries",
         params: { channel: channel },
         headers: { "Idempotency-Key" => key }
  end

  describe "POST /api/v1/episodes/:id/inquiries" do
    it "creates an inquiry and returns the updated count" do
      expect { log_inquiry(episode) }.to change(Inquiry, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(response.parsed_body["inquiry_count"]).to eq(1)
      expect(response.parsed_body["id"]).to eq(Inquiry.last.id.to_s)

      inquiry = Inquiry.last
      expect(inquiry.episode_id).to eq(episode.id)
      expect(inquiry.channel).to eq("phone")
    end

    it "counts only inquiries for that episode" do
      create(:inquiry, episode: episode)
      create(:inquiry)

      log_inquiry(episode)

      expect(response.parsed_body["inquiry_count"]).to eq(2)
    end

    it "accepts each valid channel" do
      %w[phone desk ward other].each_with_index do |channel, index|
        log_inquiry(episode, key: "tap-#{index}", channel: channel)

        expect(response).to have_http_status(:created)
      end

      expect(episode.inquiries.count).to eq(4)
    end

    it "rejects an unknown channel and stores nothing" do
      expect do
        log_inquiry(episode, channel: "email")
      end.not_to change(Inquiry, :count)

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to eq("invalid_channel")
    end

    it "requires an Idempotency-Key" do
      post "/api/v1/episodes/#{episode.id}/inquiries", params: { channel: "phone" }

      expect(response).to have_http_status(:bad_request)
      expect(response.parsed_body["error"]).to eq("idempotency_key_required")
      expect(Inquiry.count).to eq(0)
    end

    it "rejects an over-long Idempotency-Key" do
      log_inquiry(episode, key: "k" * 101)

      expect(response).to have_http_status(:bad_request)
      expect(response.parsed_body["error"]).to eq("invalid_idempotency_key")
      expect(Inquiry.count).to eq(0)
    end

    it "logs one inquiry when the same key is sent twice" do
      log_inquiry(episode, key: "double-tap")
      first_id = response.parsed_body["id"]

      expect do
        log_inquiry(episode, key: "double-tap")
      end.not_to change(Inquiry, :count)

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["id"]).to eq(first_id)
      expect(response.parsed_body["inquiry_count"]).to eq(1)
    end

    it "returns 409 when the key belongs to another episode" do
      other = create(:episode)
      log_inquiry(other, key: "shared")

      log_inquiry(episode, key: "shared")

      expect(response).to have_http_status(:conflict)
      expect(response.parsed_body["error"]).to eq("idempotency_conflict")
      expect(episode.inquiries.count).to eq(0)
    end

    it "returns 404 for an unknown episode" do
      post "/api/v1/episodes/#{SecureRandom.uuid}/inquiries",
           params: { channel: "phone" },
           headers: { "Idempotency-Key" => "tap-1" }

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "DELETE /api/v1/inquiries/:id" do
    it "removes an inquiry inside the two-minute window" do
      inquiry = create(:inquiry, episode: episode, logged_at: 30.seconds.ago)

      expect do
        delete "/api/v1/inquiries/#{inquiry.id}"
      end.to change(Inquiry, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end

    it "refuses to remove an inquiry older than two minutes" do
      inquiry = create(:inquiry, episode: episode, logged_at: 3.minutes.ago)

      expect do
        delete "/api/v1/inquiries/#{inquiry.id}"
      end.not_to change(Inquiry, :count)

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to eq("undo_window_expired")
    end

    it "returns 404 for an unknown inquiry" do
      delete "/api/v1/inquiries/#{SecureRandom.uuid}"

      expect(response).to have_http_status(:not_found)
    end
  end
end
