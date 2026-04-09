ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'pro', 'growth')),
  ADD COLUMN IF NOT EXISTS is_founding_member boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '14 days');
