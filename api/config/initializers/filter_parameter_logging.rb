# Filter sensitive parameters from logs. There are no secrets in Phase A
# (CLAUDE.md rule 2), but this keeps room for growth without leaking data.
Rails.application.config.filter_parameters += %i[
  passw email secret token _key crypt salt certificate otp ssn
]
