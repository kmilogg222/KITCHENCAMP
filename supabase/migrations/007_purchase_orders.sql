-- Migración 007: órdenes de compra persistentes
-- Aplicar manualmente en el SQL Editor de Supabase.

CREATE TABLE IF NOT EXISTS purchase_orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status        text NOT NULL DEFAULT 'pending',  -- 'pending' | 'received' | 'cancelled'
  delivery_date date,
  start_date    date,
  end_date      date,
  total         numeric NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  received_at   timestamptz
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  po_id             uuid REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  ingredient_id     uuid REFERENCES ingredients(id) ON DELETE SET NULL,
  name_snapshot     text NOT NULL,
  supplier_snapshot text,
  packs             numeric NOT NULL,
  pack_size         numeric NOT NULL,
  unit              text,
  price_per_pack    numeric NOT NULL DEFAULT 0
);

-- RLS purchase_orders
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own purchase_orders"
  ON purchase_orders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS purchase_order_items
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own purchase_order_items"
  ON purchase_order_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
