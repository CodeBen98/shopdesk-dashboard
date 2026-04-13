CREATE TABLE IF NOT EXISTS public.monitoring_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  source text NOT NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  message text NOT NULL,
  payload jsonb,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS monitoring_events_shop_id_idx ON public.monitoring_events(shop_id);
CREATE INDEX IF NOT EXISTS monitoring_events_created_at_idx ON public.monitoring_events(created_at DESC);
CREATE INDEX IF NOT EXISTS monitoring_events_severity_idx ON public.monitoring_events(severity, created_at DESC);

ALTER TABLE public.monitoring_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners can view their monitoring events"
  ON public.monitoring_events FOR SELECT
  USING (
    shop_id IS NULL OR exists (
      select 1 from public.shops
      where shops.id = monitoring_events.shop_id
      and shops.owner_id = auth.uid()
    )
  );
