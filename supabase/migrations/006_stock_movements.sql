-- Migración 006: movimientos de stock + flag cocinado en calendar_events
-- Aplicar manualmente en el SQL Editor de Supabase.

CREATE TABLE IF NOT EXISTS stock_movements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
  qty_base      numeric NOT NULL,          -- firmado: negativo=consumo, positivo=ingreso
  reason        text NOT NULL,             -- 'production' | 'purchase' | 'adjustment'
  ref_type      text,                      -- 'calendar_event' | 'purchase_order' | null
  ref_id        uuid,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_ingredient_id ON stock_movements(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ref ON stock_movements(ref_type, ref_id);

-- RLS
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stock_movements"
  ON stock_movements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stock_movements"
  ON stock_movements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stock_movements"
  ON stock_movements FOR DELETE
  USING (auth.uid() = user_id);

-- Columnas de estado cocinado en calendar_events
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS cooked boolean NOT NULL DEFAULT false;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS cooked_at timestamptz;
