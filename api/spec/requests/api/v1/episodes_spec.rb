require "rails_helper"

RSpec.describe "API episode endpoints", type: :request do
  def episode_json
    response.parsed_body["episode"]
  end

  describe "GET /api/v1/episodes" do
    it "lists active episodes with the fields the staff list needs" do
      create(:episode, patient_alias: "Patient A", current_stage_position: 2)

      get "/api/v1/episodes"

      expect(response).to have_http_status(:ok)
      payload = response.parsed_body["episodes"].first
      expect(payload).to include(
        "patient_alias" => "Patient A",
        "stage_label" => "Preparing",
        "is_final_stage" => false,
        "next_stage_label" => "Discharged",
        "expected_minutes" => 20,
        "status_flag" => "normal",
        "current_stage_position" => 2
      )
      expect(payload["minutes_in_current_stage"]).to be_a(Integer)
      expect(payload["tracking_code"]).to be_present
      expect(payload["family_path"]).to eq("/f/#{payload['tracking_code']}")
      expect(payload).not_to have_key("history")
    end

    it "excludes discharged episodes" do
      create(:episode, patient_alias: "Patient Gone", discharged_at: 1.hour.ago)
      create(:episode, patient_alias: "Patient Here")

      get "/api/v1/episodes"

      expect(response.parsed_body["episodes"].map { |e| e["patient_alias"] })
        .to eq([ "Patient Here" ])
    end

    it "puts flagged and overdue episodes first" do
      create(:episode, patient_alias: "Patient Normal", current_stage_position: 1)
      create(:episode,
             patient_alias: "Patient Delayed",
             status_flag: "delayed",
             delay_reason: "awaiting_bed")
      overdue = create(:episode, patient_alias: "Patient Overdue", current_stage_position: 1)
      create(:stage_event,
             episode: overdue,
             stage_template: overdue.current_stage_template,
             event_type: "advanced",
             occurred_at: 3.hours.ago)

      get "/api/v1/episodes"

      expect(response.parsed_body["episodes"].map { |e| e["patient_alias"] })
        .to eq([ "Patient Delayed", "Patient Overdue", "Patient Normal" ])
    end

    it "treats an episode past its expected minutes as overdue" do
      create(:episode, patient_alias: "Patient Fresh")

      get "/api/v1/episodes"

      expect(response.parsed_body["episodes"].first["minutes_overdue"]).to eq(0)
    end

    it "searches by alias or bed, case-insensitively" do
      create(:episode, patient_alias: "Patient A", ward_or_bed: "Ward 3, Bed 2")
      create(:episode, patient_alias: "Patient B", ward_or_bed: "Ward 5, Bed 8")

      get "/api/v1/episodes", params: { q: "patient b" }
      expect(response.parsed_body["episodes"].map { |e| e["patient_alias"] }).to eq([ "Patient B" ])

      get "/api/v1/episodes", params: { q: "bed 2" }
      expect(response.parsed_body["episodes"].map { |e| e["patient_alias"] }).to eq([ "Patient A" ])
    end

    it "treats LIKE wildcards in the query literally" do
      create(:episode, patient_alias: "Patient A")

      get "/api/v1/episodes", params: { q: "%" }

      expect(response.parsed_body["episodes"]).to eq([])
    end
  end

  describe "GET /api/v1/episodes/:id" do
    it "returns one episode with its stage history, newest first" do
      episode = create(:episode, patient_alias: "Patient A", current_stage_position: 2)
      create(:stage_event,
             episode: episode,
             stage_template: episode.current_stage_template,
             event_type: "advanced",
             occurred_at: 5.minutes.ago)

      get "/api/v1/episodes/#{episode.id}"

      expect(response).to have_http_status(:ok)
      payload = episode_json
      expect(payload["patient_alias"]).to eq("Patient A")
      expect(payload["history"].first).to include(
        "event_type" => "advanced",
        "stage_label" => "Preparing",
        "stage_position" => 2
      )
      expect(payload["history"].first["occurred_at"]).to be_present
    end

    it "returns 404 for an unknown episode" do
      get "/api/v1/episodes/#{SecureRandom.uuid}"

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/episodes" do
    it "creates an episode and returns its tracking code and family link" do
      template = create(:procedure_template)

      post "/api/v1/episodes", params: {
        episode: {
          patient_alias: "Patient A",
          ward_or_bed: "Ward 3, Bed 2",
          procedure_template_id: template.id
        }
      }

      expect(response).to have_http_status(:created)
      payload = episode_json
      expect(payload["tracking_code"]).to match(/\A[A-HJ-NP-Z2-9]{10}\z/)
      expect(payload["family_path"]).to eq("/f/#{payload['tracking_code']}")
      expect(payload["current_stage_position"]).to eq(1)
      expect(payload["stage_label"]).to eq("Admitted")
      expect(payload["history"]).to eq([])
    end

    it "accepts a bare body without the episode wrapper" do
      template = create(:procedure_template)

      post "/api/v1/episodes", params: {
        patient_alias: "Patient B",
        ward_or_bed: "Ward 1",
        procedure_template_id: template.id
      }

      expect(response).to have_http_status(:created)
    end

    it "disables creation when STAFF_CREATION_ENABLED is false" do
      previous_value = ENV["STAFF_CREATION_ENABLED"]
      ENV["STAFF_CREATION_ENABLED"] = "false"
      template = create(:procedure_template)

      expect do
        post "/api/v1/episodes", params: {
          episode: {
            patient_alias: "Patient B",
            ward_or_bed: "Ward 1",
            procedure_template_id: template.id
          }
        }
      end.not_to change(Episode, :count)

      expect(response).to have_http_status(:not_found)
      expect(response.parsed_body["error"]).to eq("staff_creation_disabled")
    ensure
      if previous_value.nil?
        ENV.delete("STAFF_CREATION_ENABLED")
      else
        ENV["STAFF_CREATION_ENABLED"] = previous_value
      end
    end

    it "rejects a missing alias" do
      template = create(:procedure_template)

      post "/api/v1/episodes", params: {
        episode: { ward_or_bed: "Ward 3", procedure_template_id: template.id }
      }

      expect(response).to have_http_status(422)
      expect(response.parsed_body["error"]).to eq("invalid_episode")
      expect(response.parsed_body["details"]).to have_key("patient_alias")
    end
  end

  describe "PATCH /api/v1/episodes/:id" do
    it "updates the alias and bed but not the procedure" do
      episode = create(:episode, patient_alias: "Patient A", ward_or_bed: "Ward 1")
      other_template = create(:procedure_template)

      patch "/api/v1/episodes/#{episode.id}", params: {
        episode: {
          patient_alias: "Patient Z",
          ward_or_bed: "Ward 9, Bed 1",
          procedure_template_id: other_template.id
        }
      }

      expect(response).to have_http_status(:ok)
      episode.reload
      expect(episode.patient_alias).to eq("Patient Z")
      expect(episode.ward_or_bed).to eq("Ward 9, Bed 1")
      expect(episode.procedure_template_id).not_to eq(other_template.id)
    end

    it "rejects a blank alias" do
      episode = create(:episode)

      patch "/api/v1/episodes/#{episode.id}", params: { episode: { patient_alias: "" } }

      expect(response).to have_http_status(422)
    end

    it "returns 404 for an unknown episode" do
      patch "/api/v1/episodes/#{SecureRandom.uuid}", params: { episode: { patient_alias: "Nobody" } }

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/episodes/:id/advance" do
    it "advances and returns the new stage with history" do
      episode = create(:episode, current_stage_position: 1)

      post "/api/v1/episodes/#{episode.id}/advance", headers: { "Idempotency-Key" => "tap-1" }

      expect(response).to have_http_status(:ok)
      expect(episode_json["current_stage_position"]).to eq(2)
      expect(episode_json["stage_label"]).to eq("Preparing")
      expect(episode_json["history"].first).to include(
        "event_type" => "advanced",
        "stage_label" => "Preparing",
        "stage_position" => 2
      )
    end

    it "writes no second event when the same key is retried" do
      episode = create(:episode, current_stage_position: 1)

      post "/api/v1/episodes/#{episode.id}/advance", headers: { "Idempotency-Key" => "tap-1" }
      post "/api/v1/episodes/#{episode.id}/advance", headers: { "Idempotency-Key" => "tap-1" }

      expect(response).to have_http_status(:ok)
      expect(episode_json["current_stage_position"]).to eq(2)
      expect(StageEvent.where(episode_id: episode.id, event_type: "advanced").count).to eq(1)
    end

    it "records the device that made the change" do
      episode = create(:episode, current_stage_position: 1)

      post "/api/v1/episodes/#{episode.id}/advance",
           headers: { "Idempotency-Key" => "tap-1", "X-Device-Id" => "ipad-ward-3" }

      expect(StageEvent.where(episode_id: episode.id, event_type: "advanced").last.recorded_by_device)
        .to eq("ipad-ward-3")
    end

    it "requires an Idempotency-Key header" do
      episode = create(:episode, current_stage_position: 1)

      post "/api/v1/episodes/#{episode.id}/advance"

      expect(response).to have_http_status(:bad_request)
      expect(response.parsed_body["error"]).to eq("idempotency_key_required")
      expect(episode.reload.current_stage_position).to eq(1)
    end

    it "sets discharge and link expiry at the terminal stage" do
      episode = create(:episode, current_stage_position: 2)

      post "/api/v1/episodes/#{episode.id}/advance", headers: { "Idempotency-Key" => "tap-1" }

      payload = episode_json
      expect(payload["current_stage_position"]).to eq(3)
      expect(payload["discharged_at"]).to be_present
      expect(payload["link_expires_at"]).to be_present
    end

    it "refuses to advance past the terminal stage" do
      episode = create(:episode, current_stage_position: 3)

      post "/api/v1/episodes/#{episode.id}/advance", headers: { "Idempotency-Key" => "tap-1" }

      expect(response).to have_http_status(422)
      expect(response.parsed_body["error"]).to eq("terminal_stage")
    end

    it "reports the final stage with no next stage" do
      episode = create(:episode, current_stage_position: 2)

      post "/api/v1/episodes/#{episode.id}/advance", headers: { "Idempotency-Key" => "tap-1" }

      expect(episode_json["is_final_stage"]).to be(true)
      expect(episode_json["next_stage_label"]).to be_nil
    end

    it "returns 409 when the key belongs to another episode" do
      first = create(:episode, current_stage_position: 1)
      second = create(:episode, current_stage_position: 1)

      post "/api/v1/episodes/#{first.id}/advance", headers: { "Idempotency-Key" => "shared" }
      post "/api/v1/episodes/#{second.id}/advance", headers: { "Idempotency-Key" => "shared" }

      expect(response).to have_http_status(:conflict)
      expect(response.parsed_body["error"]).to eq("idempotency_conflict")
    end

    it "returns 404 for an unknown episode" do
      post "/api/v1/episodes/#{SecureRandom.uuid}/advance", headers: { "Idempotency-Key" => "tap-1" }

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/episodes/:id/undo" do
    it "reverts a recent advance" do
      episode = create(:episode, current_stage_position: 1)

      post "/api/v1/episodes/#{episode.id}/advance", headers: { "Idempotency-Key" => "tap-1" }
      post "/api/v1/episodes/#{episode.id}/undo"

      expect(response).to have_http_status(:ok)
      expect(episode_json["current_stage_position"]).to eq(1)
      expect(episode_json["history"].first["event_type"]).to eq("undone")
    end

    it "refuses once the advance is older than two minutes" do
      episode = create(:episode, current_stage_position: 2)
      create(:stage_event,
             episode: episode,
             stage_template: episode.current_stage_template,
             event_type: "advanced",
             occurred_at: 3.minutes.ago,
             idempotency_key: "old-tap")

      post "/api/v1/episodes/#{episode.id}/undo"

      expect(response).to have_http_status(422)
      expect(response.parsed_body["error"]).to eq("undo_window_expired")
      expect(episode.reload.current_stage_position).to eq(2)
    end

    it "refuses when there is nothing to undo" do
      episode = create(:episode, current_stage_position: 1)

      post "/api/v1/episodes/#{episode.id}/undo"

      expect(response).to have_http_status(422)
      expect(response.parsed_body["error"]).to eq("nothing_to_undo")
    end
  end

  describe "POST /api/v1/episodes/:id/flag" do
    it "sets a delay flag and records it in history" do
      episode = create(:episode)

      post "/api/v1/episodes/#{episode.id}/flag", params: {
        status_flag: "delayed",
        delay_reason: "theatre_running_behind"
      }

      expect(response).to have_http_status(:ok)
      expect(episode_json["status_flag"]).to eq("delayed")
      expect(episode_json["delay_reason"]).to eq("theatre_running_behind")
      expect(episode_json["history"].first["event_type"]).to eq("flagged")
      expect(episode.reload.current_stage_position).to eq(2)
    end

    it "rejects clearing through the flag endpoint" do
      episode = create(:episode)

      post "/api/v1/episodes/#{episode.id}/flag", params: { status_flag: "normal" }

      expect(response).to have_http_status(422)
      expect(response.parsed_body["error"]).to eq("invalid_status")
    end

    it "rejects an unknown delay reason" do
      episode = create(:episode)

      post "/api/v1/episodes/#{episode.id}/flag", params: {
        status_flag: "delayed",
        delay_reason: "traffic"
      }

      expect(response).to have_http_status(422)
      expect(response.parsed_body["error"]).to eq("validation_failed")
    end
  end

  describe "POST /api/v1/episodes/:id/flag/clear" do
    it "clears the flag and records it in history" do
      episode = create(:episode, status_flag: "delayed", delay_reason: "awaiting_bed")

      post "/api/v1/episodes/#{episode.id}/flag/clear"

      expect(response).to have_http_status(:ok)
      expect(episode_json["status_flag"]).to eq("normal")
      expect(episode_json["delay_reason"]).to be_nil
      expect(episode_json["history"].first["event_type"]).to eq("flag_cleared")
    end

    it "keeps the earlier flag detail after the flag is cleared" do
      episode = create(:episode)

      post "/api/v1/episodes/#{episode.id}/flag",
           params: { status_flag: "delayed", delay_reason: "awaiting_bed" }
      post "/api/v1/episodes/#{episode.id}/flag/clear"
      get "/api/v1/episodes/#{episode.id}"

      history = episode_json["history"]
      flagged = history.find { |event| event["event_type"] == "flagged" }
      cleared = history.find { |event| event["event_type"] == "flag_cleared" }

      expect(flagged).to include("status_flag" => "delayed", "delay_reason" => "awaiting_bed")
      expect(cleared).to include("status_flag" => "normal", "delay_reason" => nil)
    end
  end
end
