-- Conteo de comensales por grupo (A/B/C) por evento de calendario.
alter table public.calendar_events
  add column if not exists groups jsonb not null default '{"A":0,"B":0,"C":0}'::jsonb;
