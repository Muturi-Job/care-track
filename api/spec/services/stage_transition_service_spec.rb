require "rails_helper"

RSpec.describe StageTransitionService, type: :model do
  subject(:service) { described_class.new }

  let(:episode) { create(:episode, current_stage_position: 1) }
  let(:now) { Time.current.change(usec: 0) }

  def advance(episode, key: SecureRandom.uuid, now: Time.current)
    service.advance(episode_id: episode.id, idempotency_key: key, now: now)
  end

  def events_of(episode, event_type)
    episode.stage_events.where(event_type: event_type)
  end

  describe "#advance" do
    it "moves to the next stage and records an event" do
      result = advance(episode, key: "tap-1", now: now)

      expect(episode.reload.current_stage_position).to eq(2)
      expect(result.replayed).to be(false)
      expect(result.event.event_type).to eq("advanced")
      expect(result.event.stage_template.position).to eq(2)
      expect(result.event.occurred_at).to be_within(1.millisecond).of(now)
      expect(result.event.idempotency_key).to eq("tap-1")
    end

    it "sets discharge time and link expiry on entering the terminal stage" do
      episode = create(:episode, current_stage_position: 2)

      advance(episode, now: now)
      episode.reload

      expect(episode.current_stage_position).to eq(3)
      expect(episode.discharged_at).to be_within(1.second).of(now)
      expect(episode.link_expires_at).to be_within(1.second).of(now + 7.days)
    end

    it "uses the configured link lifetime" do
      allow(Episode).to receive(:link_ttl).and_return(2.days)
      episode = create(:episode, current_stage_position: 2)

      advance(episode, now: now)

      expect(episode.reload.link_expires_at).to be_within(1.second).of(now + 2.days)
    end

    it "refuses to move past the terminal stage" do
      episode = create(:episode, current_stage_position: 3)

      expect { advance(episode) }.to raise_error(described_class::Rejected) do |error|
        expect(error.code).to eq(:terminal_stage)
        expect(error.http_status).to eq(422)
      end

      expect(events_of(episode.reload, "advanced").count).to eq(0)
    end

    it "replays the same Idempotency-Key without advancing again" do
      advance(episode, key: "tap-1", now: now)
      result = advance(episode, key: "tap-1", now: now + 5.seconds)

      expect(result.replayed).to be(true)
      expect(episode.reload.current_stage_position).to eq(2)
      expect(events_of(episode, "advanced").count).to eq(1)
    end

    it "requires an Idempotency-Key" do
      expect { advance(episode, key: nil) }.to raise_error(described_class::Rejected) do |error|
        expect(error.code).to eq(:idempotency_key_required)
        expect(error.http_status).to eq(:bad_request)
      end

      expect(episode.reload.current_stage_position).to eq(1)
    end

    it "rejects a blank Idempotency-Key" do
      expect { advance(episode, key: "   ") }.to raise_error(described_class::Rejected) do |error|
        expect(error.code).to eq(:idempotency_key_required)
      end
    end

    it "rejects an over-long Idempotency-Key" do
      expect { advance(episode, key: "k" * 101) }.to raise_error(described_class::Rejected) do |error|
        expect(error.code).to eq(:invalid_idempotency_key)
      end
    end

    it "conflicts when the key was already used for another episode" do
      other = create(:episode, current_stage_position: 1)
      advance(other, key: "shared", now: now)

      expect { advance(episode, key: "shared") }.to raise_error(described_class::Rejected) do |error|
        expect(error.code).to eq(:idempotency_conflict)
        expect(error.http_status).to eq(:conflict)
      end

      expect(episode.reload.current_stage_position).to eq(1)
    end
  end

  describe "#undo" do
    it "reverts the latest advance inside the window" do
      advance(episode, now: now)

      result = service.undo(episode_id: episode.id, now: now + 30.seconds)

      expect(episode.reload.current_stage_position).to eq(1)
      expect(result.event.event_type).to eq("undone")
      expect(result.event.stage_template.position).to eq(1)
    end

    it "clears discharge time when leaving the terminal stage" do
      episode = create(:episode, current_stage_position: 2)
      advance(episode, now: now)
      expect(episode.reload.discharged_at).to be_present

      service.undo(episode_id: episode.id, now: now + 30.seconds)

      expect(episode.reload.current_stage_position).to eq(2)
      expect(episode.discharged_at).to be_nil
    end

    it "refuses once two minutes have passed" do
      advance(episode, now: now - 3.minutes)

      expect do
        service.undo(episode_id: episode.id, now: now)
      end.to raise_error(described_class::Rejected) do |error|
        expect(error.code).to eq(:undo_window_expired)
      end
    end

    it "allows undo at just under two minutes" do
      advance(episode, now: now - 119.seconds)

      expect(service.undo(episode_id: episode.id, now: now).event.event_type).to eq("undone")
    end

    it "refuses when there is no advance to undo" do
      expect do
        service.undo(episode_id: episode.id, now: now)
      end.to raise_error(described_class::Rejected) do |error|
        expect(error.code).to eq(:nothing_to_undo)
      end
    end

    it "cannot undo the same advance twice" do
      advance(episode, now: now)
      service.undo(episode_id: episode.id, now: now + 10.seconds)

      expect do
        service.undo(episode_id: episode.id, now: now + 20.seconds)
      end.to raise_error(described_class::Rejected) do |error|
        expect(error.code).to eq(:nothing_to_undo)
      end

      expect(episode.reload.current_stage_position).to eq(1)
    end
  end

  describe "#flag" do
    it "flags a delay with a reason and records an event" do
      result = service.flag(
        episode_id: episode.id,
        status_flag: "delayed",
        delay_reason: "awaiting_bed",
        now: now
      )

      episode.reload
      expect(episode.status_flag).to eq("delayed")
      expect(episode.delay_reason).to eq("awaiting_bed")
      expect(result.event.event_type).to eq("flagged")
      expect(episode.current_stage_position).to eq(1)
    end

    it "flags call_care_team without a reason" do
      service.flag(episode_id: episode.id, status_flag: "call_care_team", now: now)

      expect(episode.reload.status_flag).to eq("call_care_team")
    end

    it "adds no history when the same flag is tapped again" do
      service.flag(
        episode_id: episode.id,
        status_flag: "delayed",
        delay_reason: "awaiting_bed",
        now: now
      )

      result = service.flag(
        episode_id: episode.id,
        status_flag: "delayed",
        delay_reason: "awaiting_bed",
        now: now + 1.minute
      )

      expect(result.event).to be_nil
      expect(events_of(episode, "flagged").count).to eq(1)
    end

    it "rejects normal, because clearing is a separate action" do
      expect do
        service.flag(episode_id: episode.id, status_flag: "normal", now: now)
      end.to raise_error(described_class::Rejected) do |error|
        expect(error.code).to eq(:invalid_status)
      end
    end

    it "rejects an unknown flag" do
      expect do
        service.flag(episode_id: episode.id, status_flag: "lost", now: now)
      end.to raise_error(described_class::Rejected) do |error|
        expect(error.code).to eq(:invalid_status)
      end
    end

    it "rejects a delay reason outside the fixed list" do
      expect do
        service.flag(
          episode_id: episode.id,
          status_flag: "delayed",
          delay_reason: "traffic",
          now: now
        )
      end.to raise_error(described_class::Rejected) do |error|
        expect(error.code).to eq(:validation_failed)
      end

      expect(episode.reload.status_flag).to eq("normal")
    end

    it "rejects a delay reason on call_care_team" do
      expect do
        service.flag(
          episode_id: episode.id,
          status_flag: "call_care_team",
          delay_reason: "awaiting_bed",
          now: now
        )
      end.to raise_error(described_class::Rejected) do |error|
        expect(error.code).to eq(:validation_failed)
      end
    end
  end

  describe "#clear_flag" do
    it "returns the episode to normal and records an event" do
      service.flag(
        episode_id: episode.id,
        status_flag: "delayed",
        delay_reason: "awaiting_team",
        now: now
      )

      result = service.clear_flag(episode_id: episode.id, now: now + 1.minute)

      episode.reload
      expect(episode.status_flag).to eq("normal")
      expect(episode.delay_reason).to be_nil
      expect(result.event.event_type).to eq("flag_cleared")
    end

    it "does nothing when the flag is already clear" do
      result = service.clear_flag(episode_id: episode.id, now: now)

      expect(result.event).to be_nil
      expect(events_of(episode, "flag_cleared").count).to eq(0)
    end
  end
end
