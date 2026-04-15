# Plan de Ejecución: Migración a Supabase — KitchenCalc

**Fecha:** 2026-04-14 (actualizado 2026-04-14 v2)
**Basado en:** `agent-sessions/2026-04-14_database-migration-plan.md`
**Propósito:** Análisis crítico del plan original + plan de ejecución detallado paso a paso para un agente implementador.
**Revisiones:** v2 — incorpora observaciones sobre import/export CSV/Excel, estructura modular de la capa de datos, Zustand slices, Realtime subs, y extensibilidad general.

---

## PARTE 1: ANÁLISIS CRÍTICO DEL PLAN ORIGINAL

### ✅ Aciertos del plan original

1. **Elección de Supabase** — Correcta. PostgreSQL + Auth + RLS en un solo servicio, sin backend propio. El free tier sobra para el caso de uso.
2. **UUIDs como PK** — Correcta decisión para evitar colisiones al migrar datos de localStorage.
3. **RLS por `user_id`** — Patrón correcto para multi-tenancy sin middleware propio.
4. **Optimistic updates** — El patrón propuesto es el correcto para mantener UX fluida.
5. **Fases incrementales** — El plan original divide bien la migración para no romper todo de golpe.
6. **JSONB para `portionByGroup` y `portionFactors`** — Evita tablas pivot innecesarias para objetos pequeños y fijos.

---

### ⚠️ Problemas, omisiones y riesgos detectados

#### PROBLEMA 1: IDs mixtos en el seed data actual — NO contemplado

El plan mencionó que los IDs actuales son strings cortos (`'ing-001'`) y se regenerarían. **Pero no consideró que los IDs de `recipes` son enteros (`1`, `2`, `3`, `4`)**, mientras que los IDs de `menus` son strings (`'menu-001'`), y los IDs de `suppliers` son strings no-UUID (`'SISCO'`, `'Driscoll'`).

**Impacto:** La migración de datos existentes desde localStorage necesita un mapeo explícito de IDs legacy → UUIDs nuevos, y las foreign keys dentro de los datos (por ejemplo, `recipeIds` dentro de menus, `ingredientId` dentro de recipe ingredients, `supplier` como string name en lugar de FK) deben reescribirse.

**Más grave aún:** El campo `supplier` en `ingredients` del mockData actual almacena el **nombre del supplier** como string (`'SISCO'`), no un `supplier_id` UUID. El DDL propone `supplier_id uuid REFERENCES suppliers(id)`. La migración debe resolver `name → id`.

#### PROBLEMA 2: El campo `supplier` en ingredientes es un name, no un FK

El modelo actual usa `supplier: 'SISCO'` (nombre string). El DDL propone `supplier_id uuid FK`. Esto requiere:
- Primero insertar suppliers y obtener sus UUIDs.
- Luego, al insertar ingredientes, resolver el `supplier` name al `supplier_id` correspondiente.
El plan original no detalla este mapeo.

#### PROBLEMA 3: `recipe_ingredients` no tiene `user_id` — RLS via sub-query es costoso

Las políticas RLS propuestas para `recipe_ingredients` y `menu_recipes` usan `EXISTS (SELECT 1 FROM recipes WHERE ...)`. Esto es correcto en principio, pero:
- En PostgreSQL con RLS, las sub-queries en políticas añaden overhead por cada fila evaluada.
- Para tablas junction con muchas filas, esto puede degradar performance.

**Recomendación:** Añadir `user_id` directamente a `recipe_ingredients` y `menu_recipes` como campo denormalizado. Es redundante pero simplifica las policies enormemente y mejora el rendimiento. La consistencia se mantiene porque solo el dueño puede crear recipes/menus.

#### PROBLEMA 4: Falta el trigger `updated_at`

El DDL define `updated_at timestamptz DEFAULT now()` pero NO crea el trigger para actualizarlo automáticamente en UPDATEs. Sin trigger, `updated_at` siempre será el timestamp de creación.

#### PROBLEMA 5: `calendarEvents` — modelo incompatible

En el store actual, `calendarEvents` es un objeto `{ "YYYY-MM-DD": CalendarEvent[] }` donde cada evento tiene:
```js
{ id, type, itemId, slot, note }
```

El DDL propone una tabla con columnas separadas `recipe_id` y `menu_id` + constraint polimórfico. Pero el modelo actual usa `itemId` genérico (que puede ser un recipe ID entero o un menu ID string). La migración debe:
1. Detectar `type === 'recipe'` → buscar el UUID del recipe por ID legacy.
2. Detectar `type === 'menu'` → buscar el UUID del menu por ID legacy.
3. El campo `date` en el store es la key del objeto; en el DDL es una columna explícita.

Este mapeo es el más complejo de la migración y el plan original no lo detalla.

#### PROBLEMA 6: Falta definir qué pasa con `mockData.js` como seed

El plan dice "el usuario migrará desde localStorage", pero no aclara:
- ¿Qué pasa en un primer login sin datos en localStorage? → La app actualmente arranca con `ingredientsCatalog`, `recipes`, etc. de `mockData.js`.
- ¿Se deben cargar como seed en la DB? ¿O el usuario empieza vacío?
- Con multi-usuario, el seed data no puede ser global — cada usuario debería tener su propio set o arrancar vacío.

**Recomendación:** Usuario nuevo → datos vacíos. Opcionalmente, un botón "Load demo data" que inserté el seed del mockData con el `user_id` del usuario actual.

#### PROBLEMA 7: No hay plan de rollback

Si la migración falla a medio camino (ej: Fase 2 completa pero Fase 3 rompe algo), no hay plan para revertir. El plan debería incluir:
- Feature flag `USE_SUPABASE=true/false` para poder alternar entre localStorage y Supabase.
- Mantener el middleware `persist` de Zustand como fallback hasta completar la Fase 4.

#### PROBLEMA 8: No se consideran las `RLS policies` completas

El plan original solo muestra las policies de `suppliers` como ejemplo y dice "repetir para cada tabla". Esto es peligroso — el agente implementador podría olvidar alguna tabla o no aplicar correctamente el patrón para las junction tables. El DDL final DEBE incluir TODAS las policies explícitamente.

#### PROBLEMA 9: Falta considerar el modelo multi-kitchen

El plan dice "Escalable a multi-usuario / multi-kitchen" pero no diseña la tabla `kitchens` ni la relación `user ↔ kitchen`. Si en el futuro se necesita que un usuario pertenezca a varias cocinas, o que una cocina tenga varios usuarios, el modelo actual (con `user_id` directo en cada tabla) no escala sin una migración adicional.

**Para el MVP:** Mantener `user_id` directo está bien. Pero documentar que Phase 2 del backend (roles/kitchens) requerirá añadir una tabla `kitchens` + tabla `kitchen_members` + cambiar `user_id` por `kitchen_id` en todas las tablas de datos.

#### PROBLEMA 10: Login — método de autenticación no definido

El plan dice "modal de login/signup que envuelve la app" y menciona "email + password o magic link" pero no define cuál usar. Para cocinas profesionales:
- **Email + password** es lo más práctico (no depende de verificar email para acceder).
- **Magic link** es más seguro pero requiere configurar SMTP en Supabase.
- **Google OAuth** podría ser una opción rápida adicional.

**Recomendación:** Email + password como método principal, con la posibilidad de agregar OAuth más adelante.

#### PROBLEMA 11: `dbQueries.js` se convertirá en un monolito

El plan propone un solo archivo `src/lib/dbQueries.js` para todas las funciones de lectura y escritura. Con 7 entidades actuales (suppliers, ingredients, recipes, recipe_ingredients, menus, menu_recipes, calendar_events) y las futuras (budget, staff, activity), el archivo superará 600+ líneas rápidamente.

**Recomendación:** Estructurar como carpeta de módulos desde el primer día:
```
src/lib/db/
  index.js          ← re-exports públicos
  client.js          ← cliente singleton (actual supabase.js)
  suppliers.js       ← CRUD de suppliers
  ingredients.js     ← CRUD de ingredients
  recipes.js         ← CRUD de recipes + recipe_ingredients
  menus.js           ← CRUD de menus + menu_recipes
  calendar.js        ← CRUD de calendar_events
  migration.js       ← migrateLocalDataToDb()
  transform.js       ← transformDbToStoreShape() + transformStoreToDbShape()
```
Cada módulo importa el client de `./client.js`. `index.js` re-exporta todo para que los consumers sigan importando desde `'../lib/db'`.

#### PROBLEMA 12: El store crecerá sin control con nuevas entidades

Actualmente `useStore.js` tiene ~90 líneas con 6 colecciones y ~20 acciones. Con Supabase (acciones async, hydrate, loading states) y futuras entidades (budget, staff, activity), superará 300+ líneas.

**Recomendación:** Usar **Zustand slices** desde la migración:
```js
// src/store/slices/ingredientsSlice.js
export const createIngredientsSlice = (set, get) => ({
  ingredients: [],
  addIngredient: async (ing) => { /* ... */ },
  updateIngredient: async (updatedIng) => { /* ... */ },
  deleteIngredient: async (id) => { /* ... */ },
});

// src/store/useStore.js
import { createIngredientsSlice } from './slices/ingredientsSlice';
import { createRecipesSlice } from './slices/recipesSlice';
// ...
export const useStore = create((...a) => ({
  ...createIngredientsSlice(...a),
  ...createRecipesSlice(...a),
  // ...
}));
```
Esto permite agregar budget, staff, activity como slices independientes sin tocar los existentes.

#### PROBLEMA 13: No se contempla Import/Export de datos (CSV/Excel)

Para un sistema de cocina profesional, la capacidad de exportar e importar datos (ingredientes, recetas, inventarios, proveedores) es esencial para:
- Backup manual de datos
- Compartir recetas entre cocinas/usuarios
- Migración desde otros sistemas
- Reportes impresos

El modelo de datos tiene **3 niveles de complejidad** para exportar:

| Nivel | Entidades | Problema | Solución |
|-------|-----------|----------|----------|
| Fácil | suppliers, ingredients | Tablas planas | CSV directo |
| Moderado | menus | Lista de recetas (`recipeIds[]`) | Columna con valores separados por `\|` o segunda hoja Excel |
| Complejo | recipes + recipe_ingredients | JSONB (`portionByGroup`, `portionFactors`) + modo dual (per-person/yield) | Excel multi-hoja (Sheet Recetas + Sheet Ingredientes) o 2 CSVs pareados |

**Problemas concretos al importar:**

| Problema | Solución |
|----------|----------|
| `portionByGroup` / `portionFactors` son objetos JSONB | Excel 2 hojas, o 2 CSVs separados |
| `inputMode` dual cambia qué campos aplican | Columna `inputMode` + columnas condicionales vacías |
| `supplier` name → UUID al importar | Lookup por nombre; si no existe → crear automáticamente o error claro |
| Recipe name → UUID al importar menús | Lookup por nombre exacto |
| ¿Duplicado o update si ya existe? | Definir estrategia: upsert por nombre vs crear nuevo |

**Diseño compatible:** La arquitectura modular del `src/lib/db/` facilita esto — las funciones de import/export van en módulos propios (`export.js`, `import.js`) sin tocar el store ni las views. La lógica de `transform.js` (que ya aplana/anida datos entre DB y store) se reutiliza en sentido inverso para el export.

---

## PARTE 2: PLAN DE EJECUCIÓN PASO A PASO

> **Instrucciones para el agente implementador:**
> Ejecutar en orden estricto. NO saltar pasos. Cada paso tiene un criterio de verificación que DEBE cumplirse antes de avanzar.

---

### PREREQUISITOS (Manual — lo hace el usuario)

- [ ] Crear proyecto en [supabase.com](https://supabase.com)
- [ ] Obtener `SUPABASE_URL` y `SUPABASE_ANON_KEY` del dashboard → Settings → API
- [ ] Habilitar proveedor "Email" en Authentication → Providers (con "Confirm email" desactivado para desarrollo)
- [ ] Compartir las credenciales al agente (como variables de entorno)

---

### FASE 0: Preparación del entorno local (sin tocar funcionalidad)

#### Paso 0.1 — Instalar dependencia de Supabase

```bash
npm install @supabase/supabase-js
```

> ⚠️ Requiere aprobación del usuario para nueva dependencia (regla #3 del FORGE_MASTER_PLAN §9).

**Verificación:** `package.json` lista `@supabase/supabase-js` en `dependencies`.

#### Paso 0.2 — Crear archivo `.env.local`

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Verificación:** `import.meta.env.VITE_SUPABASE_URL` retorna un valor no-undefined en dev.

#### Paso 0.3 — Agregar `.env.local` a `.gitignore`

Verificar que `.gitignore` ya lo incluye (Vite lo agrega por defecto), si no, añadirlo.

**Verificación:** `git status` no muestra `.env.local` como untracked.

#### Paso 0.4 — Crear `src/lib/supabase.js`

```js
/**
 * @file supabase.js
 * @description Cliente singleton de Supabase para KitchenCalc.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Verificación:** `npm run dev` arranca sin error (asumiendo que las vars están definidas).

---

### FASE 1: Autenticación (sin tocar datos)

> **Objetivo:** La app muestra un login gate. El usuario debe autenticarse para acceder. Zustand sigue usando localStorage como siempre.

#### Paso 1.1 — Crear `src/hooks/useAuth.js`

```js
/**
 * @file useAuth.js
 * @description Hook de autenticación con Supabase. Maneja sesión, login, signup y logout.
 */
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión actual al montar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Escuchar cambios de sesión (login/logout/token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return { user, loading, signUp, signIn, signOut };
}
```

**Verificación:** Hook se importa sin errores. `useAuth()` retorna `{ user: null, loading: false }` sin sesión.

#### Paso 1.2 — Crear `src/components/AuthGate.jsx`

Componente que envuelve la app. Si no hay sesión, muestra modal de login/signup. Si hay sesión, renderiza `children`.

**Características del modal de auth:**
- Tabs: "Sign In" / "Sign Up"
- Campos: email, password (y confirmar password en signup)
- Validación inline (email format, password min 6 chars, passwords match)
- Mensajes de error de Supabase mostrados en la UI
- Diseño consistente con el theme existente (glass-card, colores de `theme.js`)
- Sin `alert()` ni `window.confirm()` (regla del FORGE_MASTER_PLAN §8.4)
- Loading spinner durante la petición de auth

**Verificación:** La app muestra el modal al cargar. Después de signup/signin, el modal desaparece y se ve la app normal.

#### Paso 1.3 — Modificar `src/App.jsx`

Envolver todo el contenido con `<AuthGate>`:

```jsx
import AuthGate from './components/AuthGate';

export default function App() {
  return (
    <AuthGate>
      <BrowserRouter>
        {/* ... todo el contenido actual ... */}
      </BrowserRouter>
    </AuthGate>
  );
}
```

**Verificación:** `npm run dev` → se ve el modal de auth. Login funciona. La app funciona exactamente igual que antes después del login.

#### Paso 1.4 — Agregar botón de logout al Sidebar

Agregar un botón de logout al final del `Sidebar.jsx` (ícono `LogOut` de lucide-react). Al hacer clic → `signOut()` → el `AuthGate` detecta el cambio de sesión y muestra el modal de login.

**Verificación:** Click en logout → vuelve al modal. Login de nuevo → app funciona.

---

### FASE 2: Esquema de base de datos (SQL en Supabase)

> **Objetivo:** Crear las tablas, índices, RLS policies y triggers en Supabase.

#### Paso 2.1 — Crear `supabase/migrations/001_initial_schema.sql`

Incluir el DDL completo **con las siguientes correcciones al plan original:**

1. **Añadir `user_id` a `recipe_ingredients` y `menu_recipes`** (campo denormalizado para RLS simple)
2. **Crear trigger `updated_at`** para todas las tablas
3. **Incluir TODAS las RLS policies** explícitamente (no solo suppliers como ejemplo)
4. **Añadir índice en `suppliers(user_id)`** (faltaba en el plan original)

```sql
-- ── Trigger function para updated_at ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

Luego, para cada tabla, añadir:
```sql
CREATE TRIGGER set_updated_at BEFORE UPDATE ON <table_name>
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**RLS policies para recipe_ingredients (con user_id propio):**
```sql
CREATE POLICY "own_select" ON recipe_ingredients
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON recipe_ingredients
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON recipe_ingredients
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON recipe_ingredients
    FOR DELETE USING (auth.uid() = user_id);
```

(Mismo patrón para `menu_recipes` con `user_id` propio).

**Verificación:** Ejecutar el SQL en Supabase SQL Editor sin errores. Todas las tablas visibles en Table Editor. RLS habilitado (candado verde en cada tabla).

#### Paso 2.2 — Verificar RLS manualmente

Desde el SQL Editor, hacer un `SELECT * FROM ingredients;` como usuario anónimo → debe retornar 0 filas (RLS bloquea).

---

### FASE 3: Capa de datos — lectura desde DB

> **Objetivo:** Al hacer login, la app hidrata el store desde Supabase en lugar de usar solo localStorage.

#### Paso 3.1 — Crear carpeta `src/lib/db/` con módulos por entidad

Estructura de la carpeta:
```
src/lib/db/
  index.js          ← re-exports públicos
  client.js          ← supabase client singleton (mover de src/lib/supabase.js)
  suppliers.js       ← fetchSuppliers, insertSupplier, updateSupplier, deleteSupplier
  ingredients.js     ← fetchIngredients, insertIngredient, updateIngredient, deleteIngredient
  recipes.js         ← fetchRecipes, insertRecipeWithIngredients, updateRecipeWithIngredients, deleteRecipe
  menus.js           ← fetchMenus, insertMenuWithRecipes, updateMenuWithRecipes, deleteMenu
  calendar.js        ← fetchCalendarEvents, insertCalendarEvent, deleteCalendarEvent, setCalendarEventsForDate
  migration.js       ← migrateLocalDataToDb()
  transform.js       ← transformDbToStoreShape(), snake↔camel mappers
```

El punto de entrada `index.js` re-exporta las funciones que el store necesita:
```js
export { fetchAllUserData } from './transform';
export { insertSupplier, updateSupplierInDb, deleteSupplierFromDb } from './suppliers';
// ... etc
```

La función principal de lectura `fetchAllUserData` vive en `transform.js`:

```js
/**
 * @file dbQueries.js
 * @description Funciones de lectura/escritura a Supabase organizadas por entidad.
 */
import { supabase } from './supabase';

// ── Lectura completa (hidratación inicial) ──────────────────────────────
export async function fetchAllUserData() {
  const [suppliers, ingredients, recipes, recipeIngredients, menus, menuRecipes, calendarEvents] =
    await Promise.all([
      supabase.from('suppliers').select('*'),
      supabase.from('ingredients').select('*'),
      supabase.from('recipes').select('*'),
      supabase.from('recipe_ingredients').select('*'),
      supabase.from('menus').select('*'),
      supabase.from('menu_recipes').select('*'),
      supabase.from('calendar_events').select('*'),
    ]);

  // Verificar errores
  const results = { suppliers, ingredients, recipes, recipeIngredients, menus, menuRecipes, calendarEvents };
  for (const [key, result] of Object.entries(results)) {
    if (result.error) throw new Error(`Error fetching ${key}: ${result.error.message}`);
  }

  // Transformar a la forma que espera el store de Zustand
  return transformDbToStoreShape(results);
}
```

**La función `transformDbToStoreShape` es CRÍTICA:**
- Debe reconstruir la estructura anidada que el store espera:
  - `recipes[]` con su array `ingredients[]` inline (actualmente recipe ingredients son refs anidados en el recipe, no filas separadas)
  - `menus[]` con su array `recipeIds[]` (reconstruido desde `menu_recipes`)
  - `calendarEvents{}` como objeto `{ "YYYY-MM-DD": events[] }` (no como array plano)
- Mapear las column names de snake_case (DB) a camelCase (JS): `pack_size` → `packSize`, `current_stock` → `currentStock`, etc.
- Mapear `supplier_id` de ingredientes a `supplier` (nombre) para compatibilidad con las views existentes, **O** actualizar las views para usar `supplier_id` (más limpio pero más invasivo)

**Recomendación:** Para minimizar cambios en las views, la función de transformación debe reconstruir los objetos exactamente como los espera el store hoy, incluyendo el `supplier` name resuelto.

**Verificación:** `fetchAllUserData()` retorna un objeto con la misma forma que el store actual.

#### Paso 3.2 — Añadir acción `hydrate(data)` al store

```js
// En useStore.js, añadir:
hydrate: (data) => set({
  ingredients: data.ingredients,
  recipes: data.recipes,
  menus: data.menus,
  suppliers: data.suppliers,
  calendarEvents: data.calendarEvents,
}),
```

**NO cambiar el cart** — sigue siendo ephemeral (en memoria).

#### Paso 3.3 — Hidratar al detectar login en `useAuth.js`

En el `onAuthStateChange`, cuando el evento es `SIGNED_IN`:
1. Llamar `fetchAllUserData()`
2. Llamar `useStore.getState().hydrate(data)`

**Verificación:** Login → los datos del usuario aparecen. Refresh → los datos siguen (porque se re-hidratan desde Supabase al detectar la sesión existente).

#### Paso 3.4 — Banner de migración de datos locales

Si al hacer login, `localStorage.getItem('kitchencalc-store')` tiene datos Y la DB del usuario está vacía:
- Mostrar banner: _"We detected local data. Would you like to migrate it to your account?"_
- Botón "Migrate" → ejecutar la migración (ver Paso 3.5)
- Botón "Start Fresh" → ignorar y empezar vacío

#### Paso 3.5 — Función de migración de localStorage → DB

```js
export async function migrateLocalDataToDb(userId) {
  const localData = JSON.parse(localStorage.getItem('kitchencalc-store'));
  if (!localData?.state) return;

  // 1. Insertar suppliers (obtener map de oldId → newUUID)
  // 2. Insertar ingredients (resolver supplier name → supplier UUID)
  // 3. Insertar recipes (obtener map de oldId → newUUID)
  // 4. Insertar recipe_ingredients (con recipe UUID + ingredient UUID)
  // 5. Insertar menus (obtener map de oldId → newUUID)
  // 6. Insertar menu_recipes (con menu UUID + recipe UUID)
  // 7. Insertar calendar_events (con recipe/menu UUID resueltos)
  // 8. Limpiar localStorage: localStorage.removeItem('kitchencalc-store');
}
```

**Orden de inserción obligatorio** (por FKs):
1. `suppliers` (sin FKs)
2. `ingredients` (FK → suppliers)
3. `recipes` (sin FK a datos del usuario)
4. `recipe_ingredients` (FK → recipes, ingredients)
5. `menus` (sin FK a datos del usuario)
6. `menu_recipes` (FK → menus, recipes)
7. `calendar_events` (FK → recipes/menus)

**Mapeo de IDs clave:**
- `recipes`: IDs actuales son enteros (`1`, `2`, `3`) → generar UUIDs, mantener map
- `suppliers`: IDs actuales son names (`'SISCO'`) → generar UUIDs, mantener map
- `ingredients`: IDs actuales son `'ing-001'` → generar UUIDs, resolver `supplier` name → `supplier_id` UUID
- `menus`: IDs son `'menu-001'` → generar UUIDs, resolver `recipeIds` → UUIDs de recipes
- `calendar_events`: Aplanar `{ "YYYY-MM-DD": events[] }` → filas, resolver `itemId` → UUID correspondiente

**Verificación:** Migración completa sin errores. `fetchAllUserData()` retorna los mismos datos que tenía el localStorage.

---

### FASE 4: Escritura async a DB (Optimistic Updates)

> **Objetivo:** Cada acción de CRUD en el store persiste en Supabase. El UI se actualiza inmediatamente (optimistic) y hace rollback si falla.

#### Paso 4.1 — Implementar funciones de escritura en cada módulo de `src/lib/db/`

Cada módulo ya creado en el Paso 3.1 debe contener sus funciones CRUD. Ejemplo `suppliers.js`:
```js
import { supabase } from './client';

export async function insertSupplier(supplier) {
  const { data, error } = await supabase.from('suppliers').insert(supplier).select().single();
  return { data, error };
}
export async function updateSupplierInDb(id, updates) { ... }
export async function deleteSupplierFromDb(id) { ... }
```

Modules con relaciones complejas, ej `recipes.js`:
```js
export async function insertRecipeWithIngredients(recipe, ingredients) { ... }
export async function updateRecipeWithIngredients(recipeId, recipe, ingredients) { ... }
export async function deleteRecipeFromDb(id) { ... }
```

`menus.js`, `calendar.js`, `ingredients.js` — mismo patrón.

**Transformación JS → DB:** Cada módulo usa helpers de `transform.js` para convertir camelCase → snake_case y resolver relaciones (ej: `supplier` name → `supplier_id`).

#### Paso 4.2 — Refactorizar `useStore.js` con slices + patrón optimistic update

Estructurar el store con **Zustand slices** para evitar un archivo monolítico:
```
src/store/
  useStore.js              ← composición de slices
  slices/
    ingredientsSlice.js    ← estado + acciones async de ingredients
    recipesSlice.js        ← estado + acciones async de recipes
    menusSlice.js          ← estado + acciones async de menus
    suppliersSlice.js      ← estado + acciones async de suppliers
    calendarSlice.js       ← estado + acciones async de calendar
    cartSlice.js           ← estado de cart (ephemeral, sin DB)
    uiSlice.js             ← isHydrating, hydrationError, toasts[]
```

Cada slice sigue el patrón optimistic update:

```js
// src/store/slices/ingredientsSlice.js
import { insertIngredient } from '../../lib/db';
import { USE_SUPABASE } from '../../lib/db/client';

export const createIngredientsSlice = (set, get) => ({
  ingredients: [],

  addIngredient: async (ing) => {
    if (!USE_SUPABASE) {
      // Fallback localStorage — comportamiento original
      set(state => ({ ingredients: [...state.ingredients, ing] }));
      return;
    }

    // 1. Optimistic: actualizar UI inmediatamente con temp ID
    const tempId = `temp-${Date.now()}`;
    const optimistic = { ...ing, id: tempId };
    set(state => ({ ingredients: [...state.ingredients, optimistic] }));

    // 2. Persistir en DB
    const { data, error } = await insertIngredient(ing);

    if (error) {
      // 3a. Rollback
      set(state => ({ ingredients: state.ingredients.filter(i => i.id !== tempId) }));
      // Agregar toast de error
      const addToast = get().addToast;
      addToast?.({ type: 'error', message: `Failed to save ingredient: ${error.message}` });
    } else {
      // 3b. Reemplazar temp ID con el real
      set(state => ({
        ingredients: state.ingredients.map(i => i.id === tempId ? data : i)
      }));
    }
  },
  // updateIngredient, deleteIngredient — mismo patrón
});
```

`useStore.js` compone todos los slices:
```js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { USE_SUPABASE } from '../lib/db/client';
import { createIngredientsSlice } from './slices/ingredientsSlice';
import { createRecipesSlice } from './slices/recipesSlice';
// ... demás slices

const storeCreator = (...a) => ({
  ...createIngredientsSlice(...a),
  ...createRecipesSlice(...a),
  ...createMenusSlice(...a),
  ...createSuppliersSlice(...a),
  ...createCalendarSlice(...a),
  ...createCartSlice(...a),
  ...createUiSlice(...a),
  hydrate: (data) => a[0](data),  // set() all data from DB
});

export const useStore = create(
  USE_SUPABASE
    ? storeCreator
    : persist(storeCreator, { name: 'kitchencalc-store', version: 1 })
);
```

**Complejidad especial — Recipes:**
Al crear/editar una receta, se afectan DOS tablas: `recipes` + `recipe_ingredients`. Esto requiere:
1. INSERT recipe → obtener UUID
2. INSERT recipe_ingredients (con el recipe UUID)
3. Si alguno falla → rollback ambos

**Complejidad especial — Calendar Events:**
El store actual usa `setCalendarEvents(events)` que reemplaza TODO el objeto de eventos. En la DB, hay que:
- Comparar el estado anterior vs. nuevo
- DELETE eventos que ya no existen
- INSERT eventos nuevos
- O simplemente: DELETE all events for date + INSERT new ones (más simple, menos eficiente)

#### Paso 4.3 — Sistema de notificaciones de error

Crear un componente `Toast` o similar para mostrar errores de persistencia sin usar `alert()`. Opciones:
- Un estado global `errors[]` en el store
- Un componente `<ErrorToast>` que se renderiza en `App.jsx`
- Auto-dismiss después de 5 segundos

**Verificación:** Desconectar internet → intentar crear ingrediente → UI muestra el ingrediente temporalmente → rollback ocurre → toast de error aparece.

---

### FASE 5: Limpieza y estabilización

#### Paso 5.1 — Feature flag para Supabase

Crear una constante en configuración:
```js
export const USE_SUPABASE = Boolean(import.meta.env.VITE_SUPABASE_URL);
```

Las acciones del store verifican este flag:
- Si `true` → optimistic update + persist en Supabase
- Si `false` → comportamiento actual (solo Zustand + localStorage)

Esto permite desplegar sin Supabase configurado (desarrollo local sin DB).

#### Paso 5.2 — Remover `persist` middleware de Zustand (condicional)

Solo remover cuando `USE_SUPABASE=true`. Si las vars de Supabase no están configuradas, mantener localStorage como fallback.

```js
const storeCreator = (set, get) => ({ /* ... */ });

export const useStore = create(
  USE_SUPABASE
    ? storeCreator  // Sin persist — datos vienen de Supabase
    : persist(storeCreator, { name: 'kitchencalc-store', version: 1 })
);
```

#### Paso 5.3 — Loading states globales

Agregar al store:
```js
isHydrating: true,
hydrationError: null,
```

El `<AuthGate>` o un nuevo `<DataLoader>` muestra un spinner mientras `isHydrating === true`.

#### Paso 5.4 — Error de conexión UI

Si `fetchAllUserData()` falla, mostrar un estado de error con botón "Retry" en lugar de una app vacía.

#### Paso 5.5 — Actualizar `FORGE_MASTER_PLAN.md`

Secciones a actualizar:
- §3 Tech Stack: agregar `@supabase/supabase-js`
- §4.1 Directory Structure: agregar `src/lib/db/`, `src/store/slices/`, actualizar hooks
- §4.2 Data Flow: nuevo diagrama con Supabase
- §7 Global Store Schema: acciones async, hydrate, loading states, Zustand slices
- §10 Roadmap: marcar Phase 3 como IN PROGRESS/COMPLETE

#### Paso 5.6 — Actualizar `DEVELOPMENT_TRACKER.md`

Mover "Data persistence — Backend API" de Backlog a Completed.

---

### FASE 6: Preparación para multi-usuario y multi-kitchen (futuro)

> **Nota:** Esta fase NO se implementa ahora, pero el diseño de las fases anteriores debe ser compatible con ella.

#### Modelo futuro sugerido:

```sql
CREATE TABLE kitchens (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    owner_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at  timestamptz DEFAULT now()
);

CREATE TABLE kitchen_members (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kitchen_id  uuid REFERENCES kitchens(id) ON DELETE CASCADE NOT NULL,
    user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role        text NOT NULL CHECK (role IN ('owner', 'admin', 'chef', 'viewer')),
    invited_at  timestamptz DEFAULT now(),
    UNIQUE (kitchen_id, user_id)
);
```

**Migración futura:** Cuando se implemente multi-kitchen:
1. Crear tabla `kitchens` + `kitchen_members`
2. Para cada usuario existente, crear una kitchen default con su `user_id` como owner
3. Añadir `kitchen_id` a todas las tablas de datos (suppliers, ingredients, recipes, menus, calendar_events)
4. Migrar: UPDATE cada tabla SET `kitchen_id` = (kitchen default del user)
5. Cambiar RLS policies de `auth.uid() = user_id` a `kitchen_id IN (SELECT kitchen_id FROM kitchen_members WHERE user_id = auth.uid())`

**El diseño actual con `user_id` directo facilita esta migración** porque:
- Añadir una columna `kitchen_id` y poblarla es un solo UPDATE
- Las RLS policies se reescriben, no se parchean

---

## PARTE 3: CHECKLIST DE VERIFICACIÓN END-TO-END

> Ejecutar después de completar la Fase 5.

- [ ] `npm run dev` → app carga con modal de auth
- [ ] Crear cuenta nueva → modal desaparece, app muestra estado vacío (o demo data si se implementa)
- [ ] Crear un supplier → persiste al refrescar
- [ ] Crear un ingrediente con ese supplier → persiste al refrescar
- [ ] Crear una receta con ingredientes → persiste al refrescar
- [ ] Crear un menú con recetas → persiste al refrescar
- [ ] Calcular requisición de receta → agregar al cart → cart funciona
- [ ] Generar PDF desde cart → PDF se genera correctamente
- [ ] Agregar evento al calendario → persiste al refrescar
- [ ] Cerrar sesión → datos desaparecen de la UI
- [ ] Iniciar sesión de nuevo → TODOS los datos reaparecen
- [ ] Abrir en incognito → crear segunda cuenta → datos aislados por usuario
- [ ] Desconectar internet → intentar crear dato → rollback + error toast
- [ ] `npm run build` → sin errores ni warnings
- [ ] Deploy a Vercel con env vars configuradas → funciona en producción

---

## PARTE 4: ARCHIVOS A CREAR/MODIFICAR (RESUMEN)

| Archivo | Acción | Fase |
|---------|--------|------|
| `.env.local` | CREAR | 0 |
| `.gitignore` | VERIFICAR | 0 |
| `src/lib/db/client.js` | CREAR (supabase singleton) | 0 |
| `src/hooks/useAuth.js` | CREAR | 1 |
| `src/components/AuthGate.jsx` | CREAR | 1 |
| `src/App.jsx` | MODIFICAR | 1 |
| `src/components/Sidebar.jsx` | MODIFICAR (logout button) | 1 |
| `supabase/migrations/001_initial_schema.sql` | CREAR | 2 |
| `src/lib/db/index.js` | CREAR (re-exports) | 3 |
| `src/lib/db/transform.js` | CREAR (DB ↔ Store shape) | 3 |
| `src/lib/db/suppliers.js` | CREAR (CRUD suppliers) | 3-4 |
| `src/lib/db/ingredients.js` | CREAR (CRUD ingredients) | 3-4 |
| `src/lib/db/recipes.js` | CREAR (CRUD recipes + recipe_ingredients) | 3-4 |
| `src/lib/db/menus.js` | CREAR (CRUD menus + menu_recipes) | 3-4 |
| `src/lib/db/calendar.js` | CREAR (CRUD calendar_events) | 3-4 |
| `src/lib/db/migration.js` | CREAR (localStorage → DB) | 3 |
| `src/store/useStore.js` | REFACTORIZAR (composición de slices) | 3-4 |
| `src/store/slices/ingredientsSlice.js` | CREAR | 4 |
| `src/store/slices/recipesSlice.js` | CREAR | 4 |
| `src/store/slices/menusSlice.js` | CREAR | 4 |
| `src/store/slices/suppliersSlice.js` | CREAR | 4 |
| `src/store/slices/calendarSlice.js` | CREAR | 4 |
| `src/store/slices/cartSlice.js` | CREAR | 4 |
| `src/store/slices/uiSlice.js` | CREAR (hydrating, toasts) | 4-5 |
| `src/components/MigrationBanner.jsx` | CREAR | 3 |
| `src/components/Toast.jsx` | CREAR | 4 |
| `src/components/DataLoader.jsx` | CREAR (opcional) | 5 |
| `FORGE_MASTER_PLAN.md` | ACTUALIZAR | 5 |
| `DEVELOPMENT_TRACKER.md` | ACTUALIZAR | 5 |

---

## PARTE 5: REGLAS PARA EL AGENTE IMPLEMENTADOR

1. **Leer** `FORGE_MASTER_PLAN.md` y `DEVELOPMENT_TRACKER.md` antes de cualquier modificación.
2. **NO agregar dependencias** sin aprobación explícita (`@supabase/supabase-js` es la única nueva aprobada para esta migración).
3. **Mantener retrocompatibilidad** — la app debe funcionar sin Supabase configurado (feature flag `USE_SUPABASE`).
4. **No romper el calc engine** (`mockData.js`) — la lógica de cálculo es independiente de la DB.
5. **Respetar naming conventions** — JSDoc en español, código en inglés, camelCase en JS, snake_case en DB.
6. **Verificar compilación** (`npm run build`) después de cada fase.
7. **No hacer git commit/push** sin instrucción explícita del usuario.
8. **Las views NO deben saber sobre Supabase** — toda la interacción con la DB ocurre en los slices del store y en `src/lib/db/`. Las views siguen usando `useStore()` exactamente igual.
9. **Un módulo por entidad** — no crear archivos monolíticos. Cada entidad tiene su propio módulo en `src/lib/db/` y su propio slice en `src/store/slices/`.
10. **Diseñar para extensibilidad** — cada nueva entidad futura (budget, staff, activity, import/export) debe poder agregarse como: nueva tabla SQL + nuevo módulo en `db/` + nuevo slice en `store/slices/`, sin modificar archivos existentes.

---

## PARTE 6: EXTENSIBILIDAD Y FUNCIONES FUTURAS

> Esta sección documenta funcionalidades futuras que NO se implementan ahora, pero cuyo diseño debe ser compatible con la arquitectura de las Fases 0-5.

### 6.1 Import / Export de datos (CSV / Excel)

**Objetivo futuro:** Permitir al usuario exportar e importar ingredientes, recetas, inventarios, proveedores y menús.

**Arquitectura propuesta:**
```
src/lib/db/
  export.js      ← exportToCSV(), exportToExcel()
  import.js      ← importFromCSV(), importFromExcel(), validateImportData()
```

**Complejidad por entidad:**

| Entidad | Complejidad export | Formato recomendado | Notas |
|---------|-------------------|---------------------|-------|
| Suppliers | ✅ Fácil | CSV plano | Tabla plana directa |
| Ingredients | ✅ Fácil | CSV plano | Resolver `supplier_id` → name al exportar, name → `supplier_id` al importar |
| Menus | 🟡 Moderado | CSV con `recipeIds` como `name1\|name2` | O segunda hoja Excel |
| Recipes | 🔴 Complejo | Excel multi-hoja | Sheet 1: datos de receta. Sheet 2: ingredientes con `inputMode`, `portionByGroup` (A,B,C como columnas), `quantityForBase` |
| Calendar Events | 🟡 Moderado | CSV (date, slot, type, item_name) | Resolver recipe/menu name ↔ UUID |

**Formato Excel para recetas (propuesta):**

*Sheet 1 — Recipes:*
| name | category | description | image | rating | baseServings | portionFactor_A | portionFactor_B | portionFactor_C |
|------|----------|-------------|-------|--------|--------------|-----------------|-----------------|------------------|
| Chicken Piccata | Main Course | Classic Italian... | 🍗 | 4 | | | | |
| Pasta Bolognese | Main Course | Rich meat-sauce... | 🍝 | 5 | 20 | 0.6 | 1.0 | 0.75 |

*Sheet 2 — Recipe Ingredients:*
| recipe_name | ingredient_name | inputMode | portion_A | portion_B | portion_C | quantityForBase | wastePct |
|-------------|-----------------|-----------|-----------|-----------|-----------|-----------------|----------|
| Chicken Piccata | Chicken Breast | per-person | 120 | 200 | 150 | | 0 |
| Pasta Bolognese | Fusilli Pasta | yield | | | | 2000 | 0 |

**Estrategia de importación:**
- **Lookup por nombre:** Al importar, resolver names → UUIDs. Si un ingredient/recipe no existe → opción de crear automáticamente o error.
- **Duplicados:** Definir estrategia configurable: `upsert by name` (actualiza si existe) vs `create new` (siempre crea).
- **Validación previa:** `validateImportData()` verifica estructura, tipos y referencias antes de insertar. Muestra preview de cambios al usuario.

**Reutilización del código:** `transform.js` ya contiene la lógica de conversión DB ↔ Store. Para export/import se extiende con `transformStoreToExcel()` y `transformExcelToDb()`.

**Dependencia futura:** Librería como `xlsx` o `exceljs` para generación de Excel. Requiere aprobación del usuario cuando se implemente.

### 6.2 Supabase Realtime (colaboración multi-usuario)

**Problema:** Si dos chefs usan la misma cuenta (o la misma kitchen en multi-kitchen), los cambios de uno no se ven en la sesión del otro en tiempo real.

**Solución futura:** Supabase tiene **Realtime subscriptions** que permiten escuchar cambios en tablas:
```js
// Ejemplo futuro en un slice o hook
const channel = supabase
  .channel('ingredients-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' },
    (payload) => {
      // Actualizar store automáticamente cuando otro usuario hace cambios
      switch (payload.eventType) {
        case 'INSERT': get().addIngredientLocal(payload.new); break;
        case 'UPDATE': get().updateIngredientLocal(payload.new); break;
        case 'DELETE': get().removeIngredientLocal(payload.old.id); break;
      }
    }
  )
  .subscribe();
```

**No implementar ahora** — requiere multi-kitchen (Fase 6) primero. Pero el patrón de slices ya separa las acciones locales de las persistidas, facilitando la integración.

### 6.3 Funciones que se agregan sin conflicto (post-migración)

| Función | Módulos nuevos | Impacto en existentes |
|---------|---------------|----------------------|
| Import/Export CSV/Excel | `db/export.js`, `db/import.js` + view/modal | Ninguno |
| Budget Module | `db/budget.js`, `slices/budgetSlice.js`, `BudgetView.jsx` | Solo habilitar botón en Sidebar |
| Staff Module | `db/staff.js`, `slices/staffSlice.js`, `StaffView.jsx` | Solo habilitar botón en Sidebar |
| Activity / Audit Log | `db/activity.js`, `slices/activitySlice.js` | Ninguno |
| Fotos de recetas | Supabase Storage + columna `image_url` en `recipes` | Migrar emoji → URL en transform |
| Historial/versiones de recetas | Tabla `recipe_versions` + módulo | Ninguno |

### 6.4 Funciones que requieren cambios invasivos

| Función | Cambio requerido | Magnitud |
|---------|-----------------|----------|
| Multi-kitchen / roles | Fase 6 de este plan — cambiar RLS en TODAS las tablas | 🔴 Grande |
| Offline-first / PWA | Reemplazar optimistic updates por cola de operaciones pendientes + sync engine | 🔴 Grande |
| Migración a TypeScript | Tipar todos los slices, módulos DB, y componentes | 🟡 Gradual |

---

*Plan de ejecución creado: 2026-04-14*
*v2 actualizado: 2026-04-14 — incorpora observaciones sobre import/export, modularidad y extensibilidad*
*Basado en análisis crítico del plan de migración original*
