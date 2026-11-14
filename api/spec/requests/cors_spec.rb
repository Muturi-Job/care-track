require "rails_helper"

RSpec.describe "CORS", type: :request do
  let(:allowed_origin) { ENV.fetch("CORS_ORIGINS", "http://localhost:3000").split(",").first.strip }

  it "allows the configured web origin" do
    get "/api/v1/health", headers: { "Origin" => allowed_origin }

    expect(response.headers["Access-Control-Allow-Origin"]).to eq(allowed_origin)
  end

  it "does not allow an unknown origin" do
    get "/api/v1/health", headers: { "Origin" => "https://not-the-care-track-app.example" }

    expect(response.headers["Access-Control-Allow-Origin"]).to be_nil
  end
end
