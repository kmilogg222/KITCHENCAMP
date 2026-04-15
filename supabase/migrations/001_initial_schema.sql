-- ═══════════════════════════════════════════════════════════════════════════════
-- KitchenCalc — Esquema inicial de base de datos
-- Migración: 001_initial_schema.sql
-- Ejecutar en: Supabase SQL Editor (Database > SQL Editor > New query)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Función trigger para updated_at automático ────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLA: suppliers
-- Sin FK a datos de usuario. user_id vincula cada supplier al auth.users.
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS suppliers (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name        text NOT NULL,
    contact     text DEFAULT '',
    email       text DEFAULT '',
    phone       text DEFAULT '',
    color       text DEFAULT '#6b3fa0',
    notes       text DEFAULT '',
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON suppliers(user_id);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_own_select" ON suppliers
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "suppliers_own_insert" ON suppliers
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "suppliers_own_update" ON suppliers
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "suppliers_own_delete" ON suppliers
    FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLA: ingredients
-- FK a suppliers (opcional — supplier puede ser NULL si no se asignó).
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ingredients (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name            text NOT NULL,
    unit            text NOT NULL DEFAULT 'g',
    pack_size       numeric NOT NULL DEFAULT 1,
    current_stock   numeric NOT NULL DEFAULT 0,
    min_order       numeric NOT NULL DEFAULT 1,
    supplier_id     uuid REFERENCES suppliers(id) ON DELETE SET NULL,
    price_per_pack  numeric NOT NULL DEFAULT 0,
    substitutable   boolean NOT NULL DEFAULT false,
    substitute      text DEFAULT '',
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingredients_user_id    ON ingredients(user_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_supplier_id ON ingredients(supplier_id);

ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ingredients_own_select" ON ingredients
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ingredients_own_insert" ON ingredients
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ingredients_own_update" ON ingredients
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ingredients_own_delete" ON ingredients
    FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_ingredients_updated_at
    BEFORE UPDATE ON ingredients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLA: recipes
-- portionByGroup y portionFactors como JSONB (objetos pequeños y fijos).
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS recipes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name            text NOT NULL,
    category        text DEFAULT 'Main Course',
    rating          smallint DEFAULT 3 CHECK (rating BETWEEN 1 AND 5),
    image           text DEFAULT '🍽️',
    description     text DEFAULT '',
    is_new          boolean NOT NULL DEFAULT false,
    base_servings   numeric,
    portion_factors jsonb,    -- { "A": number, "B": number, "C": number }
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipes_own_select" ON recipes
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "recipes_own_insert" ON recipes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recipes_own_update" ON recipes
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "recipes_own_delete" ON recipes
    FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_recipes_updated_at
    BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLA: recipe_ingredients
-- Tabla junction entre recipes e ingredients.
-- user_id denormalizado para RLS simple (evita sub-query costosa).
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    recipe_id         uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
    ingredient_id     uuid REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
    input_mode        text NOT NULL DEFAULT 'per-person' CHECK (input_mode IN ('per-person', 'yield')),
    portion_by_group  jsonb,    -- { "A": number, "B": number, "C": number } — modo per-person
    quantity_for_base numeric,  -- total para base_servings — modo yield
    waste_pct         numeric DEFAULT 0,
    created_at        timestamptz DEFAULT now(),
    updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id     ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_user_id       ON recipe_ingredients(user_id);

ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipe_ingredients_own_select" ON recipe_ingredients
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "recipe_ingredients_own_insert" ON recipe_ingredients
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recipe_ingredients_own_update" ON recipe_ingredients
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "recipe_ingredients_own_delete" ON recipe_ingredients
    FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_recipe_ingredients_updated_at
    BEFORE UPDATE ON recipe_ingredients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLA: menus
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS menus (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name        text NOT NULL,
    description text DEFAULT '',
    image       text DEFAULT '🍽️',
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menus_user_id ON menus(user_id);

ALTER TABLE menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menus_own_select" ON menus
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "menus_own_insert" ON menus
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "menus_own_update" ON menus
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "menus_own_delete" ON menus
    FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_menus_updated_at
    BEFORE UPDATE ON menus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLA: menu_recipes
-- Tabla junction entre menus y recipes, incluye posición (orden).
-- user_id denormalizado para RLS simple.
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS menu_recipes (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    menu_id    uuid REFERENCES menus(id) ON DELETE CASCADE NOT NULL,
    recipe_id  uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
    position   smallint NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    UNIQUE (menu_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS idx_menu_recipes_menu_id   ON menu_recipes(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_recipes_recipe_id ON menu_recipes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_menu_recipes_user_id   ON menu_recipes(user_id);

ALTER TABLE menu_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_recipes_own_select" ON menu_recipes
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "menu_recipes_own_insert" ON menu_recipes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "menu_recipes_own_update" ON menu_recipes
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "menu_recipes_own_delete" ON menu_recipes
    FOR DELETE USING (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLA: calendar_events
-- Reemplaza el objeto { "YYYY-MM-DD": CalendarEvent[] } del store.
-- Cada fila es un evento vinculado a un recipe o menu.
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS calendar_events (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    event_date date NOT NULL,
    slot       text NOT NULL CHECK (slot IN ('breakfast', 'lunch', 'dinner', 'snack')),
    type       text NOT NULL CHECK (type IN ('recipe', 'menu')),
    recipe_id  uuid REFERENCES recipes(id) ON DELETE CASCADE,
    menu_id    uuid REFERENCES menus(id) ON DELETE CASCADE,
    note       text DEFAULT '',
    created_at timestamptz DEFAULT now(),
    -- Constraint: uno de los dos IDs debe estar presente según el type
    CONSTRAINT calendar_event_item_check CHECK (
        (type = 'recipe' AND recipe_id IS NOT NULL AND menu_id IS NULL) OR
        (type = 'menu'   AND menu_id   IS NOT NULL AND recipe_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id    ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_date ON calendar_events(event_date);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_events_own_select" ON calendar_events
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "calendar_events_own_insert" ON calendar_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "calendar_events_own_update" ON calendar_events
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "calendar_events_own_delete" ON calendar_events
    FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_calendar_events_updated_at
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN (ejecutar después del schema para validar)
-- ═══════════════════════════════════════════════════════════════════════════════
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- Todas las tablas deben tener rowsecurity = true.
