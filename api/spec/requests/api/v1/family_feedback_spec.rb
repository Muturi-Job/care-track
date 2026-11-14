require "rails_helper"

RSpec.describe "POST /api/v1/family/:tracking_code/feedback", type: :request do
  before { Rack::Attack.cache.store.clear }

  let(:episode) { create(:episode) }

  def send_feedback(code, params = {})
    post "/api/v1/family/#{code}/feedback", params: params
  end

  it "stores the answer with the tracking code and nothing else" do
    send_feedback(episode.tracking_code, answer: "yes")

    expect(response).to have_http_status(:created)
    feedback = FeedbackResponse.last
    expect(feedback.tracking_code).to eq(episode.tracking_code)
    expect(feedback.answer).to eq("yes")
    expect(feedback.attributes.keys).to match_array(%w[id tracking_code answer created_at])
  end

  it "accepts each of the three answers" do
    %w[yes somewhat no].each do |answer|
      send_feedback(episode.tracking_code, answer: answer)

      expect(response).to have_http_status(:created)
    end

    expect(FeedbackResponse.where(tracking_code: episode.tracking_code).count).to eq(3)
  end

  it "returns no patient data" do
    send_feedback(episode.tracking_code, answer: "somewhat")

    expect(response.body).not_to include(episode.tracking_code)
    expect(response.body).not_to include(episode.patient_alias)
    expect(response.parsed_body).to eq("received" => true)
  end

  it "rejects an answer that is not one of the three" do
    send_feedback(episode.tracking_code, answer: "maybe")

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body["error"]).to eq("invalid_answer")
    expect(FeedbackResponse.count).to eq(0)
  end

  it "requires an answer" do
    send_feedback(episode.tracking_code)

    expect(response).to have_http_status(:unprocessable_entity)
    expect(FeedbackResponse.count).to eq(0)
  end

  it "returns the friendly 404 copy for an unknown code and stores nothing" do
    send_feedback("ZZZZZZZZZZ", answer: "yes")

    expect(response).to have_http_status(:not_found)
    expect(response.parsed_body["message"]).to eq(FamilyMessageCatalog.message(:link_not_found))
    expect(FeedbackResponse.count).to eq(0)
  end

  it "returns 410 once the link has expired and stores nothing" do
    episode.update!(link_expires_at: 1.hour.ago)

    send_feedback(episode.tracking_code, answer: "yes")

    expect(response).to have_http_status(:gone)
    expect(response.parsed_body["message"]).to eq(FamilyMessageCatalog.message(:link_expired))
    expect(FeedbackResponse.count).to eq(0)
  end
end
