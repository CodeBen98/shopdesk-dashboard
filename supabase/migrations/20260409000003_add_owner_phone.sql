-- Add owner mobile phone and SMS consent fields
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS owner_phone text,
  ADD COLUMN IF NOT EXISTS owner_phone_sms_consent boolean DEFAULT false;

-- Fix the column default so new shops start at plan_selection
ALTER TABLE shops ALTER COLUMN onboarding_step SET DEFAULT 'plan_selection';

-- Update handle_new_user trigger so new shops start at plan_selection
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.shops (owner_id, name, onboarding_step)
  VALUES (new.id, '', 'plan_selection');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
