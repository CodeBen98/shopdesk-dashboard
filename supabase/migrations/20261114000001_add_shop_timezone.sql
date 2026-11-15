-- Each shop books and displays appointments in its own time zone.
-- Existing shops were all built for Eastern time, so backfill that.
-- New shops start NULL and onboarding fills it in from the owner's browser;
-- code treats NULL as America/New_York.
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS timezone text;

UPDATE public.shops SET timezone = 'America/New_York' WHERE timezone IS NULL;

ALTER TABLE public.shops DROP CONSTRAINT IF EXISTS shops_timezone_check;
ALTER TABLE public.shops ADD CONSTRAINT shops_timezone_check CHECK (
  timezone IS NULL OR timezone IN (
    'America/Los_Angeles', 'America/Denver', 'America/Phoenix', 'America/Chicago',
    'America/New_York', 'America/Anchorage', 'Pacific/Honolulu'
  )
);
