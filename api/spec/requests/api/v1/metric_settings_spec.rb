require "rails_helper"

RSpec.describe "Metric settings endpoints", type: :request do
  describe "GET /api/v1/settings/metrics" do
    it "returns the defaults when nothing has been stored" do
      MetricSetting.delete_all

      get "/api/v1/settings/metrics"

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["settings"]).to eq(
        "grace_minutes" => 5,
        "minutes_per_inquiry" => 3,
        "baseline_inquiries_per_episode" => nil,
        "minimum_sample_size" => 5
      )
    end
  end

  describe "PATCH /api/v1/settings/metrics" do
    it "updates the supplied settings and returns all of them" do
      patch "/api/v1/settings/metrics", params: {
        settings: {
          grace_minutes: 10,
          minutes_per_inquiry: 4,
          baseline_inquiries_per_episode: 1.5,
          minimum_sample_size: 8
        }
      }

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["settings"]).to eq(
        "grace_minutes" => 10,
        "minutes_per_inquiry" => 4,
        "baseline_inquiries_per_episode" => 1.5,
        "minimum_sample_size" => 8
      )
      expect(MetricSetting.find_by(key: "grace_minutes").value).to eq("10")
    end

    it "accepts a bare body and updates only the supplied key" do
      patch "/api/v1/settings/metrics", params: { minutes_per_inquiry: 6 }

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["settings"]).to include(
        "grace_minutes" => 5,
        "minutes_per_inquiry" => 6
      )
    end

    it "allows the baseline to be cleared" do
      patch "/api/v1/settings/metrics", params: {
        settings: { baseline_inquiries_per_episode: 2 }
      }
      patch "/api/v1/settings/metrics", params: {
        settings: { baseline_inquiries_per_episode: "" }
      }

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["settings"]["baseline_inquiries_per_episode"]).to be_nil
    end

    it "rejects a value outside its range and changes nothing" do
      patch "/api/v1/settings/metrics", params: {
        settings: { grace_minutes: 10 }
      }

      patch "/api/v1/settings/metrics", params: {
        settings: { grace_minutes: 999 }
      }

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to eq("invalid_settings")
      expect(response.parsed_body["details"]).to have_key("grace_minutes")
      expect(MetricSetting.find_by(key: "grace_minutes").value).to eq("10")
    end

    it "rejects a non-numeric value" do
      patch "/api/v1/settings/metrics", params: {
        settings: { minutes_per_inquiry: "soon" }
      }

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["details"]).to have_key("minutes_per_inquiry")
      expect(MetricSetting.find_by(key: "minutes_per_inquiry")).to be_nil
    end

    it "rejects a blank value for a required setting" do
      patch "/api/v1/settings/metrics", params: {
        settings: { minimum_sample_size: "" }
      }

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["details"]).to have_key("minimum_sample_size")
    end

    it "does not partially save when one of several values is invalid" do
      patch "/api/v1/settings/metrics", params: {
        settings: { grace_minutes: 9, minimum_sample_size: 0 }
      }

      expect(response).to have_http_status(:unprocessable_entity)
      expect(MetricSetting.find_by(key: "grace_minutes")).to be_nil
      expect(MetricSetting.find_by(key: "minimum_sample_size")).to be_nil
    end
  end
end
