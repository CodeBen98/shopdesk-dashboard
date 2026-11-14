-- 1. Allow every shop status the app actually uses.
--    Previously only onboarding/live/paused were allowed, so owner pause/cancel
--    requests and the admin cancel/delete flows were silently rejected.
ALTER TABLE public.shops DROP CONSTRAINT IF EXISTS shops_status_check;
ALTER TABLE public.shops ADD CONSTRAINT shops_status_check CHECK (status IN (
  'onboarding', 'live', 'paused', 'pause_requested', 'cancel_requested', 'cancelling', 'deleted'
));

-- 2. Shop owners write to their own row directly from the browser (RLS policy
--    "Owners can manage their own shop"). That policy can't restrict columns, so
--    this trigger stops a logged-in owner from changing billing, provisioning and
--    admin-controlled fields. Server code using the service-role key, and the
--    Supabase dashboard, are not affected.
CREATE OR REPLACE FUNCTION public.protect_shop_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Only restrict end users. service_role / postgres / dashboard pass through.
  IF coalesce(auth.role(), '') <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.owner_id               := auth.uid();
    NEW.status                 := 'onboarding';
    NEW.onboarding_complete    := false;
    NEW.plan_tier              := 'starter';
    NEW.is_founding_member     := true;
    NEW.trial_started_at       := now();
    NEW.trial_ends_at          := now() + interval '14 days';
    NEW.twilio_number          := NULL;
    NEW.vapi_agent_id          := NULL;
    NEW.stripe_customer_id     := NULL;
    NEW.stripe_subscription_id := NULL;
    NEW.provision_attempted_at := NULL;
    NEW.cancelled_at           := NULL;
    NEW.deleted_at             := NULL;
    RETURN NEW;
  END IF;

  -- UPDATE: fields an owner may never change.
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.is_founding_member IS DISTINCT FROM OLD.is_founding_member
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
     OR NEW.twilio_number IS DISTINCT FROM OLD.twilio_number
     OR NEW.vapi_agent_id IS DISTINCT FROM OLD.vapi_agent_id
     OR NEW.provision_attempted_at IS DISTINCT FROM OLD.provision_attempted_at
     OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'This field can only be changed by ShopDesk support.'
      USING ERRCODE = '42501';
  END IF;

  -- Trial dates are set once at signup. The onboarding plan step re-sends them,
  -- so keep the originals quietly instead of failing the save.
  NEW.trial_started_at := OLD.trial_started_at;
  NEW.trial_ends_at    := OLD.trial_ends_at;

  -- Plan tier can be chosen during onboarding only.
  IF NEW.plan_tier IS DISTINCT FROM OLD.plan_tier AND coalesce(OLD.onboarding_complete, false) THEN
    RAISE EXCEPTION 'Plan changes after onboarding go through ShopDesk support.'
      USING ERRCODE = '42501';
  END IF;

  -- Status: owners may go live once from onboarding, or request a pause/cancel.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (NEW.status = 'live' AND OLD.status = 'onboarding')
      OR (NEW.status IN ('pause_requested', 'cancel_requested')
          AND OLD.status NOT IN ('cancelling', 'deleted'))
    ) THEN
      RAISE EXCEPTION 'Status change from % to % is not allowed.', OLD.status, NEW.status
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shops_protect_admin_fields ON public.shops;
CREATE TRIGGER shops_protect_admin_fields
  BEFORE INSERT OR UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.protect_shop_admin_fields();
