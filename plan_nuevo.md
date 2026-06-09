# Plan: Corrección de bugs + Rediseño de Órdenes de Compra (KitchenCalc)

> **Para el agente ejecutor:** Este documento es autosuficiente. Ejecuta las fases **en orden**. Cada
> fase termina con un bloque de **Verificación** que DEBES correr antes de pasar a la siguiente.
> El proyecto es React 19 + Vite + Zustand + Supabase, **JavaScript sin TypeScript**. Respeta el estilo
> existente (comentarios en español, código en inglés, estilos inline). No introduzcas TypeScript ni
> librerías nuevas. Trabaja en una rama nueva, no en `main`.

---

## Context

KitchenCalc gestiona cocina profesional: recetas, ingredientes (catálogo con `packSize`, `currentStock`,
`minOrder`, `pricePerPack`, `supplier`), menús, proveedores y un calendario de producción. El objetivo
del usuario es: planificar en el calendario **qué** se cocina cada día/franja y **para cuántas personas**,
y a partir de la comida de un rango (p. ej. una semana) **generar una orden de compra** que descuente el
inventario, se pueda filtrar por proveedor y tenga fecha de entrega.

Hoy esto NO es posible por dos motivos:

1. **El carrito está roto** por un desajuste de forma entre 3 archivos (detalle en Fase 0). Las
   cantidades salen `NaN`, el total es `$NaN`, "✓ Added" nunca aparece y **eliminar del carrito lanza
   una excepción**.
2. **El calendario no guarda cuántas personas comen** (solo una nota de texto libre), y el motor de
   cálculo `calcRequisition` necesita conteos por grupo. Además el cálculo actual **no resta el
   inventario**.

### Decisiones de diseño ya tomadas con el usuario
- **Conteo de personas: por comida** (cada evento/franja del calendario tiene su propio conteo).
- **Mantener los 3 grupos A/B/C** (Niños/Jóvenes/Adultos) con porciones por receta.
- **Reutilizar el carrito**: arreglarlo y agregar en el calendario un flujo que vuelca un rango de
  fechas al carrito existente; el PDF se genera desde el carrito.
- **Entrega por fases**, con MVP funcional primero.
- Dietas alternativas (celíacos/vegetarianos + recetas/ingredientes sustitutos) son **futuro**: solo
  dejar el modelo preparado, NO implementarlas ahora.

### Forma canónica del CartItem (usar en TODO el código)
A partir de la Fase 0, un ítem del carrito es **exactamente**:
```js
{
  ingredientId: string,   // id del ingrediente del catálogo
  name:         string,
  unit:         string,
  packSize:     number,
  pricePerPack: number,
  supplier:     string,   // = ingredient.supplier (coincide con suppliers[].id)
  currentStock: number,   // snapshot de packs en stock al momento de agregar
  minOrder:     number,
  demandSafe:   number,   // demanda acumulada en unidades base (Σ D_safe). Permite re-agregar.
  R:            number,   // packs A ORDENAR = computeOrderPacks(demandSafe, packSize, currentStock, minOrder)
}
```
`R` es siempre el resultado de `computeOrderPacks` (ver Fase 0), nunca se asigna a mano.

### Archivos clave (rutas reales)
- Store: [src/store/useStore.js](src/store/useStore.js)
- Motor de cálculo + seed: [src/data/mockData.js](src/data/mockData.js)
- Carrito (vista): [src/views/CartView.jsx](src/views/CartView.jsx)
- Recetas (vista que agrega al carrito): [src/views/RecipesView.jsx](src/views/RecipesView.jsx)
- Calendario: [src/views/CalendarView.jsx](src/views/CalendarView.jsx)
- PDF: [src/utils/generatePurchaseOrderPDF.js](src/utils/generatePurchaseOrderPDF.js)
- DB calendario: [src/lib/db/calendar.js](src/lib/db/calendar.js)
- Transformaciones DB↔store: [src/lib/db/transform.js](src/lib/db/transform.js)
- Migración local→Supabase: [src/lib/db/migration.js](src/lib/db/migration.js)
- Tokens/constantes: [src/constants/theme.js](src/constants/theme.js) (`MEAL_SLOTS`, `INPUT_STYLE`)
- Hook reutilizable de grupos: [src/components/GroupInput.jsx](src/components/GroupInput.jsx)
- Hook muerto a eliminar: [src/hooks/useCartManager.js](src/hooks/useCartManager.js)
- Migraciones SQL: `supabase/migrations/` (la inicial es `001_initial_schema.sql`)

---

## FASE 0 — Corrección de bugs (base imprescindible)

### 0.1 — Arreglar el carrito (BUG CRÍTICO)
**Diagnóstico (confirmado leyendo el código):**
- [RecipesView.jsx:52](src/views/RecipesView.jsx#L52) llama `onAddToCart(ingredient, result)` con **2 args**.
- [useStore.js:289-296](src/store/useStore.js#L289) `addToCart` espera **1** objeto `{ ingredient, packs }` y
  usa `c.ingredient.id`; `removeFromCart` filtra por `c.ingredient.id`.
- [CartView.jsx](src/views/CartView.jsx) lee `item.ingredientId`, `item.R`, `item.pricePerPack`,
  `item.supplier`, `item.name` y llama `onRemove(item.ingredientId)`.
- [RecipesView.jsx:245](src/views/RecipesView.jsx#L245) ya espera `c.ingredientId` en el carrito.

Consecuencia: los ítems entran como objetos crudos del catálogo → `R` queda `undefined` (subtotales/total
`$NaN`), `alreadyInCart` siempre `false`, y `removeFromCart(undefined)` revienta con `c.ingredient.id`.

**Acción — reescribir las acciones del carrito en [src/store/useStore.js](src/store/useStore.js):**

1. Importar el helper de packs desde mockData (lo creamos en 0.2):
   ```js
   import { computeOrderPacks } from '../data/mockData';
   ```
2. Reemplazar el bloque `addToCart`/`removeFromCart`/`clearCart` (líneas ~288-297) por:
   ```js
   // ── Cart (efímero — no se persiste en DB) ──────────────────────────────────
   // item canónico: ver "Forma canónica del CartItem" en el plan.
   addToCart: (ingredient, result) => set((state) => {
     const addedDemand = result?.D_safe ?? 0;
     const existing = state.cart.find(c => c.ingredientId === ingredient.id);
     if (existing) {
       const demandSafe = existing.demandSafe + addedDemand;
       return {
         cart: state.cart.map(c => c.ingredientId === ingredient.id
           ? { ...c, demandSafe, R: computeOrderPacks(demandSafe, c.packSize, c.currentStock, c.minOrder) }
           : c),
       };
     }
     const item = {
       ingredientId: ingredient.id,
       name:         ingredient.name,
       unit:         ingredient.unit,
       packSize:     ingredient.packSize,
       pricePerPack: ingredient.pricePerPack,
       supplier:     ingredient.supplier,
       currentStock: ingredient.currentStock ?? 0,
       minOrder:     ingredient.minOrder ?? 1,
       demandSafe:   addedDemand,
       R:            computeOrderPacks(addedDemand, ingredient.packSize, ingredient.currentStock ?? 0, ingredient.minOrder ?? 1),
     };
     return { cart: [...state.cart, item] };
   }),
   removeFromCart: (ingredientId) => set(state => ({
     cart: state.cart.filter(c => c.ingredientId !== ingredientId),
   })),
   clearCart: () => set({ cart: [] }),
   ```
   > Nota: la firma `addToCart(ingredient, result)` coincide con la llamada existente en RecipesView,
   > así que esa vista NO necesita cambios para el alta. `removeFromCart` ahora recibe `ingredientId`.

3. Eliminar el hook muerto [src/hooks/useCartManager.js](src/hooks/useCartManager.js) (no se usa en
   ningún lugar; confírmalo con una búsqueda de `useCartManager` antes de borrar).

### 0.2 — Restar inventario en el cálculo de packs
**Acción — en [src/data/mockData.js](src/data/mockData.js):**

1. Añadir un helper exportado (cerca de `calcRequisition`):
   ```js
   /**
    * Packs a ordenar a partir de una demanda ya "segura" (con margen/merma aplicados),
    * descontando el stock disponible y respetando el mínimo de pedido.
    * netPacks = max(0, ceil(demandSafe / packSize) - currentStock)
    * Si netPacks > 0, se respeta minOrder: R = max(netPacks, minOrder).
    */
   export function computeOrderPacks(demandSafe, packSize, currentStock = 0, minOrder = 1) {
     if (!packSize || packSize <= 0) return 0;
     const grossPacks = Math.ceil(demandSafe / packSize);
     const netPacks = Math.max(0, grossPacks - (currentStock ?? 0));
     if (netPacks <= 0) return 0;
     return Math.max(netPacks, minOrder ?? 1);
   }
   ```
   > Decisión: el descuento de inventario y el `minOrder` viven aquí, en un solo lugar reutilizable por
   > el carrito (Fase 0) y por la agregación del calendario (Fase 2). Si el usuario más adelante NO quiere
   > respetar `minOrder`, es un cambio de una línea.

2. **No** cambies `calcRequisition` (sigue devolviendo `R` bruto sin descontar stock para la vista de
   recetas que muestra "Order"). El descuento solo aplica al carrito/orden de compra. Esto evita romper
   la pantalla de RecipesView que muestra stock vs. order en colores.

### 0.3 — Bug menor en detección de "solo stock" al editar ingredientes
**Diagnóstico:** en [useStore.js:156-161](src/store/useStore.js#L156) la comparación `stockOnly` usa
`prev.cost`/`updatedIng.cost`, pero el campo real es `pricePerPack`. Por eso, si editas precio **y** stock
a la vez, se toma el camino "solo stock" (debounce) y el cambio de precio no se persiste.

**Acción:** en el objeto `stockOnly`, reemplazar la comparación de `cost` y endurecerla a los campos que
realmente definen "solo cambió stock":
```js
const stockOnly = prev &&
  prev.currentStock !== updatedIng.currentStock &&
  prev.name         === updatedIng.name &&
  prev.unit         === updatedIng.unit &&
  prev.packSize     === updatedIng.packSize &&
  prev.minOrder     === updatedIng.minOrder &&
  prev.pricePerPack === updatedIng.pricePerPack &&
  prev.supplier     === updatedIng.supplier &&
  prev.substitutable=== updatedIng.substitutable &&
  prev.substitute   === updatedIng.substitute;
```

### Verificación Fase 0
1. `npm run lint` sin errores nuevos.
2. `npm run dev`. En **Recipes**: selecciona "Chicken Piccata", pon Adultos=40, "Generate Requisition",
   pulsa "+ Cart" en 2-3 ingredientes → el botón pasa a "✓ Added".
3. En **Cart**: los packs y subtotales muestran números reales (no `NaN`), el Grand Total es coherente.
   Pulsa el ícono de papelera → el ítem se elimina **sin** error en consola.
4. Verifica el descuento de inventario: un ingrediente con `currentStock` alto debe mostrar menos (o 0)
   packs que su demanda bruta. Un ingrediente con stock 0 muestra los packs completos (mínimo `minOrder`).
5. Edita un ingrediente cambiando precio + stock a la vez (modo Supabase si está configurado, o local) y
   confirma que ambos persisten tras recargar.

---

## FASE 1 — Personas por comida en el calendario

Añadir conteos por grupo A/B/C a cada evento del calendario, persistidos en store y DB.

### 1.1 — Forma del evento de calendario
El evento pasa a incluir `groups`:
```js
{ id, type, slotKey, recipe?, menu?, menuRecipes?, note, groups: { A: number, B: number, C: number } }
```
Default `{ A: 0, B: 0, C: 0 }` cuando no se especifica.

### 1.2 — Migración SQL
Crear `supabase/migrations/002_calendar_groups.sql`:
```sql
-- Conteo de comensales por grupo (A/B/C) por evento de calendario.
alter table public.calendar_events
  add column if not exists groups jsonb not null default '{"A":0,"B":0,"C":0}'::jsonb;
```
> El usuario debe aplicarla en Supabase (SQL Editor o CLI). Documentarlo en la verificación.

### 1.3 — Mapeo DB → store
En [src/lib/db/transform.js](src/lib/db/transform.js), dentro de `dbCalendarToStore`, al construir `entry`
(línea ~196) añade:
```js
groups: row.groups ?? { A: 0, B: 0, C: 0 },
```

### 1.4 — Mapeo store → DB
En [src/lib/db/calendar.js](src/lib/db/calendar.js), en `insertCalendarEvent` (objeto `row`) y en
`setCalendarEventsForDate` (`rows.map`), añade a cada fila:
```js
groups: ev.groups ?? { A: 0, B: 0, C: 0 },   // usa `event.groups` en insertCalendarEvent
```

### 1.5 — Migración local→Supabase
En [src/lib/db/migration.js](src/lib/db/migration.js), donde se construyen las filas de
`calendar_events`, añade `groups: ev.groups ?? { A: 0, B: 0, C: 0 }`. (Busca `calendar_events` en el
archivo; si la inserción reutiliza `setCalendarEventsForDate`, ya queda cubierto por 1.4.)

### 1.6 — UI: capturar conteos en el modal "Add to Calendar"
En [src/views/CalendarView.jsx](src/views/CalendarView.jsx), componente `AddMealModal`:
- Importa `GroupInput` y `defaultGroups`:
  ```js
  import GroupInput from '../components/GroupInput';
  import { defaultGroups } from '../data/mockData';
  ```
- Añade estado:
  ```js
  const [groups, setGroups] = useState(defaultGroups.map(g => ({ ...g, count: 0 })));
  const updateCount = (id, val) => setGroups(prev => prev.map(g => g.id === id ? { ...g, count: val } : g));
  ```
- Añade un bloque de inputs (reutiliza el patrón de RecipesView, "👥 Diners by Group") antes del campo
  Note, renderizando `groups.map(g => <GroupInput key={g.id} group={g} value={g.count} onChange={updateCount} />)`.
- En `handleAdd`, incluye `groups` en el objeto `onAdd(...)` como `{ A, B, C }`:
  ```js
  const groupCounts = Object.fromEntries(groups.map(g => [g.id, g.count]));
  // ... recipe:  onAdd({ type:'recipe', slotKey, recipe, note, groups: groupCounts });
  // ... menu:    onAdd({ type:'menu',   slotKey, menu, menuRecipes, note, groups: groupCounts });
  ```

### 1.7 — UI: mostrar conteos en el panel del día
En `DayPanel` (mismo archivo), donde se renderiza cada `meal`, muestra el total de personas si `groups`
tiene conteos (p. ej. una línea "👥 {A+B+C} personas"). Mantén el estilo compacto existente.

### Verificación Fase 1
1. Aplicar la migración `002_calendar_groups.sql` en Supabase (o validar en modo local).
2. `npm run dev`. Abre un día, "Add Meal or Menu", ingresa Niños=10, Jóvenes=5, Adultos=20, guarda.
3. El panel del día muestra el total de personas. Recarga la página (modo Supabase) y confirma que los
   conteos persisten. En modo local, confirma que sobreviven al refresco vía localStorage.
4. `npm run lint` limpio.

---

## FASE 2 — Generar orden de compra desde un rango de fechas (→ carrito)

MVP del objetivo central: tomar la comida planificada en un rango, agregar la demanda por ingrediente,
descontar inventario, filtrar por proveedor, fijar fecha de entrega y volcar todo al carrito.

### 2.1 — Motor de agregación
En [src/data/mockData.js](src/data/mockData.js) añade:
```js
/**
 * Agrega la demanda de ingredientes de todos los eventos del calendario dentro de
 * un rango [startDate, endDate] (strings "YYYY-MM-DD", inclusivos).
 *
 * Para cada evento usa sus `groups` (conteo por A/B/C). Expande menús a sus recetas.
 * Devuelve un array consolidado por ingrediente con la demanda "segura" acumulada
 * (Σ D_safe) y el ingrediente del catálogo, listo para construir CartItems.
 *
 * @returns {{ items: Array<{ ingredient, demandSafe }>, mealsCount: number, recipesCount: number }}
 */
export function aggregateCalendarDemand(calendarEvents, startDate, endDate, recipes, catalog) {
  const recipeIndex  = new Map(recipes.map(r => [r.id, r]));
  const catalogIndex = new Map(catalog.map(i => [i.id, i]));
  const demandByIng  = new Map(); // ingredientId -> demandSafe

  let mealsCount = 0;
  const recipeIdsUsed = new Set();

  for (const [dateKey, events] of Object.entries(calendarEvents)) {
    if (dateKey < startDate || dateKey > endDate) continue; // comparación lexicográfica válida para YYYY-MM-DD
    for (const ev of events) {
      const groups = [
        { id: 'A', count: ev.groups?.A ?? 0 },
        { id: 'B', count: ev.groups?.B ?? 0 },
        { id: 'C', count: ev.groups?.C ?? 0 },
      ];
      if (groups.every(g => g.count === 0)) continue; // sin personas → ignora
      mealsCount++;

      // Resolver lista de recetas del evento (receta única o todas las del menú)
      const eventRecipes = ev.type === 'menu'
        ? (ev.menu?.recipeIds ?? []).map(rid => recipeIndex.get(rid)).filter(Boolean)
        : [recipeIndex.get(ev.recipe?.id)].filter(Boolean);

      for (const recipe of eventRecipes) {
        recipeIdsUsed.add(recipe.id);
        const resolved = resolveIngredients(recipe, catalogIndex); // ya aplica yield/per-person
        for (const ing of resolved) {
          const r = calcRequisition(ing, groups); // D_safe ya con 1.1 * merma
          demandByIng.set(ing.id, (demandByIng.get(ing.id) ?? 0) + r.D_safe);
        }
      }
    }
  }

  const items = Array.from(demandByIng.entries())
    .map(([ingredientId, demandSafe]) => ({ ingredient: catalogIndex.get(ingredientId), demandSafe }))
    .filter(x => x.ingredient);

  return { items, mealsCount, recipesCount: recipeIdsUsed.size };
}
```
> Reutiliza `resolveIngredients` y `calcRequisition` existentes (no dupliques fórmulas). `calcRequisition`
> ya devuelve `D_safe` con el margen 1.1 y la merma.

### 2.2 — Acción de store para volcar al carrito
En [src/store/useStore.js](src/store/useStore.js) añade una acción que **reemplaza** el carrito con los
ítems agregados y guarda metadata (fecha de entrega, rango). El carrito y la metadata son efímeros.

1. En el estado inicial del store, junto a `cart: []`, añade:
   ```js
   cartMeta: { deliveryDate: null, startDate: null, endDate: null },
   ```
   (y replícalo en `resetStore`).
2. Importa el motor:
   ```js
   import { aggregateCalendarDemand, computeOrderPacks } from '../data/mockData';
   ```
3. Añade la acción:
   ```js
   // Genera el carrito desde un rango del calendario. supplierFilter: Set<supplierId> | null (null = todos)
   buildCartFromCalendar: ({ startDate, endDate, deliveryDate, supplierFilter = null }) => {
     const { calendarEvents, recipes, ingredients } = get();
     const { items } = aggregateCalendarDemand(calendarEvents, startDate, endDate, recipes, ingredients);
     const cart = items
       .filter(({ ingredient }) => !supplierFilter || supplierFilter.has(ingredient.supplier))
       .map(({ ingredient, demandSafe }) => ({
         ingredientId: ingredient.id,
         name:         ingredient.name,
         unit:         ingredient.unit,
         packSize:     ingredient.packSize,
         pricePerPack: ingredient.pricePerPack,
         supplier:     ingredient.supplier,
         currentStock: ingredient.currentStock ?? 0,
         minOrder:     ingredient.minOrder ?? 1,
         demandSafe,
         R:            computeOrderPacks(demandSafe, ingredient.packSize, ingredient.currentStock ?? 0, ingredient.minOrder ?? 1),
       }))
       .filter(it => it.R > 0); // solo lo que realmente hay que comprar
     set({ cart, cartMeta: { deliveryDate: deliveryDate ?? null, startDate, endDate } });
   },
   ```

### 2.3 — UI: modal "Generar Orden de Compra" en el calendario
En [src/views/CalendarView.jsx](src/views/CalendarView.jsx):
- Importa `useNavigate` de `react-router-dom` y la acción del store.
- Añade un botón en el header (junto a "Today"): **"🧾 Generar Orden de Compra"**.
- Al pulsarlo, abre un modal nuevo `GeneratePOModal` con:
  - **Rango de fechas**: dos `<input type="date">` (`startDate`, `endDate`). Default: semana actual
    (lunes a domingo de la fecha de hoy). Usa `INPUT_STYLE`.
  - **Proveedores**: lista de checkboxes desde `suppliers` (todos marcados por defecto). El resultado es
    un `Set` de `supplier.id`; si están todos, pasar `null`.
  - **Fecha de entrega** (`deliveryDate`): un `<input type="date">`.
  - **Resumen en vivo** (opcional pero recomendado): usa `aggregateCalendarDemand` para mostrar cuántas
    comidas/recetas/ingredientes entran antes de confirmar.
  - Botón **"Generar y ver carrito"**: llama `buildCartFromCalendar({...})` y luego
    `navigate('/cart')`.
- Maneja el caso "rango sin personas/ingredientes": muestra un mensaje y no navegues con carrito vacío
  (usa un toast: `useStore.getState().addToast(...)` o el patrón de toasts existente).

### 2.4 — Mostrar metadata en el carrito
En [src/views/CartView.jsx](src/views/CartView.jsx):
- Lee `cartMeta` del store.
- Si `cartMeta.startDate`, muestra bajo el título una línea: "Del {startDate} al {endDate} · Entrega:
  {deliveryDate || '—'}".

### Verificación Fase 2
1. Planifica en el calendario, dentro de la misma semana, 2-3 comidas con personas (p. ej. Lunes almuerzo
   Chicken Piccata 40 adultos; Martes cena Caesar Salad 30 adultos).
2. Pulsa "Generar Orden de Compra", confirma rango = esa semana, deja todos los proveedores, fija fecha de
   entrega, "Generar y ver carrito".
3. El carrito se llena con ingredientes consolidados (ingredientes compartidos entre recetas aparecen una
   sola vez con demanda sumada), packs ya descontando inventario, agrupados por proveedor, total coherente.
4. Repite filtrando un solo proveedor → solo aparecen sus ingredientes.
5. La línea de metadata (rango + entrega) se muestra en el carrito.
6. `npm run lint` limpio.

---

## FASE 3 — PDF con proveedor y fecha de entrega

Pulir el PDF para reflejar el nuevo flujo.

**Acción — en [src/utils/generatePurchaseOrderPDF.js](src/utils/generatePurchaseOrderPDF.js):**
- Extiende la firma a `generatePurchaseOrderPDF({ cart, suppliers, grandTotal, deliveryDate, dateRange })`.
- Si `deliveryDate` viene, imprímelo en el bloque de metadata del encabezado ("Delivery date / Fecha de
  entrega"). Si `dateRange` viene, imprime "Período: {start} – {end}".
- Mantén compatibilidad: si los nuevos campos son `undefined`, el PDF se genera como hoy.

**Acción — en [src/views/CartView.jsx](src/views/CartView.jsx):**
- En `handleGeneratePDF`, pasa `deliveryDate: cartMeta.deliveryDate` y
  `dateRange: { start: cartMeta.startDate, end: cartMeta.endDate }`.

### Verificación Fase 3
1. Genera un carrito desde el calendario con fecha de entrega, descarga el PDF y confirma que aparecen la
   fecha de entrega y el período, además de la agrupación por proveedor, subtotales y gran total.
2. Genera un PDF desde un carrito manual (sin metadata) y confirma que sigue funcionando sin errores.

---

## FASE 4 — (FUTURO, no implementar ahora) Dietas alternativas

Dejar constancia para el siguiente ciclo. **No** codificar en este trabajo:
- Renombrar/etiquetar grupos como categorías dietéticas (Normal/Celíaco/Vegetariano) en lugar de A/B/C.
- Por evento, permitir recetas/ingredientes sustitutos por grupo dietético (el catálogo ya tiene
  `substitutable`/`substitute`; el toggle "Substitutions" en RecipesView es el punto de partida).
- La estructura `groups: {A,B,C}` por evento (Fase 1) y el motor de agregación (Fase 2) ya soportan
  extender el número/identidad de grupos sin rediseño mayor.

---

## Checklist transversal (revisar al cerrar)
- [ ] Búsqueda global de `useCartManager` → 0 referencias tras borrarlo.
- [ ] Búsqueda global de `.ingredient.id` y `c.packs` en el código del carrito → 0 referencias.
- [ ] Import/Export (`src/lib/io/`): si el calendario es exportable, verificar que el esquema en
      `registry.js`/`validate.js` acepte el nuevo campo `groups` (o ignorarlo con default). No romper
      imports antiguos sin `groups`.
- [ ] `npm run lint` y `npm run build` limpios.
- [ ] Probar ambos modos: `USE_SUPABASE=true` (con `.env.local`) y modo local (sin env) — el carrito y la
      generación desde calendario funcionan en los dos.

## Notas de ejecución
- Hay cambios sin commitear en `src/lib/db/calendar.js` y `src/lib/db/suppliers.js` (git status). Revisa
  qué contienen antes de editar `calendar.js` en la Fase 1 para no pisarlos.
- Commits sugeridos (uno por fase): `fix(cart): unificar forma de CartItem y descuento de inventario`,
  `feat(calendar): personas por comida (grupos A/B/C)`, `feat(po): generar orden de compra desde rango del
  calendario`, `feat(pdf): fecha de entrega y período en la orden`.
