# DEVELOPMENT_TRACKER — KitchenCalc

> **Documento de estado dinámico.** Actualizar al iniciar, completar o descubrir cualquier tarea.
> Este archivo es la fuente de verdad del estado actual del proyecto.
> Reemplaza: `tasks.md`

---

## Current Sprint

**Sprint Goal:** Documentación arquitectural completa + preparación para Phase 2
**Started:** 2026-04-13

| Task | Owner | Status |
|------|-------|--------|
| Crear `FORGE_MASTER_PLAN.md` | AI Agent | ✅ Done |
| Crear `DEVELOPMENT_TRACKER.md` | AI Agent | ✅ Done |

---

## ✅ Completed Features

> Módulos funcionales y probados en producción.

### Core Infrastructure
- [x] **Project setup** — React 19 + Vite 7 + TailwindCSS 4 + ESLint
- [x] **Global state** — Zustand 5 store with `persist` middleware (localStorage key: `kitchencalc-store`)
- [x] **Routing** — React Router v7 with `React.lazy()` code-splitting on all views
- [x] **Error boundary** — `ErrorBoundary.jsx` wraps entire app, catches render errors
- [x] **Design system** — `theme.js` tokens (COLORS, MEAL_SLOTS, INGREDIENT_UNITS, INPUT_STYLE)
- [x] **Vercel deployment** — `vercel.json` SPA rewrite config

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
| — | No active development tasks | Idle |

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

### P3 — Low Priority / Future Phases

- [ ] **Data persistence — Backend API**
  - Replace localStorage with a real backend (Supabase recommended, no server to manage)
  - localStorage is single-device; backend enables multi-user / multi-kitchen
  - Architecture change: Zustand actions → API calls; loading/error states needed

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

## 📐 Data Model — Ingredient Ref (Recipe)

The `ingredients[]` array inside a recipe stores refs, not full catalog objects. Current shape:

```js
{
  ingredientId: string,
  inputMode: 'per-person' | 'yield',
  portionByGroup?: { A: number, B: number, C: number },  // per-person mode
  quantityForBase?: number,                               // yield mode
  wastePct?: number,          // optional — absence = 0%; applied in calcRequisition
}
```

- `wastePct` is **per recipe-ingredient** (same catalog ingredient can have different waste % in different recipes)
- In menu consolidation, the highest `wastePct` wins when the same ingredient is shared across recipes

---

## 🔧 Technical Debt

> Items to address — do NOT refactor during unrelated tasks. Log here and continue.

| # | Issue | File | Priority |
|---|-------|------|----------|
| 1 | `useCartManager.js` is fully implemented but **never used** — cart logic lives in Zustand instead. Should be removed after confirming no lingering import. | [src/hooks/useCartManager.js](src/hooks/useCartManager.js) | Low |
| 2 | `mockData.js` mixes seed data (static) with calculation engine (pure functions). These should be in separate files: `seedData.js` and `calcEngine.js`. | [src/data/mockData.js](src/data/mockData.js) | Low |
| 3 | `architecture.md` describes navigation as "state-driven (`activeView`), NOT URL-based" but the app now uses React Router. Document is outdated. | [architecture.md](architecture.md) | Low (FORGE_MASTER_PLAN.md is now authoritative) |
| 4 | Initial bundle ~725 kB. Need to verify `React.lazy()` splits are working and analyze chunk sizes with `vite build --report`. | [src/App.jsx](src/App.jsx) | High |

---

## 🏛️ Architecture Decisions Log

> Key decisions made during development, with rationale.

| Date | Decision | Rationale |
|------|----------|-----------|
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
| Production bundle size | ~725 kB | 2026-04-03 | < 200 kB |
| Views lazy-loaded | All 9 views | 2026-04-07 | ✅ Done |
| localStorage key | `kitchencalc-store` | 2026-04-07 | — |
| Vercel deploy | Active | 2026-04-03 | — |

---

*Last updated: 2026-04-14*
*Maintainer: Kamilo G*
