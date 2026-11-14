require "rails_helper"

RSpec.describe "GET /api/v1/procedure_templates", type: :request do
  it "lists templates with their stages in order" do
    create(:procedure_template, name: "Day Surgery")

    get "/api/v1/procedure_templates"

    expect(response).to have_http_status(:ok)

    payload = response.parsed_body["procedure_templates"].first
    expect(payload["name"]).to eq("Day Surgery")
    expect(payload["active"]).to be(true)
    expect(payload["stages"].map { |stage| stage["position"] }).to eq([ 1, 2, 3 ])
    expect(payload["stages"].last["is_terminal"]).to be(true)
    expect(payload["stages"].first).to include(
      "label" => "Admitted",
      "expected_minutes" => 20
    )
    expect(payload["stages"].first["family_explanation"]).to be_present
  end

  it "orders templates by name" do
    create(:procedure_template, name: "Orthopaedic Surgery")
    create(:procedure_template, name: "Day Surgery")

    get "/api/v1/procedure_templates"

    expect(response.parsed_body["procedure_templates"].map { |t| t["name"] })
      .to eq([ "Day Surgery", "Orthopaedic Surgery" ])
  end

  it "returns an empty list when there are no templates" do
    get "/api/v1/procedure_templates"

    expect(response.parsed_body["procedure_templates"]).to eq([])
  end
end
