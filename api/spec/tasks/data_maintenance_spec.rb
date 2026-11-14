require "rails_helper"

RSpec.describe "data:cleanup", type: :task do
  before do
    Rails.application.load_tasks
    Rake::Task["data:cleanup"].reenable
  end

  it "deletes episodes, their events, and feedback older than 30 days" do
    old_episode = create(:episode, created_at: 31.days.ago)
    old_event = create(:stage_event, episode: old_episode, occurred_at: 31.days.ago)
    old_feedback = FeedbackResponse.create!(
      tracking_code: old_episode.tracking_code,
      answer: "yes",
      created_at: 31.days.ago
    )

    recent_episode = create(:episode)
    old_event_for_recent_episode = create(
      :stage_event,
      episode: recent_episode,
      occurred_at: 31.days.ago
    )
    recent_feedback = FeedbackResponse.create!(
      tracking_code: recent_episode.tracking_code,
      answer: "no",
      created_at: Time.current
    )

    Rake::Task["data:cleanup"].invoke

    expect(Episode.exists?(old_episode.id)).to be(false)
    expect(StageEvent.exists?(old_event.id)).to be(false)
    expect(StageEvent.exists?(old_event_for_recent_episode.id)).to be(false)
    expect(FeedbackResponse.exists?(old_feedback.id)).to be(false)
    expect(Episode.exists?(recent_episode.id)).to be(true)
    expect(FeedbackResponse.exists?(recent_feedback.id)).to be(true)
  end
end
