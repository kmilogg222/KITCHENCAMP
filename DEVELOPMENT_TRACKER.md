# DEVELOPMENT_TRACKER — KitchenCalc

> **Documento de estado dinámico.** Actualizar al iniciar, completar o descubrir cualquier tarea.
> Este archivo es la fuente de verdad del estado actual del proyecto.
> Reemplaza: `tasks.md`

---

## Current Sprint

**Sprint Goal:** Fase 3 completa — Supabase backend + Auth + optimistic updates
**Started:** 2026-04-15
**Completed:** 2026-04-15

| Task | Owner | Status |
|------|-------|--------|
| Instalar `@supabase/supabase-js` | AI Agent | ✅ Done |
| Crear cliente singleton + feature flag `USE_SUPABASE` | AI Agent | ✅ Done |
| Crear `001_initial_schema.sql` (7 tablas + RLS) | AI Agent | ✅ Done |
| Ejecutar SQL en Supabase Dashboard | Usuario | ✅ Done |
| Crear `.env.local` con credenciales | Usuario | ✅ Done |
| Auth modal `AuthGate.jsx` + `useAuth.js` + `AuthContext.jsx` | AI Agent | ✅ Done |
| Capa de datos `src/lib/db/` (8 módulos) | AI Agent | ✅ Done |
| Refactorizar `useStore.js` con optimistic updates | AI Agent | ✅ Done |
| `MigrationBanner.jsx` + migrar datos locales → DB | AI Agent | ✅ Done |
| `Toast.jsx` sistema de notificaciones | AI Agent | ✅ Done |
| Actualizar documentación (FORGE + TRACKER) | AI Agent | ✅ Done |

---

## ✅ Completed Features

> Módulos funcionales y probados en producción.

### Backend / Auth — Supabase (2026-04-15)

- [x] **`@supabase/supabase-js` instalado** — aprobado el 2026-04-15
- [x] **`src/lib/db/client.js`** — cliente singleton de Supabase. Exporta `USE_SUPABASE` (feature flag basado en vars de entorno). Sin `.env.local` la app funciona exactamente igual que antes.
- [x] **`supabase/migrations/001_initial_schema.sql`** — DDL completo: 7 tablas (`suppliers`, `ingredients`, `recipes`, `recipe_ingredients`, `menus`, `menu_recipes`, `calendar_events`), triggers `updated_at` en todas, RLS activado con policies explícitas de SELECT/INSERT/UPDATE/DELETE por `user_id`.
- [x] **`src/lib/db/transform.js`** — `fetchAllUserData()` (fetch paralelo de las 7 tablas) + todos los mappers bidireccionales DB↔Store (snake_case↔camelCase). Reconstruye objetos anidados (`ingredients[]` en recipe, `recipeIds[]` en menu, `{YYYY-MM-DD: events[]}` en calendar).
- [x] **`src/lib/db/suppliers.js`** — `insertSupplier`, `updateSupplierInDb`, `deleteSupplierFromDb`
- [x] **`src/lib/db/ingredients.js`** — CRUD completo + `updateStockInDb`
- [x] **`src/lib/db/recipes.js`** — CRUD con manejo de `recipe_ingredients` (rollback manual si falla el insert de junction table)
- [x] **`src/lib/db/menus.js`** — CRUD con manejo de `menu_recipes` ordenada por `position`
- [x] **`src/lib/db/calendar.js`** — insert/delete/`setForDate` (estrategia delete+insert por fecha)
- [x] **`src/lib/db/migration.js`** — `migrateLocalDataToDb()`: migra datos de localStorage → Supabase respetando el orden de FKs, resolviendo IDs legacy (strings/enteros) a UUIDs. `hasLocalData()` + `isUserDbEmpty(userId)`.
- [x] **`src/lib/db/index.js`** — re-exports públicos del módulo `db/`.

### Import / Export System (2026-04-20)

- [x] **`src/lib/io/registry.js`** — Entity Registry (5 entidades) + Format Registry (JSON). Diseño extensible: agregar entidad = 1 objeto nuevo.
- [x] **`src/lib/io/validate.js`** — Validación de esquema por entidad antes de importar. Verifica campos requeridos + validaciones específicas (units, packSize, arrays anidados).
- [x] **`src/lib/io/idRemap.js`** — Reasignación de UUIDs al importar. Usa `crypto.randomUUID()`. Mapas de traducción oldId→newId para resolver FKs cruzadas (recipe→ingredient, menu→recipe, calendar→recipe/menu).
- [x] **`src/lib/io/conflicts.js`** — Resolución de duplicados: skip (default), overwrite, rename.
- [x] **`src/lib/io/formats/json.js`** — Serialize/deserialize JSON con metadata (`_meta.app`, `_meta.version`, `_meta.exportedAt`).
- [x] **`src/lib/io/index.js`** — Public API: `exportData()`, `previewImport()`, `commitImport()`. Tratamiento especial para calendar (Object merge) e ingredients (limpiar supplierId).
- [x] **`src/lib/db/bulk.js`** — Funciones de batch insert para Supabase (reservado para future CSV optimization).
- [x] **`src/views/DataPortalView.jsx`** — Vista con secciones Export (entity selector grid, format info, download) + Import (drag & drop zone, file reader, error display).
- [x] **`src/components/ImportPreviewModal.jsx`** — Modal glassmorphism con preview por entidad (valid/invalid counts), conflict strategy selector, progress indicator, result summary.
- [x] **Integración** — Ruta `/data` lazy-loaded en App.jsx. Nav item "Data" con icono `ArrowUpDown` en Sidebar.jsx.

### Auth UI (2026-04-15)

- [x] **`src/hooks/useAuth.js`** — sesión, `signIn`, `signUp`, `signOut`. Hidrata el store en `SIGNED_IN` via `useStore.getState()` (imperativo, evita dependencias circulares). Ref guard contra doble-hidratación en StrictMode. Detecta si hay datos locales para migrar.
- [x] **`src/hooks/AuthContext.jsx`** — `<AuthProvider>` ejecuta `useAuth()` una sola vez. `useAuthContext()` distribuye el estado a todos los hijos. Evita el deadlock de `gotrue-js` por suscripciones duplicadas.
- [x] **`src/components/AuthGate.jsx`** — modal glass-card de login/signup con tabs Sign In / Sign Up, toggle mostrar contraseña, validación inline, error messages de Supabase. `SplashLoader` (spinner) mientras se verifica la sesión. Pasa directo si `USE_SUPABASE=false`.
- [x] **`src/components/MigrationBanner.jsx`** — banner fijo en bottom que aparece si el usuario tiene datos en localStorage pero la DB está vacía. Botones: "Move to my account" (migra) o "Start Fresh" (borra localStorage).
- [x] **`src/components/Toast.jsx`** — sistema de notificaciones de error/éxito/info. Auto-dismiss a 5s. Animación de entrada. Lee del store (`useStore`).

### Store refactorizado (2026-04-15)

- [x] **`src/store/useStore.js`** — Reescrito completamente:
  - `USE_SUPABASE=true` → sin `persist`, datos inician vacíos, se llenan desde Supabase.
  - `USE_SUPABASE=false` → `persist` middleware → localStorage (comportamiento original, retrocompatible).
  - Todas las acciones CRUD son **async con optimistic update**: actualización local inmediata → persist en DB async → rollback + toast si error.
  - `setCalendarEvents()`: detecta solo las fechas que cambiaron y sincroniza selectivamente.
  - Estado de hidratación: `isHydrating`, `hydrationError`.
  - Sistema de toasts interno: `toasts[]`, `addToast()`, `removeToast()`.
  - `resetStore()` al logout: limpia todas las colecciones.
  - Función auxiliar exportada: `setCurrentUserId(id)`.

### App.jsx refactorizado (2026-04-15)

- [x] **`src/App.jsx`** — nueva estructura:
  - `<AuthProvider>` → `<AuthGate>` → `<BrowserRouter>` → `<AppContent>`
  - `AppContent` muestra: `HydrationLoader` (spinner mientras carga), error UI con botón Retry, o las rutas normales.
  - `<ToastContainer />` y `<MigrationBanner />` siempre disponibles globalmente.
- [x] **`src/components/Sidebar.jsx`** — botón "Sign Out" al fondo del sidebar (solo visible con `USE_SUPABASE=true`). Usa `useAuthContext()` para `signOut`.

### Modules
- [x] **Dashboard** — Bento layout with stats cards (recipes, menus, prep time) + 4 operational widgets (Today's Menu, Next Delivery, Low Inventory, Team Available)
- [x] **Recipes Calculator** — Two-panel layout: filterable list + detail with group inputs (A/B/C); full CRUD with double-confirm delete; add requisition to cart
- [x] **Create/Edit Recipe** — Full form: name, category, emoji picker (20 options), description, dynamic ingredient slots (existing catalog + new inline), portions per group
- [x] **Menu Calculator** — Consolidated multi-recipe requisition with shared-ingredient detection and "shared" badge; CRUD with double-confirm
- [x] **Create/Edit Menu** — Multi-select recipe picker, drag-up/down ordering, emoji picker
- [x] **Production Calendar** — Monthly grid, 4 meal slots per day (Breakfast/Lunch/Dinner/Snack), add Recipe or Menu modal with note field, expandable menu items, Zustand persist
- [x] **Inventory** — Filterable ingredient table, visual stock bar, low-stock alerts (red border), stock stepper (+/-), full CRUD modal with substitution toggle
- [x] **Suppliers** — Grid card layout, 15-color preset palette + native color picker, email validation, delete warning when ingredients linked
- [x] **Cart + PDF** — Items grouped by supplier with colored headers, subtotals + grand total, jsPDF A4 purchase order with auto PO number, vectorial logo, page footer
- [x] **Sidebar navigation** — 80px fixed, active route highlight, cart item count badge, 3 mockup buttons (Budget, Activity, Staff) dimmed with alert
- [x] **Architecture documentation** — `rules.md`, `architecture.md`, `tasks.md`, `docs/GUIDE.md`
- [x] **Master plan + tracker** — `FORGE_MASTER_PLAN.md`, `DEVELOPMENT_TRACKER.md` (this file)

### UI/UX Improvements (2026-04-14)
- [x] **New ingredient units** — Added `gal`, `qt`, `lb`, `1#` to `INGREDIENT_UNITS` in `theme.js`; propagates automatically to CreateRecipeView and InventoryView
- [x] **Substitute catalog picker** — In CreateRecipeView (`IngredientSlot`) and InventoryView (`IngredientModal`): "Has substitute" now offers a toggle between "From catalog" (select from existing ingredients) and "Type manually" (free text); initializes to catalog mode if existing substitute value matches a catalog name
- [x] **Demographic group rename** — Groups renamed from Kids/Adults/Seniors → **Kids/Teens/Adults** (Group A=Kids, B=Teens, C=Adults); updated in `mockData.js` `defaultGroups` + all labels in `CreateRecipeView.jsx`
- [x] **Portion unit selector** — In CreateRecipeView, the unit displayed next to portion inputs is now: a read-only teal badge for existing catalog ingredients, or an inline `<select>` from `INGREDIENT_UNITS` for new inline ingredients
- [x] **Waste factor per ingredient (merma)** — Optional "Waste factor" checkbox per ingredient slot in CreateRecipeView; when enabled defaults to 10%, shows a `%` number input and an "X% ordered extra" badge; stored as `wastePct` in the recipe ingredient ref; applied in the calc engine on top of the 10% safety margin

### Bug Fixes (2026-04-14)
- [x] **FIX — `supplierIds is not defined`** — `SUPPLIER_IDS` was computed in `CreateRecipeView` but never passed as a prop to `IngredientSlot`; fixed by adding `supplierIds` to the prop signature and the render call

---

## 🔄 In Progress

| Task | Description | Status |
|------|-------------|--------|
| Sistema Import/Export | Implementación completa: módulo IO, DataPortalView, ImportPreviewModal | ✅ Done |

---

## ✅ Dual-Mode Bug Fixes (2026-04-14)

> Correcciones post-implementación del modelo dual per-person / yield.

- [x] **FIX 1 — All-zero portionByGroup silencioso** — `validate()` ahora rechaza A=0,B=0,C=0 explícito (no solo campos vacíos)
- [x] **FIX 2 — quantityForBase whitespace/trim** — validación tightened + trim antes de `Number()` en `handleSave()`
- [x] **FIX 3 — Guard defensivo en resolvePortionByGroup** — `console.warn` y retorno `{A:0,B:0,C:0}` si `quantityForBase <= 0` en datos legacy
- [x] **FIX 4 — portionFactors A/C validados** — `validate()` bloquea factores `<= 0`; mensajes de error inline en Batch Settings card
- [x] **FIX 5 — baseServings onChange guard** — estado nunca puede ser `< 1`; HTML `min={1}` reforzado en JS
- [x] **FIX 6 — Receta sin ingredientes bloqueada** — `validate()` verifica `slots.length > 0`
- [x] **FIX 7 — Ghost baseServings/portionFactors** — `handleSave()` usa spread condicional; solo se guarda si hay ingredientes yield
- [x] **FIX 8 — Batch Settings card siempre visible** — reemplazado conditional render por opacity/pointerEvents con hint "activate" cuando inactivo
- [x] **FIX 9 — Group B REFERENCE badge** — label de Adults incluye badge inline "REFERENCE"
- [x] **FIX 10 — Seed recipe yield** — `Pasta Bolognese` (id:4) agregada a mockData.js con `inputMode: 'yield'` para demo y testing

---

## 📌 Backlog (Priority Order)

> Ordered by business impact. Tackle top items first.

### P1 — High Priority

- [x] **Sistema de Import / Export de datos** — Implementado 2026-04-20
  - Plan + implementación: ver `agent-sessions/2026-04-20_import-export-implementation.md`
  - Módulo `src/lib/io/`: Entity Registry, Format Registry, validación, idRemap, conflict resolution
  - Formato: JSON (backup completo, todas las entidades). CSV pospuesto a PR futura.
  - UI: `DataPortalView.jsx` en `/data` + `ImportPreviewModal.jsx`
  - Archivos creados: 7 en `src/lib/io/`, 1 en `src/lib/db/`, 2 en views/components
  - Archivos modificados: `App.jsx`, `Sidebar.jsx`, `src/lib/db/index.js`

- [ ] **Code splitting audit**
  - Current bundle: ~725 kB (too large for fast load)
  - `React.lazy()` is configured in `App.jsx` but verify all views are properly split
  - Goal: reduce initial bundle to < 200 kB
  - File: [src/App.jsx](src/App.jsx)

- [ ] **Per-recipe diner counts in menus**
  - Currently all diners (A/B/C) eat all recipes in a menu
  - Need: each recipe in a menu can have its own diner count
  - Impact: more accurate consolidated requisitions
  - Files: [src/views/MenusView.jsx](src/views/MenusView.jsx), [src/data/mockData.js](src/data/mockData.js)

- [ ] **Calendar requisition summary**
  - From CalendarView, generate a consolidated requisition for an entire day or week
  - Should reuse `calcMenuRequisition()` or extend it for multi-day aggregation
  - Files: [src/views/CalendarView.jsx](src/views/CalendarView.jsx), [src/data/mockData.js](src/data/mockData.js)

### P2 — Medium Priority

- [ ] **Responsive design audit**
  - All views were designed desktop-first
  - Audit: tablet (768px) and mobile (375px) breakpoints
  - Key problem areas: two-panel layouts (Recipes, Menus), CalendarView grid, PDF button placement
  - Files: [src/index.css](src/index.css) + view files

- [ ] **Dashboard real data integration**
  - "Next Delivery" widget is a static mockup
  - "Team Available" widget is a static mockup
  - Connect to real data when Staff/Supplier delivery modules are built

- [ ] **Vercel integration con Supabase**
  - La integración de Vercel + Supabase inyecta env vars automáticamente en Vercel deployments
  - `.env.local` sigue siendo necesario para desarrollo local
  - Setup: Supabase Dashboard → Project Settings → Integrations → Vercel → Connect

- [ ] **Dashboard real data integration**
  - "Next Delivery" widget is a static mockup
  - "Team Available" widget is a static mockup
  - Connect to real data when Staff/Supplier delivery modules are built

### P3 — Low Priority / Future Phases

- [ ] **Multi-kitchen / multi-user** — La DB ya tiene `user_id` en todas las tablas. El diseño es compatible. Falta: UI de selección de kitchen, `kitchen_id` FK en tablas, RLS policies por kitchen.

- [ ] **Budget Module** (mockup → real feature)
  - Track actual spend vs. estimated from Purchase Orders
  - Sidebar item already exists (dimmed)
  - Scope: PO history, budget periods, variance reports

- [ ] **Activity Module** (mockup → real feature)
  - Audit log of all production events (recipes cooked, orders placed)
  - Sidebar item already exists (dimmed)

- [ ] **Staff Module** (mockup → real feature)
  - Team member roster, availability per day/slot
  - Connects to Calendar (who cooks what on which day)
  - Sidebar item already exists (dimmed)

---

## 🐛 Known Bugs

> Report format: Description | File | Severity (low/med/high)

| # | Description | File | Severity |
|---|-------------|------|----------|
| — | No known bugs at this time | — | — |

---

## 🔧 Bug Fixes (2026-04-18)

> Correcciones post-Fase 3 (Supabase integration bugs).

- [x] **FIX — `SUPPLIER_IDS` mapeaba UUIDs en vez de nombres** — `InventoryView.jsx` y `CreateRecipeView.jsx` usaban `suppliers.map(s => s.id)` para los dropdowns de proveedor. Como `ing.supplier` en el store es el nombre (no el UUID), el filtro nunca funcionaba, el modal mostraba UUIDs como opciones y el color del badge siempre era el default. Fix: cambiar a `suppliers.map(s => s.name)`. También se fuerza `supplierId: null` al guardar para que `storeIngredientToDb` resuelva el UUID desde el nombre seleccionado.

- [x] **FIX — Calendar crash y eventos invisibles tras hydration desde DB** — `dbCalendarToStore` en `transform.js` producía `slot` (en vez de `slotKey`) y solo guardaba `itemId` sin reconstruir los objetos `recipe`/`menu`/`menuRecipes`. Resultado: DayPanel lanzaba `TypeError: Cannot read properties of undefined (reading 'image')` y ningún meal aparecía en los slots. Fix: renombrar `slot` → `slotKey`, extender la firma con `storeRecipes`/`storeMenus` y reconstruir los objetos completos al hidratar.

## 📐 Data Model — Ingredient Ref (Recipe)

The `ingredients[]` array inside a recipe stores refs, not full catalog objects. Current shape:

```js
{
  ingredientId: string,       // UUID (Supabase) o 'ing-NNN' (legacy localStorage)
  inputMode: 'per-person' | 'yield',
  portionByGroup?: { A: number, B: number, C: number },  // per-person mode
  quantityForBase?: number,                               // yield mode
  wastePct?: number,          // optional — absence = 0%; applied in calcRequisition
}
```

- `wastePct` is **per recipe-ingredient** (same catalog ingredient can have different waste % in different recipes)
- In menu consolidation, the highest `wastePct` wins when the same ingredient is shared across recipes
- En modo Supabase, `ingredientId` es UUID. El transform.js reconstruye este array desde `recipe_ingredients`.

---

## 🔧 Technical Debt

> Items to address — do NOT refactor during unrelated tasks. Log here and continue.

| # | Issue | File | Priority |
|---|-------|------|----------|
| 1 | `useCartManager.js` is fully implemented but **never used** — cart logic lives in Zustand instead. Should be removed after confirming no lingering import. | [src/hooks/useCartManager.js](src/hooks/useCartManager.js) | Low |
| 2 | `mockData.js` mixes seed data (static) with calculation engine (pure functions). These should be in separate files: `seedData.js` and `calcEngine.js`. En modo Supabase solo se usan las funciones puras. | [src/data/mockData.js](src/data/mockData.js) | Low |
| 3 | `architecture.md` describes navigation as "state-driven (`activeView`), NOT URL-based" but the app now uses React Router. Document is outdated. | [architecture.md](architecture.md) | Low (FORGE_MASTER_PLAN.md is now authoritative) |
| 4 | Initial bundle ~725 kB. Need to verify `React.lazy()` splits are working and analyze chunk sizes with `vite build --report`. | [src/App.jsx](src/App.jsx) | High |
| 5 | `useCartManager.js` también debe actualizarse si se quiere persistir el carrito en Supabase en el futuro (actualmente el carrito es efímero intencional). | [src/hooks/useCartManager.js](src/hooks/useCartManager.js) | Low |

---

## 🏛️ Architecture Decisions Log

> Key decisions made during development, with rationale.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-15 | **Supabase como backend (PostgreSQL + Auth + RLS)** | Sin servidor propio, Auth por email incluida, RLS garantiza aislamiento por usuario sin errores de aplicación |
| 2026-04-15 | **Feature flag `USE_SUPABASE`** | Permite trabajar sin credenciales (retrocompatibilidad localStorage). Facilitará pruebas sin red y onboarding de contribuidores |
| 2026-04-15 | **Optimistic updates en todas las acciones CRUD** | UX inmediata; rollback automático si la DB falla. El usuario no espera a la red para ver el resultado |
| 2026-04-15 | **`AuthContext.jsx` con `useAuth()` ejecutado una sola vez** | Evita el deadlock de `gotrue-js` causado por suscripciones duplicadas en React 19 StrictMode (double-mount) |
| 2026-04-15 | **`useStore.getState()` imperativo en `useAuth`** | Evita dependencias circulares entre el hook de auth y el store. El store no conoce a `useAuth`, mantiene separación de concerns |
| 2026-04-15 | **`persist` condicional en Zustand** | Cuando Supabase está activo, localStorage no es la fuente de verdad; `persist` causaría estado stale al cambiar de usuario |
| 2026-04-15 | **`user_id` denormalizado en junction tables** | Permite RLS sin joins costosos. RLS policy de Supabase es una expresión simple: `auth.uid() = user_id` |
| 2026-04-07 | **Migrate from `activeView` state to React Router v7** | Enables browser back/forward, bookmarkable URLs, and `React.lazy()` route-level code splitting |
| 2026-04-07 | **Adopt Zustand over `useCrudState` for global state** | Zustand's `persist` middleware handles localStorage serialization automatically; eliminates manual key management per collection |
| 2026-04-07 | **No TypeScript** | Project owner preference; keep barrier to entry low for contributors |
| 2026-04-03 | **+10% safety margin in requisition formula** | Industry standard for professional kitchens to account for waste, drops, and unexpected demand |
| 2026-04-03 | **Ceiling (`Math.ceil`) for pack rounding** | Never under-order; always round up to the nearest purchasable unit |
| 2026-04-03 | **Supplier color branding** | Supplier colors propagate to PDF group headers, card UI, and inventory indicators for fast visual scanning |
| 2026-04-03 | **Groups A/B/C (Kids/Adults/Seniors)** | Fixed demographic model matches catering industry standard; extensible to N groups in future |
| 2026-04-03 | **jsPDF over server-side PDF** | No backend required; PDF generated 100% client-side; no data sent to third parties |

---

## 📊 Performance Snapshot

| Metric | Value | Date | Target |
|--------|-------|------|--------|
| Production bundle size | ~481 kB | 2026-04-15 | < 200 kB |
| Views lazy-loaded | All 9 views | 2026-04-07 | ✅ Done |
| Supabase DB tables | 7 tablas con RLS | 2026-04-15 | ✅ Done |
| Auth provider | Supabase email+password | 2026-04-15 | ✅ Done |
| localhost persistencia | `.env.local` requerido | 2026-04-15 | ✅ Done |
| Vercel deploy | Pendiente integración Supabase | 2026-04-15 | Ver §Backlog |

---

*Last updated: 2026-04-18*
*Maintainer: Kamilo G*
*Fase 3 completada — ver `agent-sessions/2026-04-14_execution-plan-supabase-migration.md`*
*Bug fixes post-Fase 3 — ver `agent-sessions/2026-04-18_supabase-bug-fixes.md`*
