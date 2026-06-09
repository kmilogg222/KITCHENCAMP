# Plan: Inventario consumible + unidades flexibles en recetas + órdenes de compra persistentes

## Contexto

Hoy KitchenCalc trata el stock como un número de **packs** que solo se ajusta a mano con
botones +/−. Las recetas obligan a escribir las cantidades en **la misma unidad** que el
ingrediente del inventario, lo que hace tedioso cargar recetas (ej. un ingrediente comprado
en `kg` obliga a escribir las porciones en `kg`). Además el carrito de compras genera un PDF
pero **no persiste** ni descuenta/repone stock: no hay ciclo de inventario real.

Este plan implementa un ciclo de inventario completo, decidido junto al usuario:

1. **Unidades flexibles en recetas** — al agregar un ingrediente a una receta se puede elegir
   la unidad de la cantidad (ej. `200 g` aunque el ingrediente esté en `kg`). Conversión solo
   **dentro de la misma dimensión** (masa↔masa, volumen↔volumen, conteo↔conteo).
2. **Stock en unidad base** — el stock se guarda en la unidad real del ingrediente (g, ml,
   units); los packs se derivan (`stockQty / packSize`). Permite consumo parcial.
3. **Consumo al cocinar** — cada evento del calendario tiene un botón "Marcar como cocinado"
   que descuenta del stock los ingredientes consumidos (con su desperdicio), registrando un
   movimiento de inventario. Se puede deshacer.
4. **Órdenes de compra persistentes** — al generar una orden desde el carrito se guarda con
   estado `pendiente`; al marcarla `recibida` repone el stock automáticamente.

> **Nota arquitectónica:** todo el código respeta el patrón existente de *optimistic updates*
> con rollback + toast cuando `USE_SUPABASE` está activo, y degradación a localStorage cuando
> no lo está (ver [src/store/useStore.js](src/store/useStore.js)). Todas las tablas nuevas
> llevan `user_id` + RLS como el resto del esquema.

### Punto a confirmar antes de empezar (no bloquea el diseño)
- El significado de la unidad **`1#`** en [src/constants/theme.js:60](src/constants/theme.js#L60).
  Se asume "1 libra" (masa, = 453.592 g). Si es "1 unidad/each" o "1 caja", ajustar el factor
  en `units.js` (Fase 0). `units` se trata como dimensión **conteo** (factor 1, sin conversión
  cruzada).

---

## Fase 0 — Utilidad de conversión de unidades (fundación)

**Objetivo:** una función pura reutilizable para convertir cantidades entre unidades compatibles.

**Crear** `src/utils/units.js`:
- Definir un mapa `UNIT_DIMENSION` que clasifique cada unidad de `INGREDIENT_UNITS`:
  - masa: `g`(base), `kg`, `oz`, `lb`, `1#`
  - volumen: `ml`(base), `L`, `gal`, `qt`
  - conteo: `units`(base)
- Definir `UNIT_TO_BASE` (factor a la unidad base de su dimensión):
  `g:1, kg:1000, oz:28.3495, lb:453.592, '1#':453.592, ml:1, L:1000, gal:3785.41, qt:946.353, units:1`.
- Exportar funciones puras:
  - `getDimension(unit)` → `'mass' | 'volume' | 'count' | null`
  - `areCompatible(a, b)` → `getDimension(a) === getDimension(b)` (ambas no nulas)
  - `convert(qty, fromUnit, toUnit)` → `qty * UNIT_TO_BASE[from] / UNIT_TO_BASE[to]`; si no son
    compatibles, lanzar/retornar `null` (definir contrato: retornar `null` y que el llamador
    decida). Si `from === to`, retornar `qty` sin más.
  - `compatibleUnits(unit)` → array de unidades de la misma dimensión (para poblar selects).
- **Reusar** `INGREDIENT_UNITS` desde [src/constants/theme.js](src/constants/theme.js) como
  fuente única de la lista.

**Crear** `src/utils/units.test.js` (si hay runner de tests; el repo no parece tener uno
configurado aún — si no existe, dejar el archivo con casos en comentario o añadir Vitest en
una sub-tarea). Casos mínimos: `convert(1,'kg','g')===1000`, `convert(500,'g','kg')===0.5`,
`convert(1,'g','ml')===null`, `convert(2,'units','units')===2`.

**Verificación Fase 0:** importar en una consola/REST temporal y comprobar las conversiones, o
ejecutar los tests. No toca UI todavía.

---

## Fase 1 — Unidad por ingrediente en recetas

**Objetivo:** que cada línea de ingrediente de una receta guarde su propia unidad y el motor
convierta a la unidad del ingrediente antes de calcular.

### 1.1 Migración DB
**Crear** `supabase/migrations/004_recipe_ingredient_unit.sql`:
```sql
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS unit text;
-- NULL = usar la unidad del ingrediente del catálogo (retrocompatible).
```
(Aplicar manualmente en el SQL Editor de Supabase, como las migraciones 002/003 — ver gotcha
G5 en [FORGE_MASTER_PLAN.md](FORGE_MASTER_PLAN.md).)

### 1.2 Capa de datos
En [src/lib/db/transform.js](src/lib/db/transform.js):
- `dbRecipeToStore` (línea ~136): añadir `if (ri.unit) ref.unit = ri.unit;` al construir cada `ref`.
- `storeRecipeIngredientsToDb` (línea ~302): añadir `unit: ref.unit ?? null` a cada fila.

### 1.3 Motor de cálculo
En [src/data/mockData.js](src/data/mockData.js):
- En `resolveIngredients` (línea ~338) / `resolvePortionByGroup` (línea ~318): tras obtener las
  porciones por grupo, **convertir cada valor** de `ref.unit` (si existe y difiere) a la unidad
  del ingrediente del catálogo usando `convert(...)` de `src/utils/units.js`. Es decir, las
  porciones que el resto del motor consume quedan SIEMPRE en la unidad del catálogo, por lo que
  `calcRequisition` (que divide por `packSize`) no cambia.
  - Para `inputMode: 'yield'`, convertir `quantityForBase` de `ref.unit` → unidad del catálogo
    antes de derivar las porciones.
  - Si `convert` retorna `null` (unidades incompatibles), tratar como sin conversión y registrar
    `console.warn` (no debería ocurrir porque la UI restringe el select a unidades compatibles).
- Importar `convert` al inicio del archivo.

### 1.4 UI de creación/edición de recetas
En [src/views/CreateRecipeView.jsx](src/views/CreateRecipeView.jsx):
- `blankSlot` (línea ~19): añadir `unit: ''` (vacío = heredar del ingrediente).
- `slotsFromRecipe` (línea ~33): poblar `unit: ref.unit ?? (cat?.unit ?? 'g')`.
- En `IngredientSlot` (línea ~55), en la sección de porciones (modo `existing`), añadir un
  `<SInput>` de **unidad** junto a los inputs de cantidad. Sus opciones deben ser
  `compatibleUnits(selectedIng.unit)` (solo unidades de la misma dimensión que la del catálogo).
  Default = unidad del ingrediente. Mostrar un hint pequeño tipo "stock en {selectedIng.unit}".
- Al construir el objeto receta para guardar (la función que arma `ingredients[]`), incluir
  `unit: slot.unit || undefined` en cada ref.
- Reusar `SInput`/`Label` de [src/components/FormControls.jsx](src/components/FormControls.jsx).

**Verificación Fase 1:** crear una receta usando un ingrediente en `kg` pero ingresando la
porción en `g`; verificar en el cálculo de requisición (RecipesView) que la demanda y los packs
salen correctos (equivalentes a haberlo escrito en `kg`). Editar la receta y confirmar que la
unidad persiste.

---

## Fase 2 — Stock en unidad base

**Objetivo:** que `stockQty` (unidad base del ingrediente) sea la fuente de verdad; los packs
se derivan. Habilita consumo y recepción parciales.

### 2.1 Migración DB
**Crear** `supabase/migrations/005_ingredient_stock_qty.sql`:
```sql
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS stock_qty numeric NOT NULL DEFAULT 0;
UPDATE ingredients SET stock_qty = current_stock * pack_size WHERE stock_qty = 0;
-- current_stock queda como legacy; el código deja de leerlo para stock.
```

### 2.2 Capa de datos
- [src/lib/db/transform.js](src/lib/db/transform.js):
  - `dbIngredientToStore` (línea ~118): añadir `stockQty: ing.stock_qty ?? (ing.current_stock * ing.pack_size) ?? 0`.
  - `storeIngredientToDb` (línea ~260): añadir `stock_qty: ingredient.stockQty ?? 0`. Mantener
    `current_stock` por compat (puede setearse a `Math.round(stockQty/packSize)` o dejarse).
- [src/lib/db/ingredients.js](src/lib/db/ingredients.js): `updateStockInDb` (línea ~36) debe
  actualizar `stock_qty` en vez de (o además de) `current_stock`. Renombrar a semántica clara:
  `update({ stock_qty: newStockQty })`.

### 2.3 Lógica de packs a ordenar
En [src/data/mockData.js](src/data/mockData.js), `computeOrderPacks` (línea ~281): cambiar la
firma para recibir **stock en unidad base** en vez de packs:
```js
export function computeOrderPacks(demandSafe, packSize, stockQty = 0, minOrder = 1) {
  if (!packSize || packSize <= 0) return 0;
  const netQty = Math.max(0, demandSafe - (stockQty ?? 0));   // base units faltantes
  const netPacks = Math.ceil(netQty / packSize);
  if (netPacks <= 0) return 0;
  return Math.max(netPacks, minOrder ?? 1);
}
```
Actualizar **todos los llamadores** para pasar `ingredient.stockQty` en lugar de `currentStock`:
- [src/store/useStore.js](src/store/useStore.js): `addToCart` (línea ~296) y
  `buildCartFromCalendar` (línea ~327) — cambiar `currentStock` → `stockQty` en el item del cart
  y en las llamadas a `computeOrderPacks`.

### 2.4 UI de inventario
En [src/views/InventoryView.jsx](src/views/InventoryView.jsx):
- `StockStepper` (línea ~35): operar sobre `stockQty`. Cada click +/− suma/resta **un pack**
  (`±packSize`) sobre `stockQty`, clamp a 0. Mostrar el valor como `stockQty` + un sub-label
  derivado `≈ {stockQty/packSize} packs`. (Pasar `packSize` como prop.)
- `IngredientModal` (línea ~52): el campo "Stock" pasa a capturar **cantidad en la unidad base**
  (label dinámico `Stock ({form.unit})`), con un texto auxiliar `≈ N packs`. En `handleSave`
  setear `stockQty: Number(form.stockQty)`. Para ingredientes nuevos default 0.
- Indicador low-stock y barra (líneas ~237, ~242, ~364): cambiar la condición a
  `stockQty <= minOrder * packSize`. La barra `pct` recalcular sobre base units.
- La detección `stockOnly` en `updateIngredient` ([src/store/useStore.js:157](src/store/useStore.js#L157))
  debe comparar `stockQty` en lugar de `currentStock`.

### 2.5 Seed / compat sin Supabase y migración localStorage
- [src/data/mockData.js](src/data/mockData.js): el catálogo seed define `currentStock` en packs.
  Añadir `stockQty: currentStock * packSize` a cada ingrediente seed (o normalizar al hidratar).
- [src/lib/db/migration.js](src/lib/db/migration.js): al migrar ingredientes de localStorage,
  setear `stock_qty` desde `currentStock * packSize` si el dato viejo no lo trae.

**Verificación Fase 2:** abrir Inventario; el stock se ve en unidad base con "≈ packs"; el
stepper suma/resta un pack; generar carrito desde calendario y confirmar que los packs a pedir
respetan el stock disponible (incluyendo consumo parcial).

---

## Fase 3 — Movimientos de stock + consumo al cocinar

**Objetivo:** descontar stock al marcar un evento del calendario como cocinado, con trazabilidad
y opción de deshacer.

### 3.1 Migración DB
**Crear** `supabase/migrations/006_stock_movements.sql`:
```sql
CREATE TABLE IF NOT EXISTS stock_movements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
  qty_base      numeric NOT NULL,          -- firmado: negativo=consumo, positivo=ingreso
  reason        text NOT NULL,             -- 'production' | 'purchase' | 'adjustment'
  ref_type      text,                      -- 'calendar_event' | 'purchase_order' | null
  ref_id        uuid,
  created_at    timestamptz DEFAULT now()
);
-- RLS por user_id (replicar políticas SELECT/INSERT/DELETE del esquema 001).
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS cooked boolean NOT NULL DEFAULT false;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS cooked_at timestamptz;
```
Añadir índice `idx_stock_movements_ingredient_id`. Replicar el bloque de políticas RLS del
patrón de [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql).

### 3.2 Capa de datos
**Crear** `src/lib/db/stockMovements.js`: `insertStockMovement(mv, userId)`,
`deleteMovementsByRef(refType, refId)`. Exportar desde [src/lib/db/index.js](src/lib/db/index.js).
- [src/lib/db/calendar.js](src/lib/db/calendar.js): añadir `setEventCooked(eventId, cooked)` que
  actualice `cooked` + `cooked_at` en `calendar_events`.
- [src/lib/db/transform.js](src/lib/db/transform.js): `dbCalendarToStore` (línea ~196) propagar
  `cooked: row.cooked ?? false` y `cookedAt` al entry del store.

### 3.3 Cálculo de consumo
En [src/data/mockData.js](src/data/mockData.js) añadir helper `calcConsumption(recipe, catalog, groups)`:
- Reutiliza `resolveIngredients` (que ya convierte a unidad base, Fase 1).
- Para cada ingrediente: `consumed = D * (1 + wastePct/100)` donde `D = Σ count*portion`.
  **No** aplica el margen de seguridad ×1.1 (eso es solo para compras, no es consumo real).
- Retorna `[{ ingredientId, qtyBase }]`. Para eventos `type:'menu'`, sumar sobre las recetas del
  menú (mismo patrón que `aggregateCalendarDemand`, línea ~457).

### 3.4 Acción en el store
En [src/store/useStore.js](src/store/useStore.js) añadir:
- `cookCalendarEvent(dateKey, eventId)`:
  1. Localizar el evento; si ya está `cooked`, abortar.
  2. Calcular consumo con `calcConsumption`.
  3. Optimista: restar `qtyBase` de `ingredient.stockQty` de cada ingrediente; marcar evento
     `cooked:true`.
  4. Persistir (si `USE_SUPABASE`): por cada ingrediente, `insertStockMovement({ qty_base:
     -qtyBase, reason:'production', ref_type:'calendar_event', ref_id:eventId })` y
     `updateStockInDb(id, nuevoStockQty)`; `setEventCooked(eventId, true)`. Rollback + toast si falla.
- `uncookCalendarEvent(dateKey, eventId)`: inverso — sumar de vuelta, borrar movimientos por ref,
  `setEventCooked(eventId, false)`.
- Reusar el patrón optimista existente (ver `updateIngredient`).

### 3.5 UI calendario
En [src/views/CalendarView.jsx](src/views/CalendarView.jsx): en cada tarjeta de evento, añadir
botón "Marcar como cocinado" (o check verde si ya `cooked`, con opción "Deshacer"). Al hacer
clic invoca `cookCalendarEvent` / `uncookCalendarEvent`. Mostrar toast con resumen
("Descontados: Pollo 4.55 kg, …"). Deshabilitar si algún ingrediente quedaría negativo o avisar
(decisión: permitir negativo con warning, ya que el stock real puede haberse repuesto fuera de
sistema — confirmar en review).

**Verificación Fase 3:** marcar un evento como cocinado; confirmar que el stock baja en
Inventario y que existe una fila en `stock_movements`. Deshacer y confirmar que el stock vuelve.

---

## Fase 4 — Órdenes de compra persistentes + recepción

**Objetivo:** que generar una orden la guarde con estado `pendiente`; al recibirla, reponer stock.

### 4.1 Migración DB
**Crear** `supabase/migrations/007_purchase_orders.sql`:
```sql
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
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  po_id          uuid REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  ingredient_id  uuid REFERENCES ingredients(id) ON DELETE SET NULL,
  name_snapshot  text NOT NULL,
  supplier_snapshot text,
  packs          numeric NOT NULL,
  pack_size      numeric NOT NULL,        -- snapshot para reponer stock correctamente
  unit           text,
  price_per_pack numeric NOT NULL DEFAULT 0
);
-- RLS por user_id en ambas tablas.
```

### 4.2 Capa de datos
**Crear** `src/lib/db/purchaseOrders.js`: `insertPurchaseOrder(po, items, userId)` (inserta
cabecera + items con rollback manual, igual que `insertRecipeWithIngredients`),
`fetchPurchaseOrders(userId)`, `updatePurchaseOrderStatus(poId, status)`,
`deletePurchaseOrder(poId)`. Exportar en [src/lib/db/index.js](src/lib/db/index.js).
- [src/lib/db/transform.js](src/lib/db/transform.js): añadir `fetchPurchaseOrders` a
  `fetchAllUserData` (línea ~17) si se quiere hidratar al cargar; o cargar bajo demanda en la vista.

### 4.3 Store
En [src/store/useStore.js](src/store/useStore.js):
- Estado nuevo `purchaseOrders: []`.
- `createPurchaseOrderFromCart({ deliveryDate, startDate, endDate })`: construye PO + items desde
  `cart`, persiste con estado `pending`, lo agrega a `purchaseOrders`, y limpia el cart.
- `receivePurchaseOrder(poId)`: por cada item, **sumar** `packs * pack_size` a `ingredient.stockQty`,
  insertar `stock_movement` (`reason:'purchase'`, `ref_type:'purchase_order'`, `ref_id:poId`),
  y `updatePurchaseOrderStatus(poId,'received')`. Optimista + rollback.

### 4.4 UI
En [src/views/CartView.jsx](src/views/CartView.jsx): el botón actual "Generate PDF" pasa a
"Generar orden": persiste la PO (`createPurchaseOrderFromCart`) **y** sigue generando el PDF con
`generatePurchaseOrderPDF` (sin cambios en [src/utils/generatePurchaseOrderPDF.js](src/utils/generatePurchaseOrderPDF.js)).
**Crear vista** `src/views/OrdersView.jsx` (lista de POs con estado, botón "Marcar recibida" que
llama `receivePurchaseOrder`, y reimprimir PDF). Registrar ruta `/orders` lazy-loaded en
[src/App.jsx](src/App.jsx) y añadir entrada en [src/components/Sidebar.jsx](src/components/Sidebar.jsx).

**Verificación Fase 4:** generar una orden desde el carrito → aparece en `/orders` como
pendiente y se descarga el PDF. Marcarla recibida → el stock de cada ingrediente sube en
`packs*packSize` y se crea el `stock_movement` correspondiente.

---

## Verificación end-to-end (ciclo completo)

1. Crear ingrediente "Pollo" en `kg`, pack 2 kg, stock 6 packs (= 12 kg).
2. Crear receta que use Pollo ingresando la porción en `g` (ej. 150 g/persona) → confirmar
   cálculo correcto.
3. Agendar la receta en el calendario para A/B/C personas.
4. Generar orden desde el calendario/carrito → persiste como pendiente + PDF.
5. Marcar la orden como **recibida** → el stock de Pollo sube.
6. Marcar el evento del calendario como **cocinado** → el stock de Pollo baja según consumo
   (con desperdicio), aparece movimiento `production`.
7. Revisar Inventario: el stock refleja recepción − consumo; `stock_movements` tiene ambas filas.
8. Deshacer "cocinado" → el stock se restaura.

Correr `npm run build` / `npm run lint` al cerrar cada fase para evitar regresiones.

---

## Resumen de archivos

**Nuevos:** `src/utils/units.js`, `src/lib/db/stockMovements.js`, `src/lib/db/purchaseOrders.js`,
`src/views/OrdersView.jsx`, migraciones `004`–`007`.

**Modificados:** [src/data/mockData.js](src/data/mockData.js) (conversión, `computeOrderPacks`,
`calcConsumption`, seed `stockQty`), [src/lib/db/transform.js](src/lib/db/transform.js),
[src/lib/db/ingredients.js](src/lib/db/ingredients.js), [src/lib/db/calendar.js](src/lib/db/calendar.js),
[src/lib/db/index.js](src/lib/db/index.js), [src/lib/db/migration.js](src/lib/db/migration.js),
[src/store/useStore.js](src/store/useStore.js), [src/views/CreateRecipeView.jsx](src/views/CreateRecipeView.jsx),
[src/views/InventoryView.jsx](src/views/InventoryView.jsx), [src/views/CalendarView.jsx](src/views/CalendarView.jsx),
[src/views/CartView.jsx](src/views/CartView.jsx), [src/App.jsx](src/App.jsx),
[src/components/Sidebar.jsx](src/components/Sidebar.jsx).

## Orden de ejecución recomendado
Fase 0 → 1 → 2 → 3 → 4. Las fases 0–2 son prerrequisito de 3–4. Cada fase es desplegable de forma
independiente y retrocompatible (columnas nuevas son nullable o con default).
