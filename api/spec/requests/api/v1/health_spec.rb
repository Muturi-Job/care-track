require "rails_helper"

RSpec.describe "GET /api/v1/health", type: :request do
  it "reports the API and the database as ok" do
    get "/api/v1/health"

    expect(response).to have_http_status(:ok)

    body = response.parsed_body
    expect(body["status"]).to eq("ok")
    expect(body["database"]).to eq("ok")
    expect(body["checked_at"]).to be_present
  end

  it "exposes only the health fields" do
    get "/api/v1/health"

    expect(response.parsed_body.keys).to match_array(%w[status database checked_at])
  end

  it "answers without a tracking code" do
    # Health is public metadata: no patient data, no tracking code required.
    get "/api/v1/health"

    expect(response).to have_http_status(:ok)
  end
end
