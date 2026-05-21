-- Google Business Profile OAuth tokens and location reference.
-- Stored separately from the Google Calendar tokens (google_refresh_token)
-- because GBP uses a different scope and may be connected independently.

alter table public.shops
  add column if not exists gbp_location_name text,
  add column if not exists gbp_refresh_token text,
  add column if not exists gbp_access_token text,
  add column if not exists gbp_token_expiry timestamptz;

comment on column public.shops.gbp_location_name is 'GBP location resource name, e.g. "locations/12345678901234567". Null = not connected.';
comment on column public.shops.gbp_refresh_token is 'Google OAuth refresh token for Business Profile API. Long-lived.';
comment on column public.shops.gbp_access_token is 'Google OAuth access token for Business Profile API. Expires in 1 hour.';
comment on column public.shops.gbp_token_expiry is 'When gbp_access_token expires. Refresh before this timestamp.';
