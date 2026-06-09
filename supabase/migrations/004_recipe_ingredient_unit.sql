-- Migración 004: unidad flexible por ingrediente en recetas
-- Aplicar manualmente en el SQL Editor de Supabase (como 002/003).
-- NULL = usar la unidad del ingrediente del catálogo (retrocompatible).

ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS unit text;
