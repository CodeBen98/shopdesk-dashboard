-- Add enrichment columns for Provisioning v2.
-- enrichment_raw holds the cached outputs of external harvests (Google Places,
-- website scrape, SerpAPI when enabled). Keeping it lets us re-run synthesis
-- without re-paying third-party APIs.
-- enrichment holds the structured LLM synthesis (services, voice traits,
-- identity, recommended_first_message, confidence). This is what the
-- agent prompt and the owner review UI consume.
-- See shopdesk/design-docs/2026-04-23-enrichment-engine.md.

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS enrichment_raw jsonb,
  ADD COLUMN IF NOT EXISTS enrichment jsonb,
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz;
