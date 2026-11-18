require "rails_helper"

RSpec.describe "Demo analytics task", type: :task do
  before { Rails.application.load_tasks }

  it "clears synthetic episodes and their related records without touching real episodes" do
    real_episode = create(:episode)
    demo_episode = create(:episode, demo_data: true)
    inquiry = create(:inquiry, episode: demo_episode)
    session = create(:family_session, episode: demo_episode)
    feedback = FeedbackResponse.create!(tracking_code: demo_episode.tracking_code, answer: "yes")

    DemoAnalytics.clear!

    expect(Episode.exists?(real_episode.id)).to be(true)
    expect(Episode.exists?(demo_episode.id)).to be(false)
    expect(Inquiry.exists?(inquiry.id)).to be(false)
    expect(FamilySession.exists?(session.id)).to be(false)
    expect(FeedbackResponse.exists?(feedback.id)).to be(false)
  end
end
