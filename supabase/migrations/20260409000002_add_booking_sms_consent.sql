ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS sms_consent_given boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_consent_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS sms_consent_source text,
  ADD COLUMN IF NOT EXISTS sms_consent_call_id text;
