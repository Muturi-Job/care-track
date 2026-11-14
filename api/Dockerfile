# Development image for docker-compose. Runs Rails in development mode against
# the postgres service; not tuned for production.
FROM ruby:3.4-slim

RUN apt-get update -qq \
 && apt-get install -y --no-install-recommends \
      build-essential libpq-dev postgresql-client curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install gems first so this layer is cached across code changes.
COPY Gemfile ./
RUN bundle install

COPY . .

EXPOSE 3001

# Called through bundle exec so the container does not depend on the
# executable bit of bin/rails (lost when committing from Windows).
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0", "-p", "3001"]
