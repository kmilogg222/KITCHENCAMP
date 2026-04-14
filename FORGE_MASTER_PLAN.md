# FORGE_MASTER_PLAN — KitchenCalc

> **Fuente única de verdad arquitectónica.** Todo agente de IA debe leer este documento antes de modificar cualquier código.
> Consolidates: `README.md`, `architecture.md`, `rules.md`, `docs/GUIDE.md`

---

## 1. Project Overview

| Field | Value |
|-------|-------|
| **Product Name** | KitchenCalc |
| **Tagline** | Smart kitchen inventory & requisition calculator |
| **Repository** | `carlossjulies/KITCHENCAMP` |
| **Branch** | `main` (production) |
| **Deployed on** | Vercel (SPA rewrite config) |
| **Dev URL** | `http://localhost:5173` |
| **Target Audience** | Professional chefs, kitchen managers, catering teams |

### What It Solves

Professional kitchens face a constant math problem: given a menu serving N kids + M adults + P seniors, exactly how many packs of each ingredient must be ordered from which suppliers?

KitchenCalc automates the full workflow:
1. **Inventory** — Catalog all ingredients with pack size, current stock, and supplier
2. **Recipes** — Define portion requirements per demographic group (A/B/C)
3. **Menus** — Bundle multiple recipes; consolidate shared ingredients automatically
4. **Calculator** — Apply the requisition formula (demand × 1.10 safety margin → ceiling packs → minus stock)
5. **Cart → PDF** — Generate professional Purchase Orders grouped by supplier

---

## 2. Business Goals

| Goal | Metric |
|------|--------|
| Zero manual math for purchase orders | 100% of requisitions auto-calculated |
| Eliminate over/under ordering | ±0 wasted packs via safety margin |
| Professional supplier communication | PDF POs with PO number, items, subtotals |
| Production planning visibility | Monthly calendar with meal slots |
| Data durability | localStorage persist (short-term); backend API (roadmap) |

---

## 3. Approved Tech Stack

> Do NOT add new dependencies without explicit user approval.

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Runtime | Node.js (npm) | Latest LTS | Package management |
| Framework | React | 19.2.0 | UI component engine |
| Bundler | Vite | 7.3.1 | Dev server + production build |
| Styling | TailwindCSS | 4.2.1 | Utility-first styles |
| Styling (custom) | Vanilla CSS (`index.css`) | — | Animations, glass cards, reusable classes |
| Language | JavaScript (JSX) | ES2022+ | No TypeScript |
| Icons | lucide-react | 0.575.0 | Icon library |
| PDF | jsPDF | 4.2.0 | Purchase Order generation |
| Global State | Zustand | 5.0.12 | Persistent global store |
| Routing | react-router-dom | 7.14.0 | URL-based navigation + code splitting |

**Approval dates:**
- Zustand: approved 2026-04-07
- react-router-dom: approved 2026-04-07

---

## 4. Architecture Overview

### 4.1 Directory Structure

```
KITCHENCAMP/
├── index.html                        → Vite SPA entry point
├── package.json                      → Dependencies & scripts
├── vite.config.js                    → Vite + TailwindCSS plugin
├── eslint.config.js                  → ESLint rules
├── vercel.json                       → SPA rewrite (all routes → index.html)
├── FORGE_MASTER_PLAN.md              → THIS FILE — architectural truth
├── DEVELOPMENT_TRACKER.md            → Dynamic task/state tracker
├── rules.md                          → Code standards (legacy, see §8 here)
├── architecture.md                   → Legacy architecture reference
├── tasks.md                          → Legacy task list (see DEVELOPMENT_TRACKER.md)
│
├── docs/
│   └── GUIDE.md                      → Beginner-friendly architecture explainer
│
└── src/
    ├── main.jsx                      → React entry point (ErrorBoundary → App)
    ├── App.jsx                       → Root: BrowserRouter + lazy routes + Sidebar
    ├── index.css                     → Global styles, animations, reusable CSS classes
    ├── App.css                       → App-level overrides (minimal)
    │
    ├── store/
    │   └── useStore.js               → Zustand global store + localStorage persist
    │
    ├── components/
    │   ├── Sidebar.jsx               → Fixed left nav (80px), active route, cart badge
    │   ├── FormControls.jsx          → Label, TInput, SInput (reusable form atoms)
    │   ├── GroupInput.jsx            → Diner count input per group (A/B/C)
    │   ├── Toggle.jsx                → On/off switch component
    │   ├── StarRating.jsx            → Read-only star rating display
    │   └── ErrorBoundary.jsx         → Global render error catcher
    │
    ├── constants/
    │   └── theme.js                  → Design tokens: COLORS, MEAL_SLOTS, INGREDIENT_UNITS, INPUT_STYLE
    │
    ├── data/
    │   └── mockData.js               → Seed data (ingredients/recipes/menus/suppliers) + calculation engine
    │
    ├── hooks/
    │   ├── useCrudState.js           → Generic local CRUD + optional localStorage
    │   ├── useCartManager.js         → Cart logic (UNUSED — cart lives in Zustand now)
    │   └── useDeleteConfirm.js       → Double-click delete with 3s timeout
    │
    ├── utils/
    │   └── generatePurchaseOrderPDF.js → jsPDF engine: A4 PDF with logo, tables, subtotals
    │
    └── views/                        → Full-page views, lazy-loaded via React.lazy()
        ├── DashboardView.jsx         → /dashboard — Bento layout: stats + widgets
        ├── RecipesView.jsx           → /recipes — Recipe list + single-recipe calculator
        ├── CreateRecipeView.jsx      → /recipes/create, /recipes/edit/:id
        ├── MenusView.jsx             → /menus — Menu list + consolidated calculator
        ├── CreateMenuView.jsx        → /menus/create, /menus/edit/:id
        ├── CalendarView.jsx          → /calendar — Monthly production planner
        ├── InventoryView.jsx         → /inventory — Ingredient catalog CRUD
        ├── SuppliersView.jsx         → /suppliers — Supplier management CRUD
        └── CartView.jsx              → /cart — Shopping cart + PDF generation
```

### 4.2 Data Flow

```
┌─────────────────────────────────────────────────────┐
│                  useStore.js (Zustand)               │
│                                                     │
│  ingredients[] │ recipes[] │ menus[] │ suppliers[]  │
│  calendarEvents{} │ cart[]                          │
│                  ↓ persist middleware                │
│             localStorage['kitchencalc-store']       │
└───────────────────────┬─────────────────────────────┘
                        │ (read via useStore hook)
              ┌─────────▼─────────┐
              │      App.jsx       │
              │  BrowserRouter    │
              │  React.lazy()     │
              │  Sidebar (fixed)  │
              └─────────┬─────────┘
                        │ (URL routing → React Router)
                        │
          ┌─────────────┼────────────────┐
          ▼             ▼                ▼
    <DashboardView>  <RecipesView>   <CalendarView>  ...
    (reads store)   (reads store)   (reads store)
    (dispatches     (dispatches     (dispatches
     actions)        actions)        actions)
```

**Key principles:**
1. **useStore.js** is the single source of truth. All views read from it directly via the `useStore()` hook.
2. **Views** manage local UI state only (search filters, form inputs, selected item, toggles).
3. **mockData.js** provides seed data for first-run AND hosts the calculation engine functions.
4. **Navigation** is URL-based (React Router v7). The Sidebar reflects the active route.

### 4.3 Routing Table

| Route | View | Notes |
|-------|------|-------|
| `/` | → redirect `/dashboard` | Fallback |
| `/dashboard` | `DashboardView` | Default landing |
| `/recipes` | `RecipesView` | List + calculator |
| `/recipes/create` | `CreateRecipeView` | New recipe |
| `/recipes/edit/:id` | `CreateRecipeView` | Edit mode (pre-fill) |
| `/menus` | `MenusView` | List + calculator |
| `/menus/create` | `CreateMenuView` | New menu |
| `/menus/edit/:id` | `CreateMenuView` | Edit mode (pre-fill) |
| `/calendar` | `CalendarView` | Monthly planner |
| `/inventory` | `InventoryView` | Ingredient catalog |
| `/suppliers` | `SuppliersView` | Supplier CRUD |
| `/cart` | `CartView` | Cart + PDF |
| `*` | → redirect `/dashboard` | 404 catch-all |

---

## 5. Module Catalog

### 5.1 Dashboard (`DashboardView.jsx`)
**Route:** `/dashboard`
**Purpose:** Application home. Provides a quick overview of the kitchen's operational status.
**Key features:**
- Stat cards: active recipes count, menus count, avg prep time
- Bento widget grid:
  - **Today's Menu** — reads `calendarEvents` for current date, shows meal slots
  - **Next Delivery** — UI mockup (future: integrate supplier delivery dates)
  - **Low Inventory** — highlights ingredients below threshold
  - **Team Available** — UI mockup (future: Staff module)

### 5.2 Recipes (`RecipesView.jsx` + `CreateRecipeView.jsx`)
**Routes:** `/recipes`, `/recipes/create`, `/recipes/edit/:id`
**Purpose:** Manage recipe catalog; calculate single-recipe purchase requisitions.
**Key features:**
- Filterable recipe list (left panel) + detail panel (right)
- Group inputs (A/B/C) to set diner counts
- Requisition table per ingredient: stock / min order / packs to order / unit price
- Add calculated items to cart
- CRUD: create/edit/delete with double-confirm on delete

**Recipe data model:**
```js
{
  id: string,
  name: string,
  category: string,          // 'Main Course' | 'Starter' | etc.
  rating: number,            // 1-5
  image: string,             // emoji character
  description: string,
  isNew?: boolean,
  ingredients: [
    {
      ingredientId: string,
      portionByGroup: { A: number, B: number, C: number }  // grams per person
    }
  ]
}
```

### 5.3 Menus (`MenusView.jsx` + `CreateMenuView.jsx`)
**Routes:** `/menus`, `/menus/create`, `/menus/edit/:id`
**Purpose:** Bundle multiple recipes; calculate consolidated requisitions with shared-ingredient detection.
**Key features:**
- Consolidated requisition: if ingredient appears in >1 recipe, portions are summed before calculating packs
- Shared ingredient badge displayed in results table
- Per-recipe breakdown expandable
- CRUD with double-confirm delete

**Menu data model:**
```js
{
  id: string,
  name: string,
  description: string,
  image: string,             // emoji
  recipeIds: string[],       // ordered list of recipe IDs
  createdAt: string          // ISO date
}
```

### 5.4 Production Calendar (`CalendarView.jsx`)
**Route:** `/calendar`
**Purpose:** Monthly production planning. Assign recipes or full menus to specific days and meal slots.
**Key features:**
- Monthly grid navigation (prev/next)
- 4 meal slots per day: Breakfast / Lunch / Dinner / Snack
- Add event modal: choose Recipe or Menu, select slot, add optional note
- Menus expandable to show constituent recipes
- Events persist in Zustand `calendarEvents` keyed by `"YYYY-MM-DD"`

**CalendarEvent data model:**
```js
// calendarEvents: { "YYYY-MM-DD": CalendarEvent[] }
{
  id: string,
  type: 'recipe' | 'menu',
  itemId: string,            // recipeId or menuId
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  note?: string
}
```

### 5.5 Inventory (`InventoryView.jsx`)
**Route:** `/inventory`
**Purpose:** Global ingredient catalog CRUD with stock tracking.
**Key features:**
- Filterable table by name and supplier
- Visual stock bar (low stock = red border alert)
- Stock stepper (+/- buttons)
- Ingredient modal for create/edit: name, unit, packSize, currentStock, minOrder, supplier, pricePerPack, substitutable, substitute

**Ingredient data model:**
```js
{
  id: string,
  name: string,
  unit: 'g' | 'ml' | 'units' | 'kg' | 'L' | 'oz',
  packSize: number,
  currentStock: number,      // in units of `unit`
  minOrder: number,          // minimum packs to order
  supplier: string,          // supplier name
  pricePerPack: number,
  substitutable: boolean,
  substitute?: string
}
```

### 5.6 Suppliers (`SuppliersView.jsx`)
**Route:** `/suppliers`
**Purpose:** Supplier contact directory with color branding.
**Key features:**
- Color picker (15-color preset palette + native picker)
- Supplier color propagates to PDF headers, cart group headers, indicator dots
- Warning when deleting a supplier that has linked ingredients

**Supplier data model:**
```js
{
  id: string,
  name: string,
  contact: string,           // URL or label
  email: string,
  phone: string,
  color: string,             // hex color
  notes: string
}
```

### 5.7 Cart + PDF (`CartView.jsx`)
**Route:** `/cart`
**Purpose:** Aggregate ingredient orders; generate professional Purchase Order PDFs.
**Key features:**
- Items grouped by supplier (colored group headers)
- Subtotal per supplier + grand total
- Remove individual items
- "Generate PDF" → calls `generatePurchaseOrderPDF({ cart, suppliers, grandTotal })`
- PDF includes: PO number (auto), date, supplier summary, items table, grand total, page footer

**CartItem data model:**
```js
{
  id: string,                // ingredientId
  name: string,
  supplier: string,
  unit: string,
  packSize: number,
  packsToOrder: number,
  pricePerPack: number,
  totalCost: number
}
```

### 5.8 Sidebar (`Sidebar.jsx`)
**Purpose:** Fixed 80px left navigation present on all views.
**Nav items:** Dashboard, Recipes, Menus, Calendar, Inventory, Suppliers, Cart (with badge)
**Mockup items** (dimmed, show alert on click): Budget, Activity, Staff

---

## 6. Calculation Engine

Located in [src/data/mockData.js](src/data/mockData.js).

### 6.1 Single Recipe Requisition

```
D      = Σ ( portionByGroup[gId] × groups[gId].count )   // Raw demand
D_safe = D × 1.10                                         // +10% safety margin
R      = ⌈ D_safe / packSize ⌉                            // Packs to order (ceiling)
order  = max( R - floor(currentStock / packSize), 0 )     // Minus current stock
```

**Function:** `calcRequisition(resolvedIngredient, groups) → { D, D_safe, R, packSize, unit }`

### 6.2 Menu Consolidated Requisition

```
For each recipe in menu:
  resolveIngredients(recipe, ingredientCatalog)           // Merge catalog data
  For each ingredient:
    consolidatedMap[ingredientId].portionByGroup[gId] += portion  // Sum shared ingredients

Then for each consolidated ingredient:
  calcRequisition(consolidated, groups)                    // Same formula
```

**Function:** `calcMenuRequisition(menu, allRecipes, catalog, groups) → { consolidated[], byRecipe[] }`

### 6.3 Helper Functions

| Function | Signature | Purpose |
|----------|-----------|---------|
| `resolveIngredients` | `(recipe, catalog) → enrichedIngredients[]` | Merges recipe ingredient refs with catalog data |
| `calcRequisition` | `(ingredient, groups) → result` | Single ingredient requisition math |
| `calcMenuRequisition` | `(menu, recipes, catalog, groups) → { consolidated, byRecipe }` | Full menu consolidation |

---

## 7. Global Store Schema

File: [src/store/useStore.js](src/store/useStore.js)
Persistence key: `'kitchencalc-store'` (localStorage, version 1)

```js
{
  // Collections
  ingredients: Ingredient[],
  recipes: Recipe[],
  menus: Menu[],
  suppliers: Supplier[],
  cart: CartItem[],
  calendarEvents: { [dateKey: string]: CalendarEvent[] },

  // Actions
  addIngredient(i), updateIngredient(i), deleteIngredient(id),
  addRecipe(r), updateRecipe(r), deleteRecipe(id),
  addMenu(m), updateMenu(m), deleteMenu(id),
  addSupplier(s), updateSupplier(s), deleteSupplier(id),
  addToCart(item), removeFromCart(id), clearCart(),
  setCalendarEvents(events),
  resetStore()
}
```

---

## 8. Engineering Standards

### 8.1 Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Components & Views | `PascalCase.jsx` | `MenusView.jsx` |
| Custom Hooks | `camelCase.js` with `use` prefix | `useCrudState.js` |
| Utilities | `camelCase.js` | `generatePurchaseOrderPDF.js` |
| Constants | `UPPER_SNAKE_CASE` | `MEAL_SLOTS`, `COLORS` |
| CSS classes | `kebab-case` | `.glass-card`, `.btn-primary` |
| Variables & functions | `camelCase` | `selectedRecipe`, `handleSaveMenu` |

### 8.2 Language Rules

- **JSDoc file-level headers** (`@file`, `@description`): Written in **Spanish**
- **UI labels, buttons, placeholders**: Written in **English**
- **Variable names, function names, inline comments**: Written in **English**

### 8.3 Code Style

- **Design tokens** from `src/constants/theme.js` — never hardcode brand colors elsewhere
- **Inline styles** for component-specific; **CSS classes** for reusable patterns
- **One component per file** — tightly coupled sub-components acceptable within a view file
- **Custom hooks** for reusable stateful logic; keep `App.jsx` as a pure orchestrator
- **No TypeScript** — strict JSX/ES2022+ only

### 8.4 Error Handling

1. Never swallow errors silently — display user feedback OR `console.error` with context
2. Mandatory null-safe access: use `?.`, `??`, `.filter(Boolean)` on potentially undefined data
3. Form validation pattern: `const [errors, setErrors] = useState({})` → inline messages
4. No `try/catch` that silently returns `null` or empty arrays
5. No `alert()` or `window.confirm()` — use custom modals or inline UI

### 8.5 Git Conventions

```
feat:     new feature
fix:      bug fix
refactor: code restructure (no behavior change)
docs:     documentation only
style:    CSS/visual only
```

Branch: `main` is production. Create feature branches only when instructed.

---

## 9. AI Agent Rules (NON-NEGOTIABLE)

1. **Read before code.** Read `FORGE_MASTER_PLAN.md` and `DEVELOPMENT_TRACKER.md` before any modification.
2. **No auto-commit/push.** Git operations only when the user explicitly requests them.
3. **No new dependencies** without presenting and getting user approval first.
4. **No file deletions/renames** without user approval.
5. **No refactoring working code** — note it in `DEVELOPMENT_TRACKER.md` under Technical Debt and move on.
6. **Verify compilation** (`npm run build` or dev server check) before reporting completion.
7. **Update `DEVELOPMENT_TRACKER.md`** when starting, completing, or discovering tasks.

---

## 10. Roadmap

### Phase 1 — Core MVP (COMPLETE)
- Ingredient catalog CRUD
- Recipe calculator (single recipe, groups A/B/C)
- Menu calculator (consolidated requisition)
- Production calendar (monthly, 4 meal slots)
- Shopping cart + PDF Purchase Order
- Supplier management with color branding
- Zustand persist → localStorage durability
- Dashboard with operational widgets

### Phase 2 — Quality & Polish (IN PROGRESS)
- Code splitting (reduce 725kB initial bundle)
- Responsive design audit (tablet/mobile)
- Per-recipe diner counts in menus
- Calendar requisition summary (day/week view)

### Phase 3 — Real Backend (PLANNED)
- Replace localStorage with backend API (REST or Supabase)
- User authentication
- Multi-user / multi-kitchen support

### Phase 4 — Expansion Modules (MOCKUP → REAL)
- **Budget Module** — Cost tracking against purchase orders
- **Activity Module** — Audit log of production events
- **Staff Module** — Team availability & role management

---

## 11. Deployment

**Platform:** Vercel
**Config file:** `vercel.json`

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

All routes rewrite to `index.html` so React Router handles client-side navigation.

**Build commands:**
```bash
npm run dev        # Dev server (localhost:5173)
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
npm run lint       # ESLint check
```

---

*Last updated: 2026-04-13*
*Maintainer: Kamilo G*
