# Sesión: Corrección de Bugs Post-Supabase (Fase 3)

**Fecha:** 2026-04-18  
**Tipo:** Bug fix  
**Estado:** ✅ Completado

---

## Contexto

Tras completar la Fase 3 (Supabase + Auth + optimistic updates), se detectaron tres categorías de bugs en producción relacionadas con la integración DB↔Store.

---

## Bugs Identificados y Corregidos

### Bug 1 — CRÍTICO: `SUPPLIER_IDS` mapeaba `.id` (UUID) en vez de `.name`

**Archivos:** `src/views/InventoryView.jsx`, `src/views/CreateRecipeView.jsx`

**Causa raíz:**  
Ambas vistas computaban `SUPPLIER_IDS = suppliers.map(s => s.id)` para alimentar los dropdowns de proveedor.  
Sin embargo, `ing.supplier` en el store (campo que viene de `dbIngredientToStore`) es el **nombre** del proveedor, no su UUID.  
Esta discrepancia entre nombre y UUID causaba 4 fallos en cascada:

| Síntoma | Causa |
|---------|-------|
| Dropdown de filtro mostraba UUIDs | `SUPPLIER_IDS` eran UUIDs |
| Filtro de proveedor nunca funcionaba | `ing.supplier` (name) nunca igualaba el UUID seleccionado |
| Modal mostraba UUIDs como opciones | Mismo `SUPPLIER_IDS` pasado como `supplierIds` prop |
| Color del badge siempre era el default `#6b3fa0` | `supColor(ing.supplier)` buscaba `s.id === supId` pero recibía un nombre |
| Al guardar edición, `supplier_id` podía quedar null | `supplierId` del ingrediente previo tomaba prioridad aunque el supplier hubiera cambiado |

**Fix aplicado:**
- `InventoryView.jsx:221` — `suppliers.map(s => s.id)` → `suppliers.map(s => s.name)`, renombrado a `SUPPLIER_NAMES`
- `InventoryView.jsx:247` — `supColor`: búsqueda por `s.name` en lugar de `s.id`
- `InventoryView.jsx:432` — payload de `onSave` incluye `supplierId: null` para forzar re-resolución por nombre en `storeIngredientToDb`
- `CreateRecipeView.jsx:380` — mismo fix: `suppliers.map(s => s.name)`

**Por qué `supplierId: null`:**  
`storeIngredientToDb` usa `ingredient.supplierId ?? supplierMap.get(ingredient.supplier)`. Si `supplierId` viene del objeto previo (UUID antiguo), el cambio de proveedor en el modal no se reflejaría en la DB. Forzar `null` hace que siempre se resuelva el UUID desde el nombre seleccionado.

---

### Bug 2 — CRÍTICO: Eventos de calendario invisibles y crash al hidratar desde DB

**Archivo:** `src/lib/db/transform.js` — función `dbCalendarToStore`

**Causa raíz:**  
`dbCalendarToStore` producía objetos con estructura incompatible con lo que `CalendarView` y `DayPanel` esperan:

| Campo producido por transform | Campo esperado por CalendarView | Efecto |
|------------------------------|--------------------------------|--------|
| `slot: row.slot` | `slotKey` | Todos los meals pasaban a "ningún slot" — DayPanel filtraba por `m.slotKey` y nunca encontraba nada |
| `itemId` (solo UUID) | `recipe` (objeto completo con `.image`, `.name`) | `meal.recipe.image` → `TypeError: Cannot read properties of undefined` |
| `itemId` (solo UUID) | `menu` (objeto completo) | `meal.menu.image` → crash igual |
| ausente | `menuRecipes` (array de recetas) | Menu expandido lanzaba error al iterar |

**Flujo del crash:**
1. Login → `hydrateStore` → `fetchAllUserData` → `dbCalendarToStore`
2. Eventos en store con `{ slot, itemId }` — sin `slotKey`, sin objetos recipe/menu
3. Usuario abre día con eventos → `DayPanel` renderiza `meal.recipe.image` → **TypeError**

**Fix aplicado en `dbCalendarToStore`:**
1. `slot` → `slotKey` (renombrado para coincidir con lo que lee CalendarView)
2. Firma extendida: `dbCalendarToStore(calendarRows, storeRecipes = [], storeMenus = [])`
3. Se construyen `recipeMap` y `menuMap` para lookup O(1) por ID
4. Para `type === 'recipe'`: se adjunta `entry.recipe = recipeMap.get(row.recipe_id)`
5. Para `type === 'menu'`: se adjunta `entry.menu` + `entry.menuRecipes` reconstruido desde `menu.recipeIds`

**Fix aplicado en `transformDbToStoreShape`:**
```js
// Antes:
const storeCalendarEvents = dbCalendarToStore(calendarEvents);
// Después:
const storeCalendarEvents = dbCalendarToStore(calendarEvents, storeRecipes, storeMenus);
```
`storeRecipes` y `storeMenus` ya están computados en ese punto — no requiere fetch extra.

---

## Archivos modificados

| Archivo | Tipo de cambio |
|---------|---------------|
| `src/lib/db/transform.js` | `dbCalendarToStore`: nuevo campo `slotKey`, parámetros `storeRecipes`/`storeMenus`, reconstrucción de objetos completos. `transformDbToStoreShape`: pasa los nuevos parámetros. |
| `src/views/InventoryView.jsx` | `SUPPLIER_IDS` → `SUPPLIER_NAMES` (usa `.name`). `supColor` busca por nombre. Modal pasa `supplierId: null`. |
| `src/views/CreateRecipeView.jsx` | `SUPPLIER_IDS = suppliers.map(s => s.name)` |

---

## Verificación recomendada

1. **Calendar**: Login → `/calendar` → abrir día con eventos → DayPanel debe mostrar meals por slot correctamente, sin crash
2. **Inventory filter**: `/inventory` → dropdown "Supplier" debe mostrar nombres, filtro debe funcionar
3. **Inventory modal — crear**: Abrir modal "New Ingredient", proveedor debe mostrar nombres en dropdown
4. **Inventory modal — editar**: Editar ingrediente existente → proveedor debe pre-seleccionarse correctamente → cambiar → guardar → verificar `supplier_id` en Supabase Dashboard
5. **CreateRecipe — nuevo ingrediente inline**: Modo "Create new" → dropdown de proveedor debe mostrar nombres

---

## Decisiones de diseño confirmadas

- **CalendarView sigue usando objetos denormalizados** (`recipe`/`menu` completos en cada entry). No se refactorizó a IDs + lookup en render — cambio demasiado amplio para un bug fix. La transformación se hace en `dbCalendarToStore` al hidratar.
- **`supplierId: null` en el payload** es la solución mínima para garantizar que el proveedor siempre se resuelva por nombre. Alternativa descartada: pasar `suppliers` completos al modal (requería más cambios de props).
