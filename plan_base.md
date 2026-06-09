# plan_base.md — Diagnóstico de la base de datos (Supabase) y plan de corrección

> **Para el agente que va a corregir:** este documento es de **diagnóstico**. Describe cómo funciona
> la capa de datos hoy, los fallos detectados (priorizados por severidad) y la corrección sugerida de
> cada uno, con archivo:línea reales. **No** asumas contexto previo: lee primero la sección
> "Arquitectura DB" y luego ataca los bugs en orden 🔴 → 🟠 → 🟡.
>
> **Restricciones de estilo del proyecto (obligatorias):** JS puro (sin TypeScript), sin dependencias
> nuevas, estilos inline reutilizando `INPUT_STYLE` de `src/constants/theme.js`, toasts vía
> `useStore.getState().addToast({ type, message })`, comentarios en español y nombres de
> variables/funciones en inglés.

---

## 1. Arquitectura DB — cómo funciona hoy

- **Feature flag:** `USE_SUPABASE` en [`src/lib/db/client.js`](src/lib/db/client.js) =
  `Boolean(VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY)`.
  - `true`  → la app usa Supabase para persistencia + auth; el store **no** usa `persist`.
  - `false` → comportamiento original: Zustand + `persist` (localStorage `kitchencalc-store`) + `mockData`.
  - **No existe `.env`/`.env.local` versionado.** En un checkout limpio la app corre en **modo local**.
- **Esquema SQL** en `supabase/migrations/`:
  - [`001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql): 7 tablas
    (`suppliers`, `ingredients`, `recipes`, `recipe_ingredients`, `menus`, `menu_recipes`,
    `calendar_events`), RLS por `user_id` (políticas own_select/insert/update/delete), índices y
    triggers `updated_at`.
  - [`002_calendar_groups.sql`](supabase/migrations/002_calendar_groups.sql): añade
    `groups jsonb not null default '{"A":0,"B":0,"C":0}'` a `calendar_events`. **Se aplica manualmente**
    en el SQL Editor de Supabase.
- **Adaptador único** [`src/lib/db/transform.js`](src/lib/db/transform.js): mappers DB↔store
  (snake_case ↔ camelCase, reconstrucción de relaciones anidadas) y `fetchAllUserData()` que hidrata
  todo en paralelo. **Las views nunca hablan con Supabase directamente.**
- **CRUD por entidad:** `suppliers.js`, `ingredients.js`, `recipes.js`, `menus.js`, `calendar.js`,
  `bulk.js`, `migration.js`, `errors.js`, todos reexportados por
  [`src/lib/db/index.js`](src/lib/db/index.js).
- **Store** [`src/store/useStore.js`](src/store/useStore.js): cada acción hace **update optimista** +
  llamada a la DB; si falla, revierte y muestra toast. Reconcilia el id local con el de la DB cuando
  difieren (`data.id !== x.id`). En modo local solo muta estado.
- **Auth/hidratación** [`src/hooks/useAuth.js`](src/hooks/useAuth.js) +
  [`src/hooks/AuthContext.jsx`](src/hooks/AuthContext.jsx): `useAuth()` se ejecuta **una sola vez**
  (vía `AuthProvider`), hidrata el store con `useStore.getState()` y guardas `isHydrating`/`hasHydrated`
  para evitar doble hidratación en StrictMode.
- **IDs de entidades nuevas:** ingredientes ([`InventoryView.jsx:88`](src/views/InventoryView.jsx#L88)),
  recetas ([`CreateRecipeView.jsx:503`](src/views/CreateRecipeView.jsx#L503)), menús
  ([`CreateMenuView.jsx:92`](src/views/CreateMenuView.jsx#L92)) y eventos de calendario
  ([`CalendarView.jsx:599`](src/views/CalendarView.jsx#L599)) usan `crypto.randomUUID()` → UUID válidos.
  Los **suppliers** nuevos usan un id derivado del nombre (no-UUID), por eso
  [`suppliers.js`](src/lib/db/suppliers.js) **quita el `id`** antes de insertar y deja que Postgres lo genere.

---

## 2. Cómo verificar el estado real de la DB

Ejecuta en el **SQL Editor** de Supabase antes de tocar nada:

```sql
-- a) ¿Existe la columna groups en calendar_events? (bug 🔴 #1)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'calendar_events'
ORDER BY ordinal_position;

-- b) ¿Hay trigger updated_at sobre calendar_events SIN columna updated_at? (bug 🔴 #2)
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'public.calendar_events'::regclass AND NOT tgisinternal;

-- c) Confirmar que RLS está activo en todas las tablas
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

Resultado esperado tras las correcciones: (a) incluye `groups`; (b) o no hay trigger, o existe la
columna `updated_at`; (c) `rowsecurity = true` en las 7 tablas.

---

## 3. Prerrequisitos para activar/probar Supabase

1. **Aplicar la migración 002.** Si la query (a) **no** muestra `groups`, ejecuta el contenido de
   [`002_calendar_groups.sql`](supabase/migrations/002_calendar_groups.sql) en el SQL Editor.
2. **Crear `.env.local`** en la raíz (ver bug 🟡 #9) con:
   ```
   VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-key>
   ```
   Sin esto, `USE_SUPABASE` es `false` y **ningún** flujo de Supabase se ejercita.
3. Reiniciar `npm run dev` tras crear/editar `.env.local` (Vite solo lee env al arrancar).

---

## 4. Bugs priorizados

### 🔴 CRÍTICO #1 — La columna `groups` puede no existir en la DB del usuario
- **Dónde:** escritura/lectura de `groups` en
  [`transform.js:201`](src/lib/db/transform.js#L201),
  [`calendar.js:23`](src/lib/db/calendar.js#L23) y [`calendar.js:66`](src/lib/db/calendar.js#L66),
  [`migration.js:222`](src/lib/db/migration.js#L222).
- **Síntoma:** todo insert/sync de `calendar_events` falla con `column "groups" does not exist`; el
  calendario "no guarda" y aparece toast de error al planificar comidas.
- **Causa raíz:** el código asume la migración 002 aplicada, pero es un paso manual que puede faltar.
- **Corrección:** ejecutar la query (a) de la sección 2; si falta `groups`, aplicar
  [`002_calendar_groups.sql`](supabase/migrations/002_calendar_groups.sql). No requiere cambio de código.

### 🔴 CRÍTICO #2 — Trigger `updated_at` sobre una columna inexistente en `calendar_events`
- **Dónde:** [`001_initial_schema.sql:264-266`](supabase/migrations/001_initial_schema.sql#L264) crea
  `set_calendar_events_updated_at` que ejecuta `update_updated_at_column()` (hace `NEW.updated_at = now()`),
  pero la tabla `calendar_events` (líneas 233-248) **solo tiene `created_at`**, no `updated_at`.
- **Síntoma:** cualquier `UPDATE` a `calendar_events` falla con
  `record "new" has no field "updated_at"`. Hoy **no se dispara** porque el flujo usa DELETE+INSERT
  (ver bug #6), pero es una mina: cualquier futuro `.update()` sobre esa tabla romperá.
- **Corrección (elige una, crea `003_fix_calendar_updated_at.sql`):**
  - **Opción A (recomendada, consistente con las demás tablas):** añadir la columna
    ```sql
    alter table public.calendar_events
      add column if not exists updated_at timestamptz default now();
    ```
  - **Opción B:** eliminar el trigger si no se quiere `updated_at` en esta tabla
    ```sql
    drop trigger if exists set_calendar_events_updated_at on public.calendar_events;
    ```
  - Corregir además el `.sql` fuente para futuros entornos limpios.

### 🔴 CRÍTICO #3 — `migrateLocalDataToDb` descarta TODOS los eventos del calendario
- **Dónde:** [`migration.js:198-225`](src/lib/db/migration.js#L198) (bloque "7. Calendar Events").
- **Síntoma:** al migrar de localStorage a Supabase, las recetas/menús/ingredientes/proveedores se
  migran pero **el calendario queda vacío** (pérdida silenciosa, sin error).
- **Causa raíz:** el bloque resuelve el item con `ev.itemId`
  ([líneas 205-209](src/lib/db/migration.js#L205)), pero el store guarda los eventos con **objetos
  anidados** `ev.recipe` / `ev.menu` (ver cómo se construye el evento en
  [`CalendarView.jsx:79`](src/views/CalendarView.jsx#L79) y
  [`:85`](src/views/CalendarView.jsx#L85) — `{ type, slotKey, recipe, ... }` / `{ type, slotKey, menu, menuRecipes, ... }`).
  `ev.itemId` es `undefined` → `recipeId`/`menuId` quedan `null` →
  [`if (!recipeId && !menuId) continue;`](src/lib/db/migration.js#L212) salta cada evento.
- **Corrección:** resolver el id desde el objeto anidado, con fallback a `itemId` por compatibilidad:
  ```js
  if (ev.type === 'recipe') {
    const legacyId = ev.recipe?.id ?? ev.itemId;
    recipeId = recipeIdMap.get(legacyId) ?? recipeIdMap.get(String(legacyId));
  } else if (ev.type === 'menu') {
    const legacyId = ev.menu?.id ?? ev.itemId;
    menuId = menuIdMap.get(legacyId);
  }
  ```
  > Nota: `slot: ev.slot ?? ev.slotKey` ([línea 217](src/lib/db/migration.js#L217)) ya está bien.

### 🟠 IMPORTANTE #4 — Cambiar el proveedor de un ingrediente no se persiste
- **Dónde:** [`InventoryView.jsx:86-98`](src/views/InventoryView.jsx#L86) hace
  `onSave({ ...ingredient, supplier: form.supplier, ... })`, arrastrando el `supplierId` previo;
  [`transform.js:262`](src/lib/db/transform.js#L262) en `storeIngredientToDb` usa
  `ingredient.supplierId ?? supplierMap.get(ingredient.supplier)`.
- **Síntoma:** en modo Supabase, editar el proveedor de un ingrediente existente **no actualiza**
  `supplier_id` en la DB (el `supplierId` rancio del spread gana sobre el nombre nuevo).
- **Corrección (una de las dos):**
  - En `InventoryView.handleSave`, **no** propagar el `supplierId` viejo cuando el nombre cambió:
    p. ej. construir el objeto sin `supplierId` (o ponerlo `null`) para que `storeIngredientToDb`
    lo resuelva desde el nombre. Cuidado con no incluir `supplierId` en el spread `...ingredient`
    si el form puede cambiar el proveedor.
  - O en `storeIngredientToDb`, **priorizar el nombre**: resolver siempre por
    `supplierMap.get(ingredient.supplier)` cuando exista, y usar `supplierId` solo como fallback.
    (Verifica que esto no rompa el alta de ingredientes recién creados.)

### 🟠 IMPORTANTE #5 — `buildCartFromCalendar` filtra por id de proveedor contra el nombre
- **Dónde:** [`useStore.js:327-345`](src/store/useStore.js#L327) — `supplierFilter` es `Set<supplierId>`
  pero filtra `supplierFilter.has(ingredient.supplier)` ([línea 331](src/store/useStore.js#L331)),
  y `ingredient.supplier` es el **nombre** (ver `dbIngredientToStore` en
  [`transform.js:126`](src/lib/db/transform.js#L126)). El `GeneratePOModal` arma el Set con IDs de
  proveedor (descrito en `agent-sessions/2026-06-08_cart-po-calendar-implementation.md`, §2.3).
- **Síntoma:** en modo local "funciona" (en mockData `supplier.id === supplier.name`), pero en
  **Supabase** (id = UUID, supplier = nombre) el filtro **excluye todos los ingredientes** → el carrito
  generado sale vacío al filtrar por proveedor.
- **Corrección:** unificar la clave. Recomendado: filtrar por `ingredient.supplierId`
  (existe tras hidratación, ver [`transform.js:127`](src/lib/db/transform.js#L127)) y asegurar que el
  modal construye `supplierFilter` con los mismos IDs. Alternativa: construir el Set con **nombres**
  de proveedor. Lo importante es que ambos lados usen el mismo identificador en los dos modos.

### 🟠 IMPORTANTE #6 — `setCalendarEventsForDate` no es atómico (riesgo de pérdida de datos)
- **Dónde:** [`calendar.js:45-74`](src/lib/db/calendar.js#L45) — primero DELETE de toda la fecha,
  luego INSERT de los nuevos; el store revierte en memoria si el INSERT falla
  ([`useStore.js:367-373`](src/store/useStore.js#L367)).
- **Síntoma:** si el INSERT falla **después** del DELETE, la DB queda con ese día **vacío** aunque el
  store muestre los eventos previos → al recargar, los eventos de ese día se pierden (divergencia
  local↔DB).
- **Corrección (de menor a mayor robustez):**
  1. Mínimo: documentar el riesgo y validar los `rows` antes de borrar (p. ej. abortar si algún evento
     no resuelve `recipe_id`/`menu_id`).
  2. Mejor: envolver DELETE+INSERT en una **función RPC** de Postgres (transacción real) y llamarla con
     `supabase.rpc(...)`.
  3. Si se mantiene el enfoque actual, tras un INSERT fallido **re-hidratar** ese día desde la DB para
     que el store refleje el estado real (vacío) en lugar de un `prev` que ya no existe en la DB.

### 🟡 MENOR #7 — Import muerto en `migration.js`
- **Dónde:** [`migration.js:16`](src/lib/db/migration.js#L16) importa `storeRecipeIngredientsToDb`
  pero el archivo arma las filas de `recipe_ingredients` inline ([líneas 125-150](src/lib/db/migration.js#L125))
  y **nunca** lo usa.
- **Síntoma:** error de lint `no-unused-vars` (ya documentado como pendiente en la sesión 2026-06-08).
- **Corrección:** eliminar el import. (Confirmado: la función sí se usa en
  [`recipes.js`](src/lib/db/recipes.js) y [`bulk.js`](src/lib/db/bulk.js), así que **no** borrar la
  función en `transform.js`, solo el import sobrante en `migration.js`.)

### 🟡 MENOR #8 — `AuthContext.jsx` rompe React Fast Refresh
- **Dónde:** [`AuthContext.jsx`](src/hooks/AuthContext.jsx) exporta el componente `AuthProvider` **y**
  el hook `useAuthContext` (no-componente) en el mismo archivo.
- **Síntoma:** warning de lint `react-refresh/only-export-components` (ya documentado).
- **Corrección:** mover el contexto y `useAuthContext` a un archivo no-componente
  (p. ej. `src/hooks/authContext.js`) y dejar `AuthContext.jsx` exportando solo `AuthProvider`.
  Actualizar los imports de los consumidores. **Probar login/logout** en ambos modos tras el refactor
  (este archivo es central para auth).

### 🟡 MENOR #9 — Falta `.env.example` y documentación de variables
- **Síntoma:** no hay forma evidente de saber qué variables activan Supabase; fricción para nuevos
  entornos.
- **Corrección:** crear `.env.example` con `VITE_SUPABASE_URL=` y `VITE_SUPABASE_ANON_KEY=` (sin
  valores), y una nota en el README explicando que sin ellas la app corre en modo local.
  Verificar que `.env.local` esté en `.gitignore`.

### 🟡 MENOR #10 — Reconciliación de id ausente para `calendar_events`
- **Dónde:** suppliers/ingredients/recipes/menus reconcilian el id optimista con el de la DB
  (p. ej. [`useStore.js:97`](src/store/useStore.js#L97)), pero los eventos de calendario usan el id
  `crypto.randomUUID()` optimista y `setCalendarEventsForDate` **no devuelve** los ids reales
  insertados ([`calendar.js:58-73`](src/lib/db/calendar.js#L58)).
- **Síntoma:** el id local del evento difiere del de la DB hasta la próxima hidratación. Hoy es
  inofensivo porque el borrado se hace por fecha (no por id de evento), pero es deuda a documentar por
  si en el futuro se borra/edita un evento individual por id.
- **Corrección:** opcional. Si se necesita, hacer que `setCalendarEventsForDate` retorne las filas
  insertadas (`.select()`) y reconciliar los ids en el store.

---

## 5. Checklist de verificación end-to-end

Probar **en los dos modos** (local sin `.env.local`, y Supabase con `.env.local` + migraciones aplicadas):

**Modo local (`USE_SUPABASE=false`):**
- [ ] Arranca con mockData; CRUD de ingredientes/recetas/menús/proveedores muta el estado.
- [ ] Calendario: añadir/quitar comidas y grupos A/B/C funciona.
- [ ] Generar orden de compra desde rango del calendario → carrito con `R > 0`.

**Modo Supabase (`USE_SUPABASE=true`):**
- [ ] Login/logout y **una sola** hidratación (sin doble fetch en StrictMode).
- [ ] Alta + edición + borrado de cada entidad persiste en la DB (revisar en el Table Editor).
- [ ] **Editar el proveedor de un ingrediente** y confirmar que `supplier_id` cambia en la DB (bug #4).
- [ ] Planificar comidas en el calendario **no** lanza error de `groups` (bug #1) y persiste tras recargar.
- [ ] Forzar un INSERT inválido de calendario y comprobar que el día no queda vacío en la DB (bug #6).
- [ ] **Generar orden de compra filtrando por un proveedor** devuelve ingredientes (bug #5).
- [ ] Migración localStorage→Supabase: confirmar que **los eventos de calendario llegan** (bug #3).

**Calidad:**
- [ ] `npm run lint` limpio (resuelve bugs #7 y #8).
- [ ] `npm run build` sin errores.

---

## 6. Notas de estilo (recordatorio)

- React 19 + Vite + Zustand + Supabase, **JS puro (sin TypeScript)**, sin dependencias nuevas.
- Estilos inline; reutilizar `INPUT_STYLE` de `src/constants/theme.js`; clases globales
  `btn-primary`, `btn-ghost`, `btn-teal`, `glass-card`, `fade-in-up`.
- Toasts: `useStore.getState().addToast({ type: 'error'|'success', message: '...' })`.
- Comentarios en español; variables y funciones en inglés.
- Las migraciones SQL nuevas van en `supabase/migrations/` numeradas (`003_...`, `004_...`) y se aplican
  manualmente en el SQL Editor.
