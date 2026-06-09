# Contexto KitchenCamp / KitchenCalc — Guía para agentes de IA

> **Propósito de este documento.** Es el punto de entrada único para cualquier agente de IA (o
> persona) que vaya a tocar esta aplicación por primera vez. Explica **qué es** la app, **cuál es
> su objetivo**, **cómo funciona**, **qué tecnologías usa** y **cómo desarrollar en ella** sin
> romper nada. Léelo completo antes de escribir o modificar código.
>
> Si solo vas a leer una sección, lee al menos: §1 (Qué es), §4 (Arquitectura), §10 (Cómo
> desarrollar) y §11 (Gotchas críticos).

---

## 1. Qué es KitchenCalc

**KitchenCalc** es una calculadora de inventario y requisiciones de compra para cocinas
profesionales (chefs, jefes de cocina, equipos de catering). Resuelve un problema matemático
recurrente:

> Dado un menú que sirve a *N niños + M adolescentes + P adultos*, ¿exactamente cuántos packs de
> cada ingrediente hay que pedir, y a qué proveedor?

La app automatiza el flujo completo:

1. **Inventario** — Catálogo de ingredientes con tamaño de pack, stock actual y proveedor.
2. **Recetas** — Definen la porción requerida por grupo demográfico (A/B/C).
3. **Menús** — Agrupan varias recetas y consolidan automáticamente los ingredientes compartidos.
4. **Calculadora** — Aplica la fórmula de requisición (demanda × margen de seguridad 1.10 →
   redondeo a packs → menos el stock disponible).
5. **Calendario** — Planificación mensual de producción por franja de comida.
6. **Carrito → PDF** — Genera órdenes de compra profesionales agrupadas por proveedor.

**Grupos demográficos (constante en todo el dominio):** `A = Kids`, `B = Teens`, `C = Adults`.
`B` (Teens) es la referencia 1.0 para los factores de porción.

| Dato | Valor |
|------|-------|
| Nombre de producto | KitchenCalc |
| Repositorio / carpeta | `KITCHENCAMP` |
| Rama de producción | `main` |
| Despliegue | Vercel (SPA, todas las rutas → `index.html`) |
| URL de desarrollo | `http://localhost:5173` |
| Lenguaje | JavaScript (JSX), **sin TypeScript** |
| Último ciclo de mejoras | `plan_mejora.md` — ciclo de inventario completo (unidades flexibles, stock en base, movimientos, órdenes persistentes) |

---

## 2. Objetivo del producto

| Objetivo | Métrica |
|----------|---------|
| Cero matemática manual para órdenes de compra | 100% de requisiciones autocalculadas |
| Eliminar sobre/sub-pedido | ±0 packs desperdiciados gracias al margen de seguridad |
| Comunicación profesional con proveedores | PDF de orden con número, ítems y subtotales |
| Visibilidad de planificación | Calendario mensual con franjas de comida |
| Durabilidad de datos | Supabase (nube) con fallback a localStorage |

---

## 3. Stack tecnológico

> **No agregar dependencias nuevas sin aprobación explícita del usuario.**

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| Runtime | Node.js (npm) | LTS | Gestión de paquetes |
| Framework | React | 19.2.0 | Motor de componentes UI |
| Bundler | Vite | 7.3.1 | Dev server + build de producción |
| Estilos | TailwindCSS | 4.2.1 | Utilidades CSS |
| Estilos custom | CSS vanilla (`index.css`) | — | Animaciones, glass cards, clases reutilizables |
| Lenguaje | JavaScript (JSX) | ES2022+ | Sin TypeScript |
| Iconos | lucide-react | 0.575.0 | Librería de iconos |
| PDF | jsPDF | 4.2.0 | Generación de órdenes de compra |
| Estado global | Zustand | 5.0.12 | Store global (optimistic updates) |
| Routing | react-router-dom | 7.14.0 | Navegación por URL + code splitting |
| Backend / Auth | @supabase/supabase-js | latest | PostgreSQL + Auth + RLS (datos en la nube) |

**Feature flag central:** `USE_SUPABASE = Boolean(VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY)`
- `true` → la app usa Supabase (auth + base de datos). Requiere `.env.local` con credenciales.
- `false` → la app funciona con Zustand + localStorage usando datos seed (retrocompatible, sin login).

---

## 4. Arquitectura

### 4.1 Principios clave (memorizar)

1. **`src/store/useStore.js` (Zustand) es la única fuente de verdad.** Todas las vistas leen de
   él vía el hook `useStore()`. Las vistas **no saben que Supabase existe**.
2. **`src/lib/db/` es el único lugar con lógica de Supabase.** Las vistas **nunca** importan de
   `lib/db` directamente; lo hace el store.
3. **Optimistic updates:** las acciones del store actualizan el estado local de inmediato,
   persisten en la DB de forma asíncrona y hacen **rollback + toast** si la DB falla.
4. **Auth se ejecuta una sola vez** (en `AuthProvider`) para evitar suscripciones duplicadas.
5. **`src/data/mockData.js` aloja el motor de cálculo** (funciones puras) **y** los datos seed.
   El seed solo se usa cuando `USE_SUPABASE=false`; el motor de cálculo se usa siempre.
6. **Navegación basada en URL** (React Router v7); el Sidebar refleja la ruta activa.

### 4.2 Flujo de datos

```
┌──────────────────────────────────────────────────────────────────┐
│  Supabase (nube): Auth (email+password) │ PostgreSQL │ RLS user_id │
└─────────────────────────────┬────────────────────────────────────┘
                              │ @supabase/supabase-js
                  ┌───────────▼────────────┐
                  │       src/lib/db/        │  (única capa que conoce Supabase)
                  │  transform.fetchAllUserData() + CRUD por tabla │
                  └───────────┬────────────┘
                              │ hydrate(data) + optimistic updates
                  ┌───────────▼────────────┐
                  │   useStore.js (Zustand) │  (única fuente de verdad)
                  │  ingredients/recipes/menus/suppliers/cart/calendarEvents │
                  └───────────┬────────────┘
                              │ useStore() hook (solo lectura/acciones)
                  ┌───────────▼────────────┐
                  │  App.jsx → Router → Views │
                  └─────────────────────────┘
```

Cuando `USE_SUPABASE=false`, se omite toda la capa de Supabase: el store arranca con los datos
seed de `mockData.js` y se persiste con el middleware `persist` de Zustand en
`localStorage['kitchencalc-store']`.

### 4.3 Estructura de directorios

```
KITCHENCAMP/
├── index.html                  → Entry point de Vite (SPA)
├── package.json                → Dependencias + scripts
├── vite.config.js              → Vite + plugin TailwindCSS
├── eslint.config.js            → Reglas ESLint
├── vercel.json                 → SPA rewrite (todas las rutas → index.html)
├── FORGE_MASTER_PLAN.md        → Plan maestro arquitectónico (histórico/detallado)
├── DEVELOPMENT_TRACKER.md      → Tracker dinámico de tareas/estado
├── contextokitchencamp.md      → ESTE archivo (onboarding para agentes)
│
└── src/
    ├── main.jsx                → Entry React (ErrorBoundary → App)
    ├── App.jsx                 → Raíz: AuthProvider + AuthGate + BrowserRouter + rutas
    ├── index.css               → Estilos globales, animaciones, clases reutilizables
    │
    ├── store/
    │   └── useStore.js         → Zustand: estado + acciones CRUD optimistas + flag USE_SUPABASE
    │
    ├── lib/db/                 → Capa de datos (las vistas NO importan de aquí)
    │   ├── client.js           → Singleton de Supabase + define USE_SUPABASE
    │   ├── index.js            → Re-exports públicos del módulo db/
    │   ├── transform.js        → fetchAllUserData() (incluye purchase_orders) + mappers DB↔Store
    │   ├── suppliers.js        → CRUD suppliers
    │   ├── ingredients.js      → CRUD ingredients + updateStockInDb(id, stockQty, packSize)
    │   ├── recipes.js          → CRUD recipes + recipe_ingredients (2 tablas, rollback manual)
    │   ├── menus.js            → CRUD menus + menu_recipes (2 tablas)
    │   ├── calendar.js         → CRUD calendar_events + setEventCooked(id, cooked)
    │   ├── stockMovements.js   → insertStockMovement() + deleteMovementsByRef()
    │   ├── purchaseOrders.js   → CRUD purchase_orders + purchase_order_items
    │   ├── migration.js        → migrateLocalDataToDb() + hasLocalData() + isUserDbEmpty()
    │   ├── bulk.js             → Inserts batch (reservado para import CSV)
    │   └── errors.js           → mapSupabaseError()
    │
    ├── hooks/
    │   ├── useAuth.js          → Hook de auth: session, signIn/signUp/signOut + hidrata el store
    │   ├── AuthContext.jsx     → Provider: useAuth() corre UNA SOLA VEZ aquí
    │   ├── useAuthContext.js   → Hook de consumo del contexto (nombre distinto a propósito, ver G3)
    │   ├── useCrudState.js     → CRUD local genérico + localStorage opcional
    │   └── useDeleteConfirm.js → Borrado con doble click + timeout de 3s
    │
    ├── components/
    │   ├── AuthGate.jsx        → Modal login/signup si no hay sesión
    │   ├── MigrationBanner.jsx → Banner: migrar datos localStorage → Supabase
    │   ├── Toast.jsx           → Notificaciones (auto-dismiss 5s)
    │   ├── Sidebar.jsx         → Nav lateral fija (80px) + Sign Out
    │   ├── FormControls.jsx    → Átomos de formulario reutilizables: Label, TInput, SInput
    │   ├── GroupInput.jsx      → Input de comensales por grupo (A/B/C)
    │   ├── Toggle.jsx          → Switch on/off
    │   ├── StarRating.jsx      → Rating de estrellas
    │   ├── SkeletonList.jsx    → Placeholder de carga
    │   ├── ImportPreviewModal.jsx → Preview de importación de datos
    │   ├── UnsavedChangesModal.jsx → Modal de confirmación al salir con cambios sin guardar
    │   └── ErrorBoundary.jsx   → Captura de errores de render
    │
    ├── constants/
    │   └── theme.js            → Tokens de diseño: COLORS, MEAL_SLOTS, INGREDIENT_UNITS, INPUT_STYLE
    │
    ├── data/
    │   └── mockData.js         → Datos seed + MOTOR DE CÁLCULO (funciones puras)
    │
    ├── utils/
    │   ├── generatePurchaseOrderPDF.js → Motor jsPDF: PDF A4 con logo, tablas, subtotales
    │   └── units.js            → Conversión de unidades: convert(), areCompatible(), compatibleUnits()
    │
    └── views/                  → Vistas de página completa, lazy-loaded con React.lazy()
        ├── DashboardView.jsx   → /dashboard
        ├── RecipesView.jsx     → /recipes
        ├── CreateRecipeView.jsx→ /recipes/create, /recipes/edit/:id
        ├── MenusView.jsx       → /menus
        ├── CreateMenuView.jsx  → /menus/create, /menus/edit/:id
        ├── CalendarView.jsx    → /calendar
        ├── InventoryView.jsx   → /inventory
        ├── SuppliersView.jsx   → /suppliers
        ├── CartView.jsx        → /cart
        ├── OrdersView.jsx      → /orders (lista de POs, recepción, reimpresión PDF)
        └── DataPortalView.jsx  → /data (import/export de datos)

supabase/migrations/
├── 001_initial_schema.sql      → DDL completo: 7 tablas + RLS + triggers updated_at
├── 002_calendar_groups.sql     → Columna groups en calendar_events (aplicar a mano)
├── 003_fix_calendar_updated_at.sql → Fix updated_at en calendar_events (aplicar a mano)
├── 004_recipe_ingredient_unit.sql  → ADD COLUMN unit en recipe_ingredients (aplicar a mano)
├── 005_ingredient_stock_qty.sql    → ADD COLUMN stock_qty en ingredients (aplicar a mano)
├── 006_stock_movements.sql         → Tabla stock_movements + cooked/cooked_at en calendar_events (aplicar a mano)
└── 007_purchase_orders.sql         → Tablas purchase_orders + purchase_order_items (aplicar a mano)
```

### 4.4 Tabla de rutas

| Ruta | Vista | Notas |
|------|-------|-------|
| `/` | → redirect `/dashboard` | Fallback |
| `/dashboard` | DashboardView | Landing por defecto |
| `/recipes` | RecipesView | Lista + calculadora de receta única |
| `/recipes/create` · `/recipes/edit/:id` | CreateRecipeView | Crear / editar |
| `/menus` | MenusView | Lista + calculadora consolidada |
| `/menus/create` · `/menus/edit/:id` | CreateMenuView | Crear / editar |
| `/calendar` | CalendarView | Planificador mensual + botón "Mark as cooked" |
| `/inventory` | InventoryView | Catálogo de ingredientes (stock en unidad base) |
| `/suppliers` | SuppliersView | CRUD de proveedores |
| `/cart` | CartView | Carrito + "Generate Order" (persiste PO + PDF) |
| `/orders` | OrdersView | Lista de POs con estado, recepción y reimpresión PDF |
| `/data` | DataPortalView | Import/Export |
| `*` | → redirect `/dashboard` | Catch-all 404 |

---

## 5. Modelo de datos

El esquema vive en [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql)
(7 tablas, todas con `user_id` + RLS por `auth.uid()` + trigger `updated_at`). El store usa
**camelCase**; la DB usa **snake_case**. La conversión bidireccional ocurre en
[src/lib/db/transform.js](src/lib/db/transform.js).

### 5.1 Ingredient (catálogo de inventario)
```js
{
  id: string,
  name: string,
  unit: 'g'|'ml'|'units'|'kg'|'L'|'oz'|'gal'|'qt'|'lb'|'1#',  // INGREDIENT_UNITS
  packSize: number,        // cantidad que trae un pack, en `unit`
  stockQty: number,        // ★ FUENTE DE VERDAD: stock en unidad base (g, ml, units)
  currentStock: number,    // legacy: stock en packs (derivado = round(stockQty/packSize))
  minOrder: number,        // mínimo de packs a pedir
  supplier: string,        // nombre del proveedor (UI); supplierId guarda el UUID
  supplierId: string,
  pricePerPack: number,
  substitutable: boolean,
  substitute?: string      // se guarda como NOMBRE (string), no como id
}
```
> `stockQty` es la fuente de verdad desde migration 005. `currentStock` se mantiene como campo derivado para compatibilidad con vistas antiguas.

### 5.2 Recipe
```js
{
  id, name, category, rating /*1-5*/, image /*emoji*/, description, isNew?,
  baseServings?: number,                          // requerido si algún ingrediente usa inputMode='yield'
  portionFactors?: { A: number, B: number, C: number },  // multiplicadores vs B=1.0
  ingredients: [
    {
      ingredientId: string,
      inputMode: 'per-person' | 'yield',
      portionByGroup?: { A, B, C },   // cantidad por persona (modo per-person)
      quantityForBase?: number,        // total para baseServings (modo yield)
      wastePct?: number,               // % de merma, opcional
      unit?: string                    // ★ unidad de la receta (puede diferir del catálogo si son compatibles)
    }
  ]
}
```
La receta se guarda en dos tablas: `recipes` + `recipe_ingredients`. El campo `unit` en `recipe_ingredients` permite que una receta use `g` cuando el ingrediente del catálogo está en `kg`; `resolveIngredients()` convierte automáticamente usando `src/utils/units.js`.

### 5.3 Menu
```js
{ id, name, description, image /*emoji*/, recipeIds: string[] /*orden*/, createdAt }
```
Dos tablas: `menus` + `menu_recipes` (con `position` para el orden).

### 5.4 CalendarEvent
```js
// calendarEvents en el store: { "YYYY-MM-DD": CalendarEvent[] }
{ id, type: 'recipe'|'menu', slotKey: 'breakfast'|'lunch'|'dinner'|'snack',
  recipe?|menu?, groups: { A, B, C } /*comensales*/, note?,
  cooked: boolean,        // ★ true cuando el evento fue marcado como cocinado
  cookedAt: string|null   // ★ ISO timestamp del momento en que se cocinó
}
```
En DB es `calendar_events` (filas planas con `event_date`); el mapper reconstruye el objeto `{ "YYYY-MM-DD": [...] }`. Al marcar como cocinado se descuenta stock vía `stock_movements` (razón `'production'`).

### 5.5 Supplier
```js
{ id, name, contact /*URL o label*/, email, phone, color /*hex*/, notes }
```
El color del proveedor se propaga a headers del PDF, headers del carrito e indicadores.

### 5.6 CartItem (efímero — nunca se persiste en DB)
```js
{ ingredientId, name, unit, packSize, pricePerPack, supplier,
  stockQty, minOrder, demandSafe, R /*packs a ordenar*/ }
```

### 5.7 PurchaseOrder (persistida en DB)
```js
{
  id: string,
  status: 'pending'|'received'|'cancelled',
  deliveryDate: string|null,
  startDate: string|null, endDate: string|null,
  total: number,
  createdAt: string, receivedAt: string|null,
  items: [{
    id, ingredientId, name, supplier,
    R /*packs*/, packSize, unit, pricePerPack
  }]
}
```
Al llamar `receivePurchaseOrder(poId)` se suma `item.R * item.packSize` a `stockQty` de cada ingrediente y se registra un movimiento `'purchase'` en `stock_movements`.

### 5.8 StockMovement (audit log — solo DB, no en store)
```js
{ id, ingredient_id, qty_base /*positivo=entrada, negativo=salida*/,
  reason: 'purchase'|'production'|'adjustment',
  ref_type: 'purchase_order'|'calendar_event'|null,
  ref_id: string|null, created_at }
```

---

## 6. Motor de cálculo

Vive principalmente en [src/data/mockData.js](src/data/mockData.js) como **funciones puras**. La utilidad de conversión de unidades vive en [src/utils/units.js](src/utils/units.js).

### 6.0 Conversión de unidades (`src/utils/units.js`)
```js
convert(qty, fromUnit, toUnit) → number|null   // null si unidades incompatibles
areCompatible(unitA, unitB) → boolean          // misma dimensión (masa/volumen/count)
getDimension(unit) → 'mass'|'volume'|'count'|null
compatibleUnits(unit) → string[]               // filtra INGREDIENT_UNITS por misma dimensión
```
Dimensiones soportadas: **mass** (g/kg/oz/lb/1#), **volume** (ml/L/gal/qt), **count** (units).
`UNIT_TO_BASE`: convierte todo a la unidad base de cada dimensión (g, ml, units).

### 6.1 Requisición de una receta
```
D           = Σ ( portionByGroup[g] × groups[g].count )   // demanda cruda
wasteFactor = 1 + (wastePct / 100)                         // merma por ingrediente (default 1.0)
D_safe      = D × 1.10 × wasteFactor                        // +10% seguridad + merma
R           = ⌈ D_safe / packSize ⌉                         // packs a ordenar (techo)
```
`computeOrderPacks(demandSafe, packSize, currentStock, minOrder)` descuenta el stock disponible
y respeta el mínimo de pedido: `netPacks = max(0, ⌈D_safe/packSize⌉ − currentStock)`, y el
resultado es `max(netPacks, minOrder)` o `0`.

### 6.2 Requisición consolidada de un menú
Para cada receta del menú resuelve sus ingredientes; si un ingrediente aparece en >1 receta,
**suma las porciones por grupo antes** de calcular packs. Cuando un ingrediente compartido tiene
distintos `wastePct`, se usa el **mayor**.

### 6.3 Funciones clave
| Función | Firma | Propósito |
|---------|-------|-----------|
| `calcRequisition` | `(resolvedIngredient, groups) → { D, D_safe, R, packSize, unit, wastePct }` | Math de requisición de un ingrediente |
| `resolveIngredients` | `(recipe, catalog) → enrichedIngredients[]` | Une refs de receta con catálogo; convierte unidades si `ref.unit ≠ ing.unit` |
| `resolvePortionByGroup` | `(ingredientRef, recipe) → { A, B, C }` | Resuelve porciones para modos per-person y yield |
| `calcMenuRequisition` | `(menu, recipes, catalog, groups) → { consolidated[], byRecipe[] }` | Consolidación de menú completo |
| `computeOrderPacks` | `(demandSafe, packSize, stockQty, minOrder) → number` | Packs a pedir descontando `stockQty` (unidad base) |
| `calcConsumption` | `(event, recipeIndex, catalog) → [{ ingredientId, qtyBase }]` | Consumo real al cocinar (waste factor, sin +10% de seguridad) |
| `aggregateCalendarDemand` | `(calendarEvents, startDate, endDate, recipes, catalog) → { items[], mealsCount, recipesCount }` | Suma demanda de un rango del calendario |

---

## 7. Store global (Zustand)

Archivo: [src/store/useStore.js](src/store/useStore.js). Persistencia **condicional por feature flag**:
- `USE_SUPABASE=true` → sin middleware `persist`; los datos llegan de Supabase al login.
- `USE_SUPABASE=false` → `persist` a `localStorage['kitchencalc-store']`.

```js
{
  // Colecciones
  ingredients[], recipes[], menus[], suppliers[],
  cart[],                               // efímero, nunca en DB
  calendarEvents: { [dateKey]: CalendarEvent[] },
  purchaseOrders[],                     // ★ POs persistidas; cargadas en hydrate()

  // Hidratación
  isHydrating, hasHydrated, hydrationError,

  // Toasts (auto-dismiss 5s)
  toasts[], addToast({ type, message }), removeToast(id),

  // Acciones CRUD (async, optimistas cuando USE_SUPABASE=true):
  // patrón → update local inmediato → persist DB → rollback + toast si error
  addIngredient/updateIngredient/deleteIngredient,
  addRecipe/updateRecipe/deleteRecipe,
  addMenu/updateMenu/deleteMenu,
  addSupplier/updateSupplier/deleteSupplier,
  addToCart/removeFromCart/clearCart/buildCartFromCalendar,
  setCalendarEvents,                    // sincroniza solo las fechas que cambiaron

  // ★ Ciclo de inventario (plan_mejora.md)
  cookCalendarEvent(dateKey, eventId),   // descuenta stock + marca cooked=true + stock_movement
  uncookCalendarEvent(dateKey, eventId), // restaura stock + borra movimientos del evento
  loadPurchaseOrders(),                  // carga POs desde DB (usado en hydrate)
  createPurchaseOrderFromCart({ deliveryDate, startDate, endDate }), // persiste PO desde cart
  receivePurchaseOrder(poId),            // suma stock + marca status='received'
  deletePurchaseOrder(poId),             // elimina PO (optimistic)

  hydrate(data), resetStore(), setHydrating(b), setHydrationError(msg)
}
```
Función auxiliar exportada `setCurrentUserId(id)`: inyecta el `auth.uid()` para que las acciones
puedan pasarlo a la capa de DB. El update de **stock** usa un debounce de 600ms para no inundar
la DB con escrituras al usar el stepper +/−.

---

## 8. Capa de datos y Supabase

- **Cliente:** [src/lib/db/client.js](src/lib/db/client.js) crea el singleton y define `USE_SUPABASE`.
- **Hidratación:** `fetchAllUserData()` en [src/lib/db/transform.js](src/lib/db/transform.js)
  consulta las 7 tablas en paralelo y reconstruye las relaciones anidadas que espera el store.
- **CRUD por tabla:** un archivo por entidad en `src/lib/db/`. Recetas y menús afectan 2 tablas
  con **rollback manual** (si falla el insert de la junction, se borra la fila padre).
- **Mappers:** `dbXToStore` / `storeXToDb` convierten snake_case ↔ camelCase y resuelven FKs
  (ej. `supplier_id` ↔ nombre de proveedor).
- **Migración localStorage → Supabase:** `migrateLocalDataToDb()` en
  [src/lib/db/migration.js](src/lib/db/migration.js); el `MigrationBanner` la ofrece cuando hay
  datos locales y la DB del usuario está vacía. Respeta el orden de FKs.
- **Errores:** `mapSupabaseError()` traduce errores de Supabase a mensajes para toasts.

### Autenticación
- [src/hooks/useAuth.js](src/hooks/useAuth.js) maneja sesión, `signIn/signUp/signOut` e hidrata
  el store tras el login.
- [src/hooks/AuthContext.jsx](src/hooks/AuthContext.jsx) ejecuta `useAuth()` **una sola vez**
  (en `AuthProvider`); el consumo se hace con [src/hooks/useAuthContext.js](src/hooks/useAuthContext.js).
- [src/components/AuthGate.jsx](src/components/AuthGate.jsx) muestra el modal login/signup si no
  hay sesión.

---

## 9. Catálogo de módulos (resumen funcional)

- **Dashboard** — Stat cards + widgets bento (menú de hoy, low inventory, mockups de delivery/staff).
- **Recipes** — Lista filtrable + calculadora de receta única; inputs de comensales A/B/C; tabla
  de requisición; agregar al carrito. `CreateRecipeView` permite ingredientes "existentes" o
  "nuevos inline", modo per-person o yield, merma opcional y sustituto. Navigation guard
  (`useBlocker`) avisa antes de salir con cambios sin guardar.
- **Menus** — Calculadora consolidada con detección de ingredientes compartidos. `CreateMenuView`
  también incluye navigation guard (`useBlocker`) para proteger cambios no guardados.
- **Calendar** — Planificador mensual, 4 franjas (Breakfast/Lunch/Dinner/Snack); asigna recetas o
  menús con conteo de comensales por grupo.
- **Inventory** — CRUD del catálogo con barra de stock, stepper +/− y modal de creación/edición.
- **Suppliers** — Directorio con color de marca; aviso al borrar un proveedor con ingredientes.
- **Cart + PDF** — Ítems agrupados por proveedor, subtotales. Botón "Generate Order": persiste la PO en DB (`createPurchaseOrderFromCart`) y descarga el PDF (`generatePurchaseOrderPDF`).
- **Orders** — Lista de POs con estado (pending/received/cancelled), detalle expandible por ítems, botón "Receive" que repone stock, reimpresión PDF y borrado.
- **DataPortal** — Import/Export de datos del usuario.
- **Sidebar** — Nav fija 80px; ítems mockup (Budget/Activity/Staff) muestran alerta.

---

## 10. Cómo desarrollar en KitchenCalc

### 10.1 Setup y comandos
```bash
npm install          # instalar dependencias
npm run dev          # dev server en http://localhost:5173
npm run build        # build de producción → dist/
npm run preview      # previsualizar el build
npm run lint         # ESLint
```
Para usar Supabase en local, crear `.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
Sin esas variables, la app corre en modo local (mockData + localStorage), útil para desarrollo
rápido sin backend.

### 10.2 Convenciones de nombres
| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Componentes y vistas | `PascalCase.jsx` | `MenusView.jsx` |
| Hooks | `camelCase.js` con prefijo `use` | `useDeleteConfirm.js` |
| Utilidades | `camelCase.js` | `generatePurchaseOrderPDF.js` |
| Constantes | `UPPER_SNAKE_CASE` | `MEAL_SLOTS`, `COLORS` |
| Clases CSS | `kebab-case` | `.glass-card`, `.btn-primary` |
| Variables y funciones | `camelCase` | `selectedRecipe`, `handleSaveMenu` |

### 10.3 Idioma
- **Headers JSDoc de archivo** (`@file`, `@description`): en **español**.
- **Labels, botones y placeholders de UI**: en **inglés**.
- **Nombres de variables/funciones y comentarios inline**: en **inglés**.

### 10.4 Estilo de código
- Tokens de diseño desde [src/constants/theme.js](src/constants/theme.js) — nunca hardcodear
  colores de marca en otros lados.
- Estilos inline para lo específico de un componente; clases CSS para patrones reutilizables.
- Un componente por archivo (sub-componentes muy acoplados pueden vivir en el mismo archivo de vista).
- Hooks custom para lógica con estado reutilizable; mantener `App.jsx` como orquestador puro.
- **Sin TypeScript.**
- Reutilizar átomos de formulario de [src/components/FormControls.jsx](src/components/FormControls.jsx)
  (`Label`, `TInput`, `SInput`) en lugar de reinventar inputs.

### 10.5 Manejo de errores
1. Nunca tragarse errores en silencio: feedback al usuario **o** `console.error` con contexto.
2. Acceso null-safe obligatorio: `?.`, `??`, `.filter(Boolean)` sobre datos potencialmente undefined.
3. Validación de formularios: `const [errors, setErrors] = useState({})` → mensajes inline.
4. Nada de `try/catch` que devuelva silenciosamente `null` o arrays vacíos.
5. Nada de `alert()` ni `window.confirm()` — usar modales custom o UI inline.

### 10.6 Git
```
feat:     nueva funcionalidad
fix:      corrección de bug
refactor: reestructura sin cambio de comportamiento
docs:     solo documentación
style:    solo CSS/visual
```
`main` es producción. Crear ramas de feature solo cuando se indique. **No** hacer commit/push
automático — solo cuando el usuario lo pida.

---

## 11. Gotchas críticos (lecciones de producción — NO repetir)

> Bugs que solo aparecen en producción (Vercel + Supabase real) y costaron horas. Léelos antes de
> tocar auth, el store, o crear archivos en `src/hooks/`.

| # | Gotcha | Regla |
|---|--------|-------|
| **G1** | **Deadlock de supabase-js en `onAuthStateChange`** | El callback corre mientras supabase-js retiene un lock de auth interno. Si haces `await` de cualquier consulta a Supabase dentro (p. ej. `fetchAllUserData()`), esa consulta necesita el mismo lock → **deadlock** (queries "pending" para siempre; el contenido nunca carga). **Regla:** el callback debe ser **síncrono**; difiere el trabajo async con `setTimeout(() => {...}, 0)`. Ver [useAuth.js](src/hooks/useAuth.js). |
| **G2** | **Selector de Zustand v5 que devuelve objeto/array nuevo** | Zustand v5 compara con `Object.is`. Un selector `useStore(s => ({...}))` crea una referencia nueva cada render → re-render infinito → **React #185** (Maximum update depth) → la pestaña se congela. **Regla:** usa `useShallow` de `zustand/react/shallow` o selecciona primitivos por separado. |
| **G3** | **Colisión de nombres en filesystem case-insensitive (Windows)** | `authContext.js` y `AuthContext.jsx` son el **mismo archivo** para Windows/Rollup. **Regla:** nunca crees dos archivos cuyo nombre difiera solo en mayúsculas/extensión. Por eso el hook de consumo se llama `useAuthContext.js` (distinto de `AuthContext.jsx`). |
| **G4** | **`.env.local` local ≠ env vars en Vercel** | `USE_SUPABASE` se evalúa en **build time**. Tener `.env.local` en tu máquina no basta: hay que configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Vercel (Settings → Environment Variables) y re-desplegar. |
| **G5** | **Todas las migraciones son manuales** | Las migraciones 002-007 se aplican a mano en el SQL Editor de Supabase. Un checkout nuevo o proyecto recién creado puede no tenerlas. Orden obligatorio: 001→002→003→004→005→006→007. Las migraciones 004-007 añaden: `unit` en `recipe_ingredients`, `stock_qty` en `ingredients`, tabla `stock_movements` + columnas `cooked/cooked_at` en `calendar_events`, tablas `purchase_orders` + `purchase_order_items`. |

---

## 12. Reglas para agentes de IA (innegociables)

1. **Leer antes de codear.** Lee este documento (y `FORGE_MASTER_PLAN.md` / `DEVELOPMENT_TRACKER.md`
   si necesitas detalle/estado) antes de cualquier modificación.
2. **Sin commit/push automático.** Operaciones git solo cuando el usuario lo pida explícitamente.
3. **Sin dependencias nuevas** sin presentar y obtener aprobación del usuario.
4. **Sin borrar/renombrar archivos** sin aprobación.
5. **No refactorizar código que funciona** por gusto — anótalo como deuda técnica en
   `DEVELOPMENT_TRACKER.md` y sigue.
6. **Verificar compilación** (`npm run build` o `npm run lint`) antes de reportar que terminaste.
7. **Mantener la separación de capas:** vistas → store → `lib/db`. Las vistas no importan de
   `lib/db`; la lógica de Supabase no se filtra a la UI.
8. **Respetar el patrón optimista + rollback** en toda acción nueva del store, y la dualidad
   `USE_SUPABASE` (debe funcionar también en modo local con localStorage).

---

## 13. Estado actual y roadmap

- **Fase 1 — Core MVP:** ✅ completa (catálogo, calculadora de recetas y menús, calendario,
  carrito + PDF, proveedores, dashboard, persistencia localStorage).
- **Fase 2 — Calidad y pulido:** ✅ completa (code splitting, responsive, conteos de comensales
  por receta en menús, resumen de requisición en calendario).
- **Fase 3 — Backend real (Supabase):** ✅ completa (PostgreSQL + Auth + RLS, hidratación al
  login, optimistic updates, toasts, migración localStorage→DB, feature flag, import/export).
- **Ciclo de inventario completo (`plan_mejora.md`):** ✅ completo
  - Fase 0: `src/utils/units.js` — conversión de unidades (masa/volumen/count)
  - Fase 1: unidad flexible por ingrediente en recetas (`recipe_ingredients.unit`, migración 004)
  - Fase 2: `stockQty` como fuente de verdad en unidad base (migración 005, `InventoryView` actualizada)
  - Fase 3: movimientos de stock + botón "Mark as cooked" en `CalendarView` (migración 006, tabla `stock_movements`)
  - Fase 4: órdenes de compra persistentes (migración 007, `OrdersView`, botón "Generate Order" en `CartView`)
- **Módulos de expansión (futuro):** Budget (costos vs órdenes), Activity (audit log),
  Staff (disponibilidad de equipo). Hoy son mockups en el Sidebar.
- **Multi-cocina (futuro):** el esquema ya está preparado (`user_id` denormalizado); falta UI.

---

## 14. Despliegue

**Plataforma:** Vercel. **Config:** `vercel.json`
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```
Todas las rutas reescriben a `index.html` para que React Router maneje la navegación client-side.
Recordar configurar las variables `VITE_SUPABASE_*` en Vercel para que la build use Supabase
(ver gotcha **G4**).

---

*Documento de contexto de KitchenCalc. Para el detalle histórico/arquitectónico extendido ver
[FORGE_MASTER_PLAN.md](FORGE_MASTER_PLAN.md); para el estado de tareas, ver
[DEVELOPMENT_TRACKER.md](DEVELOPMENT_TRACKER.md).*
