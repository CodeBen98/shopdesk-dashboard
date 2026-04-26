-- Add first-class industry support for the dashboard-first multi-industry foundation.
-- Additive and nullable so existing production paths keep working during rollout.

alter table public.shops
  add column if not exists industry text,
  add column if not exists industry_config jsonb not null default '{}'::jsonb;

update public.shops
set industry = 'auto_repair'
where industry is null;

alter table public.shops
  alter column industry set default 'auto_repair';

comment on column public.shops.industry is 'Selected business industry template. Missing/legacy records default to auto_repair in application code.';
comment on column public.shops.industry_config is 'Industry-specific setup/configuration data for prompt and booking behavior.';
