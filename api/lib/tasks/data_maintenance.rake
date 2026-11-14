namespace :data do
  desc "Delete episodes, events, and feedback older than 30 days"
  task cleanup: :environment do
    cutoff = 30.days.ago
    old_episodes = Episode.where("created_at < ?", cutoff)
    old_episode_ids = old_episodes.select(:id)
    old_episode_codes = old_episodes.pluck(:tracking_code)

    deleted_events = StageEvent.where(episode_id: old_episode_ids)
                               .or(StageEvent.where("occurred_at < ?", cutoff))
                               .count
    deleted_feedback = FeedbackResponse.where(tracking_code: old_episode_codes)
                                       .or(FeedbackResponse.where("created_at < ?", cutoff))
                                       .delete_all
    deleted_episodes = old_episodes.destroy_all.size
    deleted_events += StageEvent.where("occurred_at < ?", cutoff).delete_all

    puts "Deleted #{deleted_episodes} episodes, #{deleted_events} stage events, " \
         "and #{deleted_feedback} feedback responses older than 30 days."
  end
end
