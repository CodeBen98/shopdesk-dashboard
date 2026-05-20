-- Add website_url (URL-first onboarding), knowledge_flags (per-section AI toggles),
-- and farewell_message (owner-editable goodbye) to shops.
-- Fix industry defaults from auto_repair to other on bookings/customers.

alter table public.shops
  add column if not exists website_url text,
  add column if not exists knowledge_flags jsonb,
  add column if not exists farewell_message text;

comment on column public.shops.website_url is 'Business website URL entered during onboarding, used as primary enrichment source.';
comment on column public.shops.knowledge_flags is 'Per-section toggles controlling which knowledge items appear in the AI prompt. Null = all enabled.';
comment on column public.shops.farewell_message is 'Owner-editable AI goodbye message. Null = use default prompt.';

-- Fix defaults that assumed auto_repair
alter table public.bookings
  alter column industry set default 'other';

alter table public.customers
  alter column industry set default 'other';
