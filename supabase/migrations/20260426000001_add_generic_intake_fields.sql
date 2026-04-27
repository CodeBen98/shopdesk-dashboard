-- First-class generic intake storage for multi-industry bookings/customers.
-- Keeps legacy vehicle columns for auto repair compatibility.

alter table public.bookings
  add column if not exists industry text,
  add column if not exists intake jsonb not null default '{}'::jsonb;

alter table public.customers
  add column if not exists industry text,
  add column if not exists intake jsonb not null default '{}'::jsonb;

update public.bookings
set industry = 'auto_repair'
where industry is null;

update public.customers
set industry = 'auto_repair'
where industry is null;

alter table public.bookings
  alter column industry set default 'auto_repair';

alter table public.customers
  alter column industry set default 'auto_repair';

comment on column public.bookings.industry is 'Industry template active when this appointment was booked.';
comment on column public.bookings.intake is 'Industry-specific appointment intake details captured by the AI receptionist.';
comment on column public.customers.industry is 'Most recent industry context for this customer.';
comment on column public.customers.intake is 'Latest known industry-specific customer details captured by the AI receptionist.';
