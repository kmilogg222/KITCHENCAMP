# Sesión: Corrección de Carrito + Órdenes de Compra desde Calendario

**Fecha:** 2026-06-08  
**Plan de referencia:** `plan_nuevo.md` (en la raíz del proyecto) — leerlo completo antes de continuar.  
**Rama:** `main`  
**Último commit:** `4a1d1c2` — feat(calendar): personas por comida — grupos A/B/C por evento

---

## Resumen ejecutivo

Se ejecutaron las **Fases 0 y 1** del plan. Quedan pendientes las **Fases 2 y 3**.

| Fase | Descripción | Estado |
|------|-------------|--------|
| 0 | Corrección crítica del carrito (NaN, errores, hook muerto) | ✅ Completado — commit `b143469` |
| 1 | Personas por comida en el calendario (grupos A/B/C) | ✅ Completado — commit `4a1d1c2` |
| 2 | Generar orden de compra desde rango de fechas → carrito | ✅ Completado — pendiente commit |
| 3 | PDF con fecha de entrega y período | ✅ Completado — pendiente commit |

---

## Lo que se hizo

### Fase 0 — Carrito corregido

**Problema:** El store usaba `c.ingredient.id` y `c.packs`, CartView esperaba `c.ingredientId` y `c.R`. Todo mostraba `$NaN` y la papelera lanzaba excepción.

**Archivos modificados:**

- **[src/data/mockData.js](../src/data/mockData.js)** — añadida función exportada `computeOrderPacks(demandSafe, packSize, currentStock, minOrder)`:
  ```js
  export function computeOrderPacks(demandSafe, packSize, currentStock = 0, minOrder = 1) {
    if (!packSize || packSize <= 0) return 0;
    const grossPacks = Math.ceil(demandSafe / packSize);
    const netPacks = Math.max(0, grossPacks - (currentStock ?? 0));
    if (netPacks <= 0) return 0;
    return Math.max(netPacks, minOrder ?? 1);
  }
  ```
  Está justo antes de `calcRequisition`. **Esta función es la clave del descuento de inventario** — úsala en todo lugar donde se construyan CartItems.

- **[src/store/useStore.js](../src/store/useStore.js)** — cart actions reescritas con forma canónica:
  - Import añadido: `import { ..., computeOrderPacks } from '../data/mockData';`
  - `addToCart(ingredient, result)` — 2 args, construye el CartItem canónico
  - `removeFromCart(ingredientId)` — recibe el id directamente (no el objeto)
  - `clearCart()` — sin cambios funcionales
  - `stockOnly` corregido: ya no usa `prev.cost` (campo inexistente), ahora compara `pricePerPack`, `packSize`, `minOrder`, `substitutable`, `substitute`

- **`src/hooks/useCartManager.js`** — eliminado (era un hook muerto, 0 referencias)

**Forma canónica del CartItem** (ya en vigor en todo el código):
```js
{
  ingredientId: string,
  name:         string,
  unit:         string,
  packSize:     number,
  pricePerPack: number,
  supplier:     string,   // = ingredient.supplier (coincide con suppliers[].id)
  currentStock: number,
  minOrder:     number,
  demandSafe:   number,   // Σ D_safe — se acumula si se re-agrega
  R:            number,   // computeOrderPacks(demandSafe, packSize, currentStock, minOrder)
}
```

### Fase 1 — Grupos A/B/C en el calendario

- **`supabase/migrations/002_calendar_groups.sql`** — creado. **El usuario debe aplicarlo manualmente en Supabase SQL Editor** (o ya lo hizo). Añade columna `groups jsonb default '{"A":0,"B":0,"C":0}'` a `calendar_events`.
- **[src/lib/db/transform.js](../src/lib/db/transform.js)** — `dbCalendarToStore` ya mapea `groups: row.groups ?? {A:0,B:0,C:0}` en cada `entry`.
- **[src/lib/db/calendar.js](../src/lib/db/calendar.js)** — `insertCalendarEvent` y `setCalendarEventsForDate` ya incluyen `groups` en las filas enviadas a Supabase.
- **[src/lib/db/migration.js](../src/lib/db/migration.js)** — la migración legacy incluye `groups` y también normaliza `slot ?? slotKey` en ese bloque.
- **[src/views/CalendarView.jsx](../src/views/CalendarView.jsx)** — `AddMealModal` ahora captura conteos A/B/C con `GroupInput`; `DayPanel` muestra "👥 N personas" si `groups.A + B + C > 0`.

**Forma del evento de calendario** (ya con `groups`):
```js
{ id, type, slotKey, recipe?, menu?, menuRecipes?, note, groups: { A: number, B: number, C: number } }
```

---

## Lo que falta implementar

### Fase 2 — Generar orden de compra desde rango de fechas

#### 2.1 Motor de agregación en [src/data/mockData.js](../src/data/mockData.js)

Añadir al final del archivo (después de `calcMenuRequisition`):

```js
/**
 * Agrega la demanda de todos los eventos del calendario en [startDate, endDate]
 * (strings "YYYY-MM-DD", inclusivos). Reutiliza resolveIngredients + calcRequisition.
 * @returns {{ items: Array<{ ingredient, demandSafe }>, mealsCount: number, recipesCount: number }}
 */
export function aggregateCalendarDemand(calendarEvents, startDate, endDate, recipes, catalog) {
  const recipeIndex  = new Map(recipes.map(r => [r.id, r]));
  const catalogIndex = new Map(catalog.map(i => [i.id, i]));
  const demandByIng  = new Map(); // ingredientId -> demandSafe acumulado

  let mealsCount = 0;
  const recipeIdsUsed = new Set();

  for (const [dateKey, events] of Object.entries(calendarEvents)) {
    if (dateKey < startDate || dateKey > endDate) continue;
    for (const ev of events) {
      const groups = [
        { id: 'A', count: ev.groups?.A ?? 0 },
        { id: 'B', count: ev.groups?.B ?? 0 },
        { id: 'C', count: ev.groups?.C ?? 0 },
      ];
      if (groups.every(g => g.count === 0)) continue;
      mealsCount++;

      const eventRecipes = ev.type === 'menu'
        ? (ev.menu?.recipeIds ?? []).map(rid => recipeIndex.get(rid)).filter(Boolean)
        : [recipeIndex.get(ev.recipe?.id)].filter(Boolean);

      for (const recipe of eventRecipes) {
        recipeIdsUsed.add(recipe.id);
        const resolved = resolveIngredients(recipe, catalogIndex);
        for (const ing of resolved) {
          const r = calcRequisition(ing, groups);
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

#### 2.2 Estado y acción en [src/store/useStore.js](../src/store/useStore.js)

1. En el estado inicial (junto a `cart: []`), añadir:
   ```js
   cartMeta: { deliveryDate: null, startDate: null, endDate: null },
   ```
   Y replicarlo en `resetStore`.

2. Añadir al import de mockData: `aggregateCalendarDemand` (además de `computeOrderPacks` que ya está).

3. Añadir la acción (junto a `clearCart`):
   ```js
   // supplierFilter: Set<supplierId> | null (null = todos los proveedores)
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
       .filter(it => it.R > 0);
     set({ cart, cartMeta: { deliveryDate: deliveryDate ?? null, startDate, endDate } });
   },
   ```

#### 2.3 Modal "Generar Orden de Compra" en [src/views/CalendarView.jsx](../src/views/CalendarView.jsx)

- Añadir imports al principio:
  ```js
  import { useNavigate } from 'react-router-dom';
  import { aggregateCalendarDemand } from '../data/mockData';
  ```
- En el componente `CalendarView`, obtener del store:
  ```js
  const suppliers = useStore(state => state.suppliers);
  const ingredients = useStore(state => state.ingredients);
  const buildCartFromCalendar = useStore(state => state.buildCartFromCalendar);
  const navigate = useNavigate();
  ```
- Añadir estado: `const [showPOModal, setShowPOModal] = useState(false);`
- En el header (junto al botón "Today"), añadir:
  ```jsx
  <button onClick={() => setShowPOModal(true)} className="btn-primary" style={{ fontSize: 13 }}>
      🧾 Generar Orden de Compra
  </button>
  ```
- Crear componente `GeneratePOModal` (puede ir antes de `CalendarView` en el mismo archivo). Recibe `{ calendarEvents, recipes, ingredients, suppliers, onGenerate, onClose }`. Internamente:
  - Estado: `startDate` (lunes de semana actual), `endDate` (domingo), `deliveryDate` (`''`), `selectedSuppliers` (Set con todos los IDs de proveedores)
  - Helpers para calcular lunes/domingo:
    ```js
    const today = new Date();
    const dow = today.getDay(); // 0=dom
    const monday = new Date(today); monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    const fmt = d => d.toISOString().slice(0, 10);
    // default: startDate = fmt(monday), endDate = fmt(sunday)
    ```
  - Resumen en vivo: calcula `aggregateCalendarDemand(calendarEvents, startDate, endDate, recipes, ingredients)` con `useMemo` y muestra `mealsCount`, `recipesCount`, `items.length`.
  - Lista de checkboxes para proveedores.
  - Botón "Generar y ver carrito": llama `onGenerate({ startDate, endDate, deliveryDate, supplierFilter })` donde `supplierFilter = selectedSuppliers.size === suppliers.length ? null : selectedSuppliers`.
  - Si `items.length === 0` tras el cálculo: muestra mensaje y deshabilita el botón.
- Render del modal (al final de `CalendarView`):
  ```jsx
  {showPOModal && (
      <GeneratePOModal
          calendarEvents={meals}
          recipes={recipes}
          ingredients={ingredients}
          suppliers={suppliers}
          onGenerate={(params) => {
              buildCartFromCalendar(params);
              setShowPOModal(false);
              navigate('/cart');
          }}
          onClose={() => setShowPOModal(false)}
      />
  )}
  ```

#### 2.4 Metadata en [src/views/CartView.jsx](../src/views/CartView.jsx)

- Añadir al inicio del componente:
  ```js
  const cartMeta = useStore(state => state.cartMeta);
  ```
- Bajo el título del carrito, si `cartMeta?.startDate`, mostrar:
  ```jsx
  <div style={{ fontSize: 12, color: '#9b6dca', marginTop: 4 }}>
      Del {cartMeta.startDate} al {cartMeta.endDate} · Entrega: {cartMeta.deliveryDate || '—'}
  </div>
  ```

---

### Fase 3 — PDF con fecha de entrega y período

#### 3.1 en [src/utils/generatePurchaseOrderPDF.js](../src/utils/generatePurchaseOrderPDF.js)

- Extender firma: `generatePurchaseOrderPDF({ cart, suppliers, grandTotal, deliveryDate, dateRange })`
- En el bloque de metadata del encabezado (donde ya imprime "Prepared By", "Payment Terms"), añadir condicionalmente:
  - Si `deliveryDate`: línea "Delivery Date / Fecha de entrega: {deliveryDate}"
  - Si `dateRange?.start`: línea "Período: {dateRange.start} – {dateRange.end}"
- Si los nuevos campos son `undefined`, el PDF se genera idéntico al actual (compatibilidad hacia atrás garantizada).

#### 3.2 en [src/views/CartView.jsx](../src/views/CartView.jsx)

- Localizar la llamada a `generatePurchaseOrderPDF` en `handleGeneratePDF` y extenderla:
  ```js
  generatePurchaseOrderPDF({
    cart,
    suppliers,
    grandTotal,
    deliveryDate: cartMeta?.deliveryDate,
    dateRange: cartMeta?.startDate
      ? { start: cartMeta.startDate, end: cartMeta.endDate }
      : undefined,
  });
  ```

---

## Estado del lint al cierre de esta sesión

`npm run lint` produce **2 errores** (commit `ca3c926`). Los 9 anteriores fueron corregidos.
Los 2 restantes son **no triviales** y se dejan documentados para una sesión futura.

---

### Error A — `src/hooks/AuthContext.jsx:19` · `react-refresh/only-export-components`

```
Fast refresh only works when a file only exports components.
Use a new file to share constants or functions between components.
```

**Diagnóstico:** `AuthContext.jsx` exporta tanto el componente `AuthContext`/`AuthProvider` como
constantes o funciones no-componente (probablemente el contexto en sí o un helper). Vite Fast Refresh
solo acepta archivos que exportan exclusivamente componentes React; cualquier otro export rompe el HMR.

**Acción requerida:**
1. Leer `src/hooks/AuthContext.jsx` completo para identificar qué exports no son componentes.
2. Mover esos exports a un archivo nuevo, p. ej. `src/hooks/authContext.js` (sin mayúscula, no componente).
3. Actualizar todos los imports que consuman esos exports en los archivos que usen `AuthContext`.
4. Verificar que Fast Refresh funcione en dev (`npm run dev`) y que `npm run lint` quede limpio.

**Precaución:** Este archivo es central para el flujo de autenticación. Verificar en modo Supabase
(`USE_SUPABASE=true`) y en modo local que el login/logout sigue funcionando tras el refactor.

---

### Error B — `src/lib/db/migration.js:16` · `no-unused-vars`

```
'storeRecipeIngredientsToDb' is defined but never used.
Allowed unused vars must match /^[A-Z_]/u
```

**Diagnóstico:** La función `storeRecipeIngredientsToDb` está importada o definida en `migration.js`
pero no tiene ninguna llamada en el archivo ni en el resto del proyecto.

**Acción requerida:**
1. Buscar `storeRecipeIngredientsToDb` globalmente en el proyecto:
   - Si tiene **0 referencias** fuera de su definición → borrarla (o borrar el import si viene de otra
     parte). Confirmar que no se usa en ningún flujo de migración legacy.
   - Si tiene referencias en otros archivos → el import está mal (quizás fue renombrada). Corregirlo.
2. Verificar que `npm run build` siga limpio tras el cambio.

**Precaución:** `migration.js` gestiona la migración de datos localStorage → Supabase. No borrar
funciones sin confirmar que no participan en ningún flujo activo (especialmente el de primer login
con datos locales existentes). Buscar también en `src/lib/db/index.js` y en `AuthContext.jsx`.

---

## Checklist transversal al terminar

- [x] `npm run lint` — 9 de 11 errores pre-existentes corregidos. Quedan 2 (documentados arriba).
- [x] `npm run build` — sin errores.
- [x] Búsqueda global de `.ingredient.id` y `c.packs` en código de carrito → 0 resultados.
- [x] Búsqueda global de `useCartManager` → 0 resultados.
- [ ] Probar modo local (sin `.env.local`) y modo Supabase — carrito y generación desde calendario.
- [ ] `src/lib/io/registry.js` y `validate.js` — el campo `groups` en calendar exports es compatible.

---

## Commits de esta sesión

```
0c48433  feat(po): generar orden de compra desde rango del calendario + PDF
ca3c926  fix(lint): corregir 9 errores de eslint — unused vars, hooks en loop, args ignorados
```

---

## Contexto técnico clave

- **Stack:** React 19 + Vite + Zustand + Supabase. **Sin TypeScript.** JS puro.
- **Feature flag:** `USE_SUPABASE` en `src/lib/db/client.js`. Cuando `false`, usa localStorage + mockData.
- **Estilos:** inline styles. Reutiliza `INPUT_STYLE` de `src/constants/theme.js`.
- **Clases CSS:** `btn-primary`, `btn-ghost`, `btn-teal`, `glass-card`, `fade-in-up` (globales en index.css).
- **Toasts:** `useStore.getState().addToast({ type: 'error'|'success', message: '...' })`.
- **No introducir:** TypeScript, nuevas dependencias, TypeScript, clases CSS nuevas sin justificación.
- **Idioma:** comentarios en español, código (variables, funciones) en inglés. Mantener este estilo.
