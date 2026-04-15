# Plan: Migración a Base de Datos — KitchenCalc

**Fecha:** 2026-04-14
**Estado:** Plan aprobado — listo para implementar por fases
**Autor:** AI Agent (sesión de planificación)

---

## Contexto y motivación

El estado actual usa Zustand con `persist` middleware en `localStorage`. Esto tiene dos problemas críticos:
1. **Single-device:** los datos no se comparten entre dispositivos ni usuarios.
2. **Fragilidad ante deploys:** un cambio en la forma del estado (schema de store) puede corromper o limpiar todos los datos del usuario en el navegador.

El objetivo es migrar a una base de datos real que sea:
- Gratuita inicialmente en Vercel
- Segura por diseño (RLS)
- Escalable a multi-usuario / multi-kitchen
- Sin servidor propio que mantener

---

## Decisión tecnológica: Supabase

### Por qué Supabase sobre las alternativas

| Opción | DB | Auth incluido | Free tier | Vercel integration | Recomendado |
|--------|----|----|----|----|-----|
| **Supabase** | PostgreSQL | ✅ Sí | 500 MB, 2 proyectos | ✅ Official | ✅ **ELEGIDO** |
| Neon | PostgreSQL | ❌ No | 0.5 GB, 190h compute | ✅ Official | Segunda opción |
| PlanetScale | MySQL | ❌ No | Eliminó free tier | Sí | ❌ No |
| Firebase | NoSQL | ✅ Sí | Generoso | Sí | ❌ Vendor lock |
| Turso | SQLite (libSQL) | ❌ No | 500 DBs | Sí | No para este caso |

**Supabase gana** porque entrega PostgreSQL + Auth en un solo servicio sin backend propio.
El cliente JS (`@supabase/supabase-js`) llama directo a la API REST desde el navegador.
RLS (Row Level Security) garantiza que cada usuario solo ve sus propios datos, sin lógica extra en el código.

### Límites del free tier (Supabase)

| Recurso | Límite |
|---------|--------|
| Almacenamiento DB | 500 MB |
| Requests API | 500,000 / mes |
| Proyectos activos | 2 |
| Inactividad | Pausa tras 7 días sin uso (se reactiva en <30 s) |
| Autenticación | Ilimitada |

Para una cocina profesional con ~500 ingredientes, ~200 recetas, ~50 menús y ~365 eventos de calendario, el tamaño total de datos será < 5 MB. El free tier es más que suficiente.

---

## Modelo de base de datos

### Principios de diseño
- **Un `user_id` en cada tabla** → RLS automático por usuario
- **UUIDs como PK** → sin colisiones al migrar datos de localStorage
- **Datos JSON donde tiene sentido** (`portionByGroup`, `portionFactors`) → evita tablas de pivot innecesarias para objetos pequeños y fijos
- **FKs con `ON DELETE` explícito** → integridad referencial sin sorpresas
- **`created_at` / `updated_at`** en todas las tablas → auditoría sin esfuerzo

---

### Diagrama entidad-relación

```
auth.users (Supabase managed)
    │
    ├──< suppliers
    │       id, user_id, name, contact, email, phone, color, notes
    │
    ├──< ingredients
    │       id, user_id, name, unit, pack_size, current_stock,
    │       min_order, supplier_id → suppliers, price_per_pack,
    │       substitutable, substitute
    │
    ├──< recipes
    │       id, user_id, name, category, description, image, rating,
    │       is_new, is_custom, base_servings, portion_factors (jsonb)
    │       │
    │       └──< recipe_ingredients
    │               id, recipe_id → recipes, ingredient_id → ingredients,
    │               input_mode, portion_by_group (jsonb), quantity_for_base,
    │               waste_pct, sort_order
    │
    ├──< menus
    │       id, user_id, name, description, image
    │       │
    │       └──< menu_recipes
    │               id, menu_id → menus, recipe_id → recipes, sort_order
    │
    └──< calendar_events
            id, user_id, date (date), slot, type, recipe_id?, menu_id?, note
```

---

### DDL completo

```sql
-- ── Habilitar extensión UUID ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── SUPPLIERS ───────────────────────────────────────────────────────────────
CREATE TABLE suppliers (
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

-- ── INGREDIENTS ─────────────────────────────────────────────────────────────
CREATE TABLE ingredients (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name            text NOT NULL,
    unit            text NOT NULL CHECK (unit IN ('g','ml','units','kg','L','oz','gal','qt','lb','1#')),
    pack_size       numeric NOT NULL CHECK (pack_size > 0),
    current_stock   numeric DEFAULT 0 CHECK (current_stock >= 0),
    min_order       numeric DEFAULT 1 CHECK (min_order >= 1),
    supplier_id     uuid REFERENCES suppliers(id) ON DELETE SET NULL,
    price_per_pack  numeric DEFAULT 0 CHECK (price_per_pack >= 0),
    substitutable   boolean DEFAULT false,
    substitute      text DEFAULT '',
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

-- ── RECIPES ─────────────────────────────────────────────────────────────────
CREATE TABLE recipes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name            text NOT NULL,
    category        text NOT NULL DEFAULT 'Main Course',
    description     text DEFAULT '',
    image           text DEFAULT '🍗',
    rating          smallint DEFAULT 4 CHECK (rating BETWEEN 1 AND 5),
    is_new          boolean DEFAULT true,
    is_custom       boolean DEFAULT true,
    base_servings   integer DEFAULT 10 CHECK (base_servings >= 1),
    -- { "A": 0.6, "B": 1.0, "C": 0.75 }
    portion_factors jsonb DEFAULT '{"A":0.6,"B":1.0,"C":0.75}',
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

-- ── RECIPE_INGREDIENTS (junction + ingredient refs) ──────────────────────────
CREATE TABLE recipe_ingredients (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id           uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
    ingredient_id       uuid REFERENCES ingredients(id) ON DELETE RESTRICT NOT NULL,
    input_mode          text DEFAULT 'per-person' CHECK (input_mode IN ('per-person','yield')),
    -- { "A": 120, "B": 200, "C": 150 }  — null when input_mode='yield'
    portion_by_group    jsonb,
    -- total quantity for base_servings — null when input_mode='per-person'
    quantity_for_base   numeric CHECK (quantity_for_base > 0),
    waste_pct           numeric DEFAULT 0 CHECK (waste_pct >= 0 AND waste_pct < 100),
    sort_order          smallint DEFAULT 0,
    CONSTRAINT chk_input_mode_data CHECK (
        (input_mode = 'per-person' AND portion_by_group IS NOT NULL AND quantity_for_base IS NULL)
        OR
        (input_mode = 'yield' AND quantity_for_base IS NOT NULL AND portion_by_group IS NULL)
    )
);

-- ── MENUS ───────────────────────────────────────────────────────────────────
CREATE TABLE menus (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name        text NOT NULL,
    description text DEFAULT '',
    image       text DEFAULT '🍽️',
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

-- ── MENU_RECIPES (junction + ordering) ──────────────────────────────────────
CREATE TABLE menu_recipes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_id     uuid REFERENCES menus(id) ON DELETE CASCADE NOT NULL,
    recipe_id   uuid REFERENCES recipes(id) ON DELETE RESTRICT NOT NULL,
    sort_order  smallint DEFAULT 0,
    UNIQUE (menu_id, recipe_id)
);

-- ── CALENDAR_EVENTS ─────────────────────────────────────────────────────────
CREATE TABLE calendar_events (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date        date NOT NULL,
    slot        text NOT NULL CHECK (slot IN ('breakfast','lunch','dinner','snack')),
    type        text NOT NULL CHECK (type IN ('recipe','menu')),
    -- Polymorphic ref: exactamente uno de los dos debe estar definido
    recipe_id   uuid REFERENCES recipes(id) ON DELETE CASCADE,
    menu_id     uuid REFERENCES menus(id) ON DELETE CASCADE,
    note        text DEFAULT '',
    created_at  timestamptz DEFAULT now(),
    CONSTRAINT chk_calendar_ref CHECK (
        (type = 'recipe' AND recipe_id IS NOT NULL AND menu_id IS NULL)
        OR
        (type = 'menu'   AND menu_id   IS NOT NULL AND recipe_id IS NULL)
    )
);

-- ── ÍNDICES ─────────────────────────────────────────────────────────────────
CREATE INDEX ON ingredients (user_id);
CREATE INDEX ON recipes (user_id);
CREATE INDEX ON recipe_ingredients (recipe_id);
CREATE INDEX ON recipe_ingredients (ingredient_id);
CREATE INDEX ON menus (user_id);
CREATE INDEX ON menu_recipes (menu_id);
CREATE INDEX ON calendar_events (user_id, date);
```

---

### RLS Policies (Row Level Security)

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE suppliers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus            ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_recipes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events  ENABLE ROW LEVEL SECURITY;

-- Macro: cada tabla usa el mismo patrón — solo el dueño accede
-- (repetir para cada tabla: suppliers, ingredients, recipes, menus, calendar_events)

CREATE POLICY "own_select" ON suppliers
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON suppliers
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON suppliers
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON suppliers
    FOR DELETE USING (auth.uid() = user_id);

-- recipe_ingredients y menu_recipes no tienen user_id propio;
-- acceso autorizado si el recipe/menu padre pertenece al usuario
CREATE POLICY "own_ri_select" ON recipe_ingredients
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid())
    );
CREATE POLICY "own_ri_insert" ON recipe_ingredients
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid())
    );
CREATE POLICY "own_ri_update" ON recipe_ingredients
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid())
    );
CREATE POLICY "own_ri_delete" ON recipe_ingredients
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid())
    );
-- Aplicar mismo patrón para menu_recipes (via menus)
```

---

## Arquitectura de integración (sin backend propio)

```
Browser
  │
  ├── @supabase/supabase-js ──→  Supabase REST API (HTTPS)
  │        │                           │
  │        │                     PostgreSQL + RLS
  │        │
  │   src/lib/supabase.js         ← cliente singleton
  │   src/store/useStore.js       ← acciones se vuelven async
  │   src/hooks/useAuth.js        ← maneja sesión + redirect
  │
  └── Zustand (en memoria)        ← cache local; se hidrata desde DB al login
```

**Variables de entorno en Vercel:**
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

> ⚠️ NUNCA usar la `service_role` key en el cliente. Solo la `anon` key.
> RLS hace el trabajo de seguridad, no el key.

---

## Plan de implementación por fases

### Fase 1 — Supabase setup + Autenticación (sin tocar datos aún)

**Archivos nuevos / modificados:**
- `src/lib/supabase.js` — cliente singleton
- `src/hooks/useAuth.js` — hook para sesión (login / logout / loading)
- `src/components/AuthGate.jsx` — modal de login/signup que envuelve la app
- `src/App.jsx` — envolver rutas con `<AuthGate>`
- `.env.local` — vars de entorno (agregar a `.gitignore`)
- `vercel.json` — documentar vars necesarias

**Sin cambio en datos:** Zustand sigue usando localStorage. La app funciona igual para el usuario, solo se añade la capa de auth.

---

### Fase 2 — Tablas + RLS + lectura desde DB

**Pasos:**
1. Ejecutar el DDL en Supabase SQL Editor
2. Crear RLS policies
3. Crear `src/lib/dbQueries.js` con funciones de lectura:
   ```js
   export async function fetchUserData(userId) { ... }
   // Devuelve { ingredients, recipes, menus, suppliers, calendarEvents }
   ```
4. En `useStore.js`, agregar acción `hydrate(data)` que carga todos los arrays de golpe
5. En `useAuth.js`, al detectar login exitoso → llamar `fetchUserData` → `hydrate`

**Migración de datos existentes de localStorage:**
- Al primer login, si localStorage tiene datos, mostrar banner:
  _"Detectamos datos locales. ¿Migrar a tu cuenta?"_
- Botón "Migrar" → POST de todos los datos al DB con el `user_id` del usuario recién autenticado
- Botón "Ignorar" → empezar con datos en blanco del DB

---

### Fase 3 — Escritura async a DB (optimistic updates)

**Patrón de cada acción:**
```js
// useStore.js — patrón optimistic update
addIngredient: async (ing) => {
    // 1. Actualizar UI inmediatamente (optimistic)
    const tempId = `temp-${Date.now()}`;
    set(state => ({ ingredients: [...state.ingredients, { ...ing, id: tempId }] }));

    // 2. Persistir en DB
    const { data, error } = await supabase
        .from('ingredients')
        .insert({ ...ing, user_id: getCurrentUserId() })
        .select()
        .single();

    if (error) {
        // 3a. Rollback si falla
        set(state => ({ ingredients: state.ingredients.filter(i => i.id !== tempId) }));
        toast.error('Error al guardar ingrediente');
    } else {
        // 3b. Reemplazar tempId con el ID real del DB
        set(state => ({
            ingredients: state.ingredients.map(i => i.id === tempId ? data : i)
        }));
    }
},
```

**Recetas requieren transacción:** Al crear/editar una receta, se afectan `recipes` + `recipe_ingredients`. Usar función RPC de Supabase o hacer las dos llamadas secuencialmente (insert recipe → insert ingredients).

---

### Fase 4 — Limpieza final

- Remover `persist` middleware de Zustand (ya no necesario)
- Remover `kitchencalc-store` de localStorage (`localStorage.removeItem('kitchencalc-store')` en migración)
- Agregar loading states globales (spinner al hidratarse el store)
- Agregar UI de error de conexión
- Testear el flujo completo en preview de Vercel

---

## Archivos clave a crear / modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/lib/supabase.js` | Crear | Cliente singleton de Supabase |
| `src/lib/dbQueries.js` | Crear | Funciones read/write organizadas por entidad |
| `src/hooks/useAuth.js` | Crear | Hook de sesión: user, loading, login, logout |
| `src/components/AuthGate.jsx` | Crear | Modal login/signup (email + password o magic link) |
| `src/store/useStore.js` | Modificar | Acciones async + acción `hydrate()` |
| `src/App.jsx` | Modificar | Envolver rutas con `<AuthGate>` |
| `.env.local` | Crear | `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` |
| `supabase/migrations/001_initial.sql` | Crear | DDL + RLS (versionado) |

---

## Consideraciones de seguridad

1. **Solo `anon` key en el cliente** — la `service_role` key nunca va al frontend
2. **RLS en cada tabla** — ninguna tabla puede quedar sin políticas
3. **Constraints en DB** — CHECK, NOT NULL, FK complementan la validación del cliente
4. **No IDs predecibles** — UUIDs en lugar de enteros secuenciales (evita enumeration attacks)
5. **HTTPS obligatorio** — Vercel + Supabase lo garantizan
6. **Env vars en Vercel dashboard** — no en el repo; `.env.local` en `.gitignore`
7. **Email verification** — habilitar en Supabase Auth settings para producción

---

## Verificación end-to-end

1. `npm run dev` → app carga con modal de login
2. Crear cuenta nueva → modal desaparece, app vacía (sin datos seed)
3. Crear un ingrediente → aparece en Inventory; refrescar página → sigue ahí
4. Crear receta usando ese ingrediente → aparece en Recipes
5. Crear menú → aparece en Menus
6. Agregar evento al calendario → persiste al refrescar
7. Cerrar sesión → datos desaparecen de la UI
8. Volver a iniciar sesión → datos reaparecen correctamente
9. Abrir en otro navegador / dispositivo → mismos datos visibles

---

## Notas para el agente implementador

- Leer `FORGE_MASTER_PLAN.md` §4 (arquitectura) y §6 (calc engine) antes de modificar `useStore.js`
- La calc engine en `mockData.js` opera sobre arrays en memoria — **no cambia con la DB**. Solo cambia cómo se hidrata el store.
- `cart[]` **no se persiste en DB** — es ephemeral por diseño (se genera de cada cálculo)
- Los IDs actuales en `mockData.js` son strings cortos (`'ing-001'`, `'recipe-1'`). Al migrar a UUID en DB, los IDs de los datos seed se regenerarán. No hay problema porque el usuario migrará desde localStorage.
- Supabase genera `updated_at` automáticamente si se configura un trigger; de lo contrario, incluirlo en cada UPDATE.

---

*Sesión de planificación: 2026-04-14*
