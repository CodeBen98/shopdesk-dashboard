-- ShopDesk Database Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- SHOPS
-- ============================================
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  address text not null default '',
  phone text not null default '',
  email text,
  hours jsonb not null default '{
    "monday":    {"open": true,  "from": "08:00", "to": "17:00"},
    "tuesday":   {"open": true,  "from": "08:00", "to": "17:00"},
    "wednesday": {"open": true,  "from": "08:00", "to": "17:00"},
    "thursday":  {"open": true,  "from": "08:00", "to": "17:00"},
    "friday":    {"open": true,  "from": "08:00", "to": "17:00"},
    "saturday":  {"open": false, "from": "09:00", "to": "14:00"},
    "sunday":    {"open": false, "from": "09:00", "to": "14:00"}
  }'::jsonb,
  services jsonb not null default '[]'::jsonb,
  emergency_contact text not null default '',
  emergency_contact_name text not null default '',
  twilio_number text,
  vapi_agent_id text,
  google_calendar_id text,
  google_refresh_token text,
  ai_voice text not null default 'patricia',
  onboarding_step text not null default 'shop_info',
  onboarding_complete boolean not null default false,
  status text not null default 'onboarding' check (status in ('onboarding', 'live', 'paused')),
  plan text not null default 'trial' check (plan in ('trial', 'starter', 'professional', 'growth')),
  trial_ends_at timestamptz default (now() + interval '30 days'),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shops enable row level security;

create policy "Owners can manage their own shop"
  on public.shops for all
  using (auth.uid() = owner_id);

-- ============================================
-- CALLS
-- ============================================
create table public.calls (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops(id) on delete cascade not null,
  caller_phone text not null default '',
  caller_name text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  outcome text not null default 'missed' check (outcome in ('booked', 'info_only', 'missed', 'emergency', 'voicemail')),
  transcript text,
  recording_url text,
  vapi_call_id text unique,
  summary text,
  created_at timestamptz not null default now()
);

alter table public.calls enable row level security;

create policy "Shop owners can view their calls"
  on public.calls for all
  using (
    exists (
      select 1 from public.shops
      where shops.id = calls.shop_id
      and shops.owner_id = auth.uid()
    )
  );

create index calls_shop_id_idx on public.calls(shop_id);
create index calls_started_at_idx on public.calls(started_at desc);

-- ============================================
-- BOOKINGS
-- ============================================
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops(id) on delete cascade not null,
  call_id uuid references public.calls(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  vehicle text,
  service text,
  appointment_at timestamptz not null,
  notes text,
  status text not null default 'scheduled' check (status in ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  sms_sent boolean not null default false,
  google_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

create policy "Shop owners can manage their bookings"
  on public.bookings for all
  using (
    exists (
      select 1 from public.shops
      where shops.id = bookings.shop_id
      and shops.owner_id = auth.uid()
    )
  );

create index bookings_shop_id_idx on public.bookings(shop_id);
create index bookings_appointment_at_idx on public.bookings(appointment_at);

-- ============================================
-- CUSTOMERS
-- ============================================
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops(id) on delete cascade not null,
  name text not null,
  phone text not null,
  vehicle text,
  last_visit timestamptz,
  visit_count integer not null default 1,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(shop_id, phone)
);

alter table public.customers enable row level security;

create policy "Shop owners can manage their customers"
  on public.customers for all
  using (
    exists (
      select 1 from public.shops
      where shops.id = customers.shop_id
      and shops.owner_id = auth.uid()
    )
  );

create index customers_shop_id_idx on public.customers(shop_id);
create index customers_phone_idx on public.customers(phone);

-- ============================================
-- JOB STATUS BOARD
-- ============================================
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops(id) on delete cascade not null,
  customer_name text not null,
  customer_phone text not null,
  vehicle text not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'ready_for_pickup')),
  pickup_notified boolean not null default false,
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.jobs enable row level security;

create policy "Shop owners can manage their jobs"
  on public.jobs for all
  using (
    exists (
      select 1 from public.shops
      where shops.id = jobs.shop_id
      and shops.owner_id = auth.uid()
    )
  );

create index jobs_shop_id_idx on public.jobs(shop_id);

-- ============================================
-- AUTO-UPDATE updated_at
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger shops_updated_at before update on public.shops
  for each row execute function update_updated_at();

create trigger bookings_updated_at before update on public.bookings
  for each row execute function update_updated_at();

create trigger customers_updated_at before update on public.customers
  for each row execute function update_updated_at();

create trigger jobs_updated_at before update on public.jobs
  for each row execute function update_updated_at();

-- ============================================
-- AUTO-CREATE SHOP ON SIGNUP
-- ============================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.shops (owner_id, name)
  values (new.id, '');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
