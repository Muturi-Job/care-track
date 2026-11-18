# Analytics definitions and limitations

The staff analytics reports summarize CareTrack records. They do not return
episode identifiers, patient aliases, beds, tracking codes, IP addresses, or
user-agent values. Reports accept inclusive ISO dates (`from` and `to`), default
to the most recent 30 days, and may be filtered by procedure template.

## Overview

- **Episodes** counts episodes created within the selected dates.
- **Completed** counts those episodes with a discharge time.
- **Average total time** averages the sum of recorded stage durations for
  completed episodes. Stage durations shorter than 60 seconds are excluded.
- **Expected total time** is the average sum of configured expected minutes for
  each episode's procedure template. Stages without an expected duration are
  omitted.
- **On-time rate** is the share of completed episodes with recorded stage time
  no greater than expected total time plus the configured grace minutes.
- **Delay rate** is the share of selected episodes with at least one recorded
  `delayed` flag during the selected dates.
- **Call-care-team count** counts recorded `call_care_team` flag events.
- **Inquiries per episode** is the count of linked inquiry records divided by
  the number of selected episodes. Its difference is the app rate minus the
  configured baseline.
- **Family checks per episode** is the number of anonymous family sessions
  first seen during the selected dates divided by selected episodes.
- **Informed rate** is `(yes + somewhat) / (yes + somewhat + no)` for feedback
  responses received during the selected dates. The response counts are shown
  alongside the rate.
- **Estimated staff minutes saved** is `inquiries × minutes per inquiry`.
  Estimated hours are minutes divided by 60. The report returns both inputs.

## Bottlenecks

Stage time runs from entering a stage until the next valid stage advance. The
episode creation time is the entry into the first stage. An advance immediately
followed by an undo is not treated as a stage entry. The current stage of an
in-progress episode has no completed duration and is omitted.

Durations under 60 seconds are excluded from stage medians, p90, average
overruns, and minutes lost, and are counted separately. Medians and p90 use
PostgreSQL `percentile_cont`. Per-stage **minutes lost** is the sum of
`max(duration - expected minutes, 0)`. **Share over expected** is the share of
eligible stage durations strictly above expected minutes plus the configured
grace. Heatmap cells group eligible stage durations by entry weekday and hour;
the cell reports the average positive overrun and the number of distinct
episodes.

## Delays and inquiries

Delay count is the number of distinct episodes with a delayed flag in the
selected dates. Delay minutes sum positive stage overruns across those
episodes; average delay minutes is that total divided by delayed episodes.
Reason mix and delays by stage count distinct flagged episodes. The care-team
event list contains only event date, time, and stage.

Inquiry channels and trends use the logged channel and timestamp. Hourly and
daily counts are grouped by the inquiry's logged time. The inquiry-to-check
ratio is family sessions divided by linked inquiries. Weekly feedback trends
use the answer counts described in the informed-rate definition.

## Data quality and suppression

- Groups with fewer than the configured minimum sample size of distinct
  episodes return `insufficient_data` rather than their measured values.
- A complete stage history means an episode has an advanced event for each
  stage after its initial stage. The first stage is inferred from episode
  creation.
- An episode with no stage events is counted separately.
- Stage-duration records shorter than 60 seconds are counted as excluded.
- The reports are aggregates. The only event-level analytics list is the
  care-team list, which contains date, time, and stage only.

## Limitations

- Inquiry totals are a **minimum estimate**: only contacts staff log are
  counted. Busy staff may miss entries or tap several entries in a batch.
- Staff minutes saved is a configured estimate, not a measured reduction in
  staff workload.
- A delay's minutes are calculated from over-expected stage time for episodes
  with a delayed flag; this does not establish that the flag caused the
  overrun.
- Trends and comparisons are descriptive. They show associations, not causes,
  and should not be used to infer clinical outcomes.
- In-progress stages do not yet have a duration. Very short stage transitions
  are excluded from duration statistics.
- Feedback is voluntary; informed-rate figures describe responses received,
  not every family member.
- The date filter selects episodes by their creation date. Stage-history events
  for selected episodes may occur later so they can close a stage duration;
  inquiry, session, feedback, and flag counts use their own timestamps within
  the selected range.

## Query indexes

Analytics queries use indexes on episode creation date and procedure template;
stage-event type, stage, episode, and occurrence time; inquiry log time,
episode, and channel; feedback tracking code and response time; and family
session episode and first-seen time. These indexes help bound selected date
ranges, but query latency depends on database size, data distribution, and
database resources.
