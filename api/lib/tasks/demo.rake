namespace :demo do
  desc "Delete all episode and feedback data, then recreate the demo training set"
  task reset: :environment do
    FeedbackResponse.delete_all
    Episode.destroy_all
    ProcedureTemplate.destroy_all
    Rake::Task["db:seed"].invoke
  end
end
