-- Migración 005: stock en unidad base (stockQty)
-- Aplicar manualmente en el SQL Editor de Supabase.
-- stock_qty = cantidad en la unidad real del ingrediente (g, ml, units, etc.)
-- current_stock queda como columna legacy (packs) para compatibilidad temporal.

ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS stock_qty numeric NOT NULL DEFAULT 0;

-- Backfill: derivar stock en unidad base desde packs × pack_size
UPDATE ingredients SET stock_qty = current_stock * pack_size WHERE stock_qty = 0;
