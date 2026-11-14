require "rails_helper"

RSpec.describe "GET /api/v1/family/:tracking_code", type: :request do
  before { Rack::Attack.cache.store.clear }

  let(:episode) { create(:episode, patient_alias: "Patient A", current_stage_position: 2) }

  def payload
    response.parsed_body
  end

  def fetch_page(code, headers: {})
    get "/api/v1/family/#{code}", headers: headers
  end

  def stage_templates
    episode.procedure_template.stage_templates
  end

  describe "the payload" do
    it "contains only the fields the progress page renders" do
      fetch_page(episode.tracking_code)

      expect(response).to have_http_status(:ok)
      expect(payload.keys).to match_array(
        %w[
          patient_alias procedure stages current_stage special_status
          what_happens_next expected_duration last_updated_at
          hospital_contact hospital_visiting
        ]
      )
    end

    it "sends no ids, bed numbers, tracking code or staff detail" do
      fetch_page(episode.tracking_code)

      expect(response.body).not_to include(episode.id)
      expect(response.body).not_to include(episode.ward_or_bed)
      expect(response.body).not_to include(episode.tracking_code)
      expect(response.body).not_to include("Bed")
    end

    it "names the patient alias and the procedure" do
      fetch_page(episode.tracking_code)

      expect(payload["patient_alias"]).to eq("Patient A")
      expect(payload["procedure"]).to eq(episode.procedure_template.name)
    end

    it "marks stages done, current and upcoming around the current one" do
      fetch_page(episode.tracking_code)

      expect(payload["stages"].map { |stage| stage["state"] })
        .to eq(%w[done current upcoming])
      expect(payload["stages"].map { |stage| stage["label"] })
        .to eq([ "Admitted", "Preparing", "Discharged" ])
      expect(payload["stages"].first.keys)
        .to match_array(%w[label family_explanation state])
      expect(payload["current_stage"]).to eq(payload["stages"][1])
    end

    it "gives a range rather than one expected time" do
      fetch_page(episode.tracking_code)

      expect(payload["expected_duration"]).to eq("min_minutes" => 15, "max_minutes" => 25)
    end

    it "widens the range with the stage's expected time" do
      stage_templates.find_by(position: 2).update!(expected_minutes: 45)

      fetch_page(episode.tracking_code)

      expect(payload["expected_duration"]).to eq("min_minutes" => 35, "max_minutes" => 55)
    end

    it "has no range when the stage has no expected time" do
      stage_templates.find_by(position: 2).update!(expected_minutes: nil)

      fetch_page(episode.tracking_code)

      expect(payload["expected_duration"]).to be_nil
    end

    it "describes what happens next from the next stage's wording" do
      stage_templates.find_by(position: 3)
                    .update!(family_explanation: "They are ready to leave when you arrive.")

      fetch_page(episode.tracking_code)

      expect(payload["what_happens_next"]).to eq("They are ready to leave when you arrive.")
    end

    it "uses the final-step copy at the last stage" do
      episode.update!(current_stage_position: 3)

      fetch_page(episode.tracking_code)

      expect(payload["what_happens_next"]).to eq(FamilyMessageCatalog.message(:final_stage))
    end

    it "has no special status when the episode is normal" do
      fetch_page(episode.tracking_code)

      expect(payload["special_status"]).to be_nil
    end

    it "carries the approved wording for a delay, never the raw reason" do
      episode.update!(status_flag: "delayed", delay_reason: "awaiting_bed")

      fetch_page(episode.tracking_code)

      expect(payload["special_status"]).to eq(
        "kind" => "delayed",
        "message" => FamilyMessageCatalog.for_status("delayed")
      )
      expect(response.body).not_to include("awaiting_bed")
    end

    it "carries the approved wording for call_care_team" do
      episode.update!(status_flag: "call_care_team")

      fetch_page(episode.tracking_code)

      expect(payload["special_status"]).to eq(
        "kind" => "call_care_team",
        "message" => FamilyMessageCatalog.for_status("call_care_team")
      )
    end

    it "reports when the page was last updated" do
      fetch_page(episode.tracking_code)

      expect(payload["last_updated_at"]).to eq(episode.updated_at.utc.iso8601)
    end

    it "reads contact and visiting text from the environment" do
      allow(ENV).to receive(:fetch).and_call_original
      allow(ENV).to receive(:fetch).with("HOSPITAL_CONTACT_PHONE", anything)
        .and_return("0123 456 7890")
      allow(ENV).to receive(:fetch).with("HOSPITAL_CONTACT_TEXT", anything)
        .and_return("Day Surgery Unit reception")
      allow(ENV).to receive(:fetch).with("HOSPITAL_VISITING_TEXT", anything)
        .and_return("Visiting is from 2pm to 8pm.")

      fetch_page(episode.tracking_code)

      expect(payload["hospital_contact"]).to eq(
        "phone" => "0123 456 7890",
        "text" => "Day Surgery Unit reception"
      )
      expect(payload["hospital_visiting"]).to eq("Visiting is from 2pm to 8pm.")
    end
  end

  describe "unknown and expired links" do
    it "returns 404 with friendly copy for an unknown code" do
      fetch_page("ZZZZZZZZZZ")

      expect(response).to have_http_status(:not_found)
      expect(payload).to eq(
        "error" => "not_found",
        "message" => FamilyMessageCatalog.message(:link_not_found)
      )
    end

    it "returns 404 for a malformed code" do
      fetch_page("not-a-code")

      expect(response).to have_http_status(:not_found)
    end

    it "returns 410 with friendly copy once the link has expired" do
      episode.update!(link_expires_at: 1.hour.ago)

      fetch_page(episode.tracking_code)

      expect(response).to have_http_status(:gone)
      expect(payload).to eq(
        "error" => "link_expired",
        "message" => FamilyMessageCatalog.message(:link_expired)
      )
    end
  end

  describe "ETag" do
    it "answers a matching If-None-Match with 304 and no body" do
      fetch_page(episode.tracking_code)
      etag = response.headers["ETag"]

      expect(etag).to be_present

      fetch_page(episode.tracking_code, headers: { "If-None-Match" => etag })

      expect(response).to have_http_status(:not_modified)
      expect(response.body).to be_empty
    end

    it "keeps the same ETag until something changes" do
      fetch_page(episode.tracking_code)
      first = response.headers["ETag"]

      fetch_page(episode.tracking_code)

      expect(response.headers["ETag"]).to eq(first)
    end

    it "changes the ETag when the episode changes" do
      fetch_page(episode.tracking_code)
      first = response.headers["ETag"]

      episode.update!(patient_alias: "Patient Z")

      fetch_page(episode.tracking_code, headers: { "If-None-Match" => first })

      expect(response).to have_http_status(:ok)
      expect(response.headers["ETag"]).not_to eq(first)
      expect(payload["patient_alias"]).to eq("Patient Z")
    end
  end
end
