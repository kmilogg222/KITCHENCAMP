# 🏗️ Architecture — KitchenCalc System Map

> High-level documentation of the project structure, data flow, and component relationships.

---

## 1. Directory Tree

```
proyecto-carlos/
│
├── index.html                  → HTML entry point (Vite SPA)
├── package.json                → Dependencies & scripts
├── vite.config.js              → Vite bundler configuration
├── eslint.config.js            → Linting rules
├── rules.md                    → Development standards (READ FIRST)
├── architecture.md             → This file
├── tasks.md                    → Task tracker
│
├── public/                     → Static public assets (served as-is)
│
├── dist/                       → Production build output (git-ignored)
│
└── src/
    ├── main.jsx                → React entry point (renders <App />)
    ├── App.jsx                 → ROOT ORCHESTRATOR — all global state lives here
    ├── App.css                 → Minimal app-level style overrides
    ├── index.css               → Global styles, animations, reusable CSS classes
    │
    ├── components/             → Reusable, stateless UI components
    │   ├── Sidebar.jsx         → Left navigation bar (fixed, icon-based)
    │   ├── StarRating.jsx      → Star rating display component
    │   └── Toggle.jsx          → On/off toggle switch
    │
    ├── constants/              → Centralized configuration & design tokens
    │   └── theme.js            → Color palette, input styles, meal slots, units
    │
    ├── data/                   → Data layer — mock data + calculation engines
    │   └── mockData.js         → Ingredient catalog, recipes, menus, suppliers,
    │                              groups, calcRequisition(), calcMenuRequisition(),
    │                              resolveIngredients()
    │
    ├── hooks/                  → Custom React hooks (reusable stateful logic)
    │   ├── useCrudState.js     → Generic CRUD state manager (add/update/remove)
    │   └── useCartManager.js   → Shopping cart state (add/remove/clear)
    │
    ├── utils/                  → Pure utility functions
    │   └── generatePurchaseOrderPDF.js → PDF generation for purchase orders
    │
    ├── views/                  → Full-page view components (one per section)
    │   ├── DashboardView.jsx   → Home/welcome screen with stats & quick access
    │   ├── RecipesView.jsx     → Recipe list + single-recipe requisition calculator
    │   ├── CreateRecipeView.jsx→ Create/edit recipe form
    │   ├── MenusView.jsx       → Menu list + consolidated multi-recipe requisition
    │   ├── CreateMenuView.jsx  → Create/edit menu form (recipe multi-selector)
    │   ├── CalendarView.jsx    → Monthly production calendar (recipes + menus)
    │   ├── InventoryView.jsx   → Global ingredient catalog management
    │   ├── SuppliersView.jsx   → Supplier CRUD management
    │   └── CartView.jsx        → Shopping cart + purchase order generation
    │
    └── assets/                 → Static assets (images, fonts, etc.)
```

---

## 2. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        App.jsx                          │
│              (Single Source of Truth)                    │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ recipes  │  │  menus   │  │ingredients│  │suppliers│  │
│  │ CRUD     │  │  CRUD    │  │  CRUD     │  │ CRUD   │  │
│  └────┬─────┘  └────┬─────┘  └────┬──────┘  └───┬────┘  │
│       │              │             │              │      │
│  ┌────┴──────────────┴─────────────┴──────────────┴───┐  │
│  │              useCartManager (cart state)            │  │
│  └────────────────────────┬───────────────────────────┘  │
│                           │                              │
│  Navigation: activeView ──┼── 'dashboard' | 'recipes' |  │
│                           │    'menus' | 'calendar' |    │
│                           │    'inventory' | 'suppliers'  │
│                           │    | 'cart'                   │
└───────────────────────────┼──────────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │   <ViewX />   │  ← Receives data + callbacks via props
                    │               │  ← Has LOCAL state only (search, forms)
                    └───────────────┘
```

### Key Principles

1. **App.jsx** owns all global state via `useCrudState` hooks. Views are **consumers**.
2. **Views** may have local state (search filters, form inputs, UI toggles) but never modify global data directly — they call handler props.
3. **mockData.js** provides initial seed data AND pure calculation functions.
4. **Navigation** is state-driven (`activeView` string), not URL-based.

---

## 3. Core Modules

### 3.1 Recipe Calculator (`RecipesView`)

Calculates ingredient requisitions for a **single recipe**.

```
Recipe → Groups (A/B/C with counts) → calcRequisition() per ingredient → Results table
```

### 3.2 Menu Calculator (`MenusView`)

Calculates **consolidated** requisitions for a **menu** (multiple recipes).

```
Menu (N recipes) → Groups → calcMenuRequisition() →
  ├── Per-recipe breakdown
  └── Consolidated table (shared ingredients merged)
```

**Shared Ingredient Detection:** When the same ingredient appears in multiple recipes (e.g., Chicken Breast in Piccata + Nuggets), portions are summed before calculating packs.

### 3.3 Production Calendar (`CalendarView`)

Monthly calendar that supports planning both individual recipes and full menus per day.

```
Calendar Day → Meal Slots (Breakfast/Lunch/Dinner/Snack) →
  ├── type: 'recipe' → single recipe entry
  └── type: 'menu'   → full menu with expandable recipe list
```

### 3.4 Shopping Cart (`CartView`)

Aggregates ingredient orders from recipe or menu requisitions and generates PDF purchase orders.

---

## 4. Calculation Engine

Located in `src/data/mockData.js`.

### Single Recipe

```
D       = Σ(Pi × Ci)        → Raw demand (portion × count per group)
D_safe  = D × 1.10          → +10% safety margin
R       = ⌈D_safe / V⌉      → Packs to order (ceiling)
```

### Menu (Consolidated)

```
For each recipe in menu:
  For each ingredient:
    Accumulate portionByGroup[groupId] into a shared map

Then run calcRequisition() on each consolidated ingredient
```

---

*Last updated: 2026-04-03*
