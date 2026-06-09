-- ═══════════════════════════════════════════════════════════════════════════════
-- KitchenCalc — Corrección: columna updated_at faltante en calendar_events
-- Migración: 003_fix_calendar_updated_at.sql
-- Ejecutar en: Supabase SQL Editor (Database > SQL Editor > New query)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Contexto: 001_initial_schema.sql registró un trigger set_calendar_events_updated_at
-- que llama update_updated_at_column() (hace NEW.updated_at = now()), pero la tabla
-- calendar_events no tenía la columna updated_at. Cualquier UPDATE dispararía el
-- trigger y fallaría con "record new has no field updated_at".

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
