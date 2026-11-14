require "rails_helper"

# Concurrency specs need committed rows and real connections, so this group
# opts out of transactional tests and cleans up after itself.
RSpec.describe StageTransitionService, "under concurrent requests", type: :model do
  self.use_transactional_tests = false

  after do
    StageEvent.delete_all
    Episode.delete_all
    StageTemplate.delete_all
    ProcedureTemplate.delete_all
  end

  def run_together(count)
    gate = Queue.new

    threads = count.times.map do |index|
      Thread.new do
        gate.pop
        ActiveRecord::Base.connection_pool.with_connection { yield index }
      end
    end

    count.times { gate << :go }
    threads.map(&:value)
  end

  it "records a single advance when two taps share an Idempotency-Key" do
    episode = create(:episode, current_stage_position: 1)
    key = SecureRandom.uuid

    results = run_together(2) do
      StageTransitionService.new.advance(episode_id: episode.id, idempotency_key: key)
    end

    expect(results.count(&:replayed)).to eq(1)
    expect(StageEvent.where(episode_id: episode.id, event_type: "advanced").count).to eq(1)
    expect(episode.reload.current_stage_position).to eq(2)
  end

  it "applies both advances when each tap has its own key" do
    episode = create(:episode, current_stage_position: 1)

    run_together(2) do
      StageTransitionService.new.advance(
        episode_id: episode.id,
        idempotency_key: SecureRandom.uuid
      )
    end

    expect(StageEvent.where(episode_id: episode.id, event_type: "advanced").count).to eq(2)
    expect(episode.reload.current_stage_position).to eq(3)
  end

  it "keeps the position and the history consistent under a concurrent undo" do
    episode = create(:episode, current_stage_position: 1)
    StageTransitionService.new.advance(
      episode_id: episode.id,
      idempotency_key: "seed-advance"
    )

    run_together(2) do |index|
      service = StageTransitionService.new
      if index.zero?
        service.advance(episode_id: episode.id, idempotency_key: SecureRandom.uuid)
      else
        service.undo(episode_id: episode.id)
      end
    end

    # Whichever order the row lock imposed, position must equal: start + each
    # advance - each undo.
    episode.reload
    advanced = episode.stage_events.where(event_type: "advanced").count
    undone = episode.stage_events.where(event_type: "undone").count

    expect(episode.current_stage_position).to eq(1 + advanced - undone)
  end
end
