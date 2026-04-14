# Diseño: Modelo dual de entrada de ingredientes

**Fecha:** 2026-04-13
**Participantes:** Usuario (Kamilo G) + Agente arquitecto
**Estado:** Diseño cerrado — listo para implementar
**Sesión previa:** `2026-04-13_calc-model-analysis.md` (leer primero para contexto)
**Archivos afectados:** `src/views/CreateRecipeView.jsx`, `src/data/mockData.js`, `src/store/useStore.js`

---

## El insight que disparó este diseño

El usuario identificó que el problema no es elegir entre modelo "per-person" o "yield-first" —
**ambos son válidos y coexisten dentro de la misma cocina, incluso dentro de la misma receta.**

Ejemplo concreto que lo ilustra:
- **Chicken Nuggets** → el chef sabe exactamente cuántos nuggets come cada persona (el ingrediente es discreto y contable). El modelo per-person ES natural aquí.
- **Ensalada César** → el chef sabe cuánto necesita para 10 personas en total, no "cuánta lechuga come un niño". El modelo yield-first ES natural aquí.
- **Chicken Piccata** → el pollo podría ser per-person (una pechuga por adulto), pero la salsa de limón/capers es un batch ("hago la salsa para 10 con 200ml lemon juice"). **Ambos modos en la misma receta.**

---

## Los dos tipos de recetas / ingredientes

### Tipo 1: Ítem discreto / contable
- El chef conoce la cantidad por persona directamente
- Ejemplos: nuggets, piezas de pollo, porciones individuales, huevos
- Pensamiento natural: *"Un adulto come 8 nuggets, un niño come 5"*
- El modelo actual (portionByGroup) funciona perfectamente aquí

### Tipo 2: Receta de volumen / rendimiento (batch)
- El chef conoce la cantidad total para N porciones
- Ejemplos: aderezos, salsas, ensaladas, granos, sopas
- Pensamiento natural: *"Para 10 personas uso 1kg lechuga, 400ml aderezo"*
- El modelo actual obliga a dividir manualmente (anti-natural)

---

## La solución: modo de entrada por ingrediente (dual-mode)

El toggle se aplica **a nivel de cada ingrediente individual**, no a nivel de receta entera.
Ya existe este patrón en la UI actual: cada slot tiene `"Use existing" / "Create new"`.
Se extiende esa lógica con un segundo eje de decisión.

```
Slot de ingrediente → el usuario elige:

[Per person]  o  [For N portions]
    ↓                    ↓
Campos A/B/C         Un solo campo
(modelo actual)      + usa baseServings
                     de la receta
```

---

## Data model propuesto

### Cambios a nivel de receta (nuevos campos)

```js
{
  id, name, category, image, description, rating,  // sin cambios

  // NUEVOS — solo usados por ingredientes en modo 'yield'
  baseServings: 10,
  portionFactors: {
    A: 0.6,   // Kids comen 60% de una porción adulto estándar
    B: 1.0,   // Adults — referencia (siempre 1.0)
    C: 0.75,  // Seniors comen 75% de una porción adulto
  },

  ingredients: [ /* ver abajo */ ]
}
```

`portionFactors` tiene defaults razonables (0.6 / 1.0 / 0.75) y el chef puede ajustarlos
si su platillo requiere proporciones distintas entre demografías.

### Cambios a nivel de ingrediente dentro de receta

```js
// Modo A — per-person (modelo actual, sin cambios)
{
  ingredientId: 'ing-001',
  inputMode: 'per-person',                      // nuevo campo discriminador
  portionByGroup: { A: 5, B: 8, C: 6 }         // units — igual que hoy
}

// Modo B — yield/batch (nuevo)
{
  ingredientId: 'ing-008',
  inputMode: 'yield',                           // nuevo campo discriminador
  quantityForBase: 1000                         // 1000g para `recipe.baseServings` porciones
  // NO tiene portionByGroup — se deriva en cálculo
}
```

### Backward compatibility

Las recetas existentes en localStorage no tienen `inputMode`.
En `resolveIngredients()`, si `inputMode` es `undefined` → tratar como `'per-person'`.
Esto garantiza que los datos actuales funcionen sin migración.

---

## Resolución matemática unificada

Ambos modos convergen en el mismo `portionByGroup` antes de entrar a `calcRequisition()`.

```js
// src/data/mockData.js — nueva función helper
function resolvePortionByGroup(ingredientRef, recipe) {
  if (!ingredientRef.inputMode || ingredientRef.inputMode === 'per-person') {
    // Modo actual — usar directo
    return ingredientRef.portionByGroup;
  }

  // Modo yield — derivar desde quantityForBase
  const { baseServings, portionFactors } = recipe;
  const perStandardPortion = ingredientRef.quantityForBase / baseServings;

  return {
    A: perStandardPortion * (portionFactors?.A ?? 0.6),
    B: perStandardPortion * (portionFactors?.B ?? 1.0),
    C: perStandardPortion * (portionFactors?.C ?? 0.75),
  };
}
```

Luego `resolveIngredients()` llama a esta función por cada ingrediente:
```js
// Dentro de resolveIngredients()
return { ...catalogEntry, portionByGroup: resolvePortionByGroup(ref, recipe) };
```

`calcRequisition()` **no cambia en absoluto** — sigue operando sobre `portionByGroup`.
`calcMenuRequisition()` **no cambia** — ya consolida `portionByGroup`.

---

## Ejemplo concreto verificado

**Receta:** Ensalada César para `baseServings: 10`, `portionFactors: { A: 0.6, B: 1.0, C: 0.75 }`

**Ingrediente:** Romaine Lettuce, `quantityForBase: 1000g`, `inputMode: 'yield'`

**Evento:** 15 niños + 25 adultos + 10 seniors

```
// resolvePortionByGroup
perStandardPortion = 1000 / 10 = 100g
portionByGroup = { A: 60g, B: 100g, C: 75g }

// calcRequisition
D = (60×15) + (100×25) + (75×10)
  = 900 + 2500 + 750
  = 4150g

D_safe = 4150 × 1.10 = 4565g

packSize = 1000g (Romaine comes in 1kg bags)
R = ⌈4565 / 1000⌉ = 5 packs
```

**Ingrediente en la misma receta:** Croutons, `portionByGroup: { A: 20, B: 35, C: 25 }`, `inputMode: 'per-person'`

```
D = (20×15) + (35×25) + (25×10)
  = 300 + 875 + 250
  = 1425g
D_safe = 1567.5g → R = ⌈1567.5 / 500⌉ = 4 packs
```

Ambos ingredientes de la misma receta, calculados correctamente con distintos modos.

---

## Cambios de UI necesarios en CreateRecipeView

Cada `IngredientSlot` agrega un segundo toggle (además del existente "Use existing / Create new"):

```
[Use existing catalog]  [Create new]     ← toggle existente (línea 63-82 del archivo actual)

[Per person]  [For N portions]           ← NUEVO toggle de modo de cálculo
```

### Si modo = "Per person" (comportamiento actual)
```
👥 Portion per person (g)
Group A — Kids:    [___]
Group B — Adults:  [___]
Group C — Seniors: [___]
```

### Si modo = "For N portions" (nuevo)
```
📦 Total quantity for standard batch
Quantity: [___] g     ← un solo campo
Uses: recipe's base servings (10) and portion factors below
```

### Nuevos campos a nivel de receta (visibles solo si hay al menos un ingrediente en modo yield)

```
🍽️ Recipe Serves (base portions)
Standard servings: [10]

👥 Portion factors (how much of a standard adult portion each group eats)
Kids (A):    [0.6]   ← editable, con hint "60% of adult"
Adults (B):  [1.0]   ← fijo, referencia
Seniors (C): [0.75]  ← editable, con hint "75% of adult"
```

---

## Lo que NO cambia

| Componente | Estado |
|-----------|--------|
| `calcRequisition()` | Sin cambios |
| `calcMenuRequisition()` | Sin cambios |
| `resolveIngredients()` | Pequeño cambio: llama a `resolvePortionByGroup` |
| `CartView` / PDF | Sin cambios |
| `RecipesView` resultado table | Sin cambios |
| `MenusView` consolidación | Sin cambios |
| Datos existentes en localStorage | Compatibles (fallback a 'per-person') |

---

## Alcance de implementación estimado

| Archivo | Tipo de cambio | Complejidad |
|---------|---------------|-------------|
| `src/data/mockData.js` | Agregar `resolvePortionByGroup()`, modificar `resolveIngredients()` | Baja |
| `src/views/CreateRecipeView.jsx` | Nuevo toggle por slot + campos `baseServings` y `portionFactors` en form | Media |
| `src/store/useStore.js` | Actualizar seed data de recetas existentes (opcional, son backward-compatible) | Baja |
| `src/views/RecipesView.jsx` | Sin cambios funcionales | Ninguna |

---

## Decisiones de diseño cerradas

- [x] El modo es por ingrediente, no por receta — permite recetas mixtas
- [x] `portionFactors` viven en la receta con defaults (0.6 / 1.0 / 0.75)
- [x] `inputMode: 'per-person'` es el default implícito para backward compat
- [x] El motor de cálculo no cambia — solo el paso de resolución previo
- [x] `baseServings` y `portionFactors` solo aparecen en UI si hay al menos un ingrediente en modo yield

## Decisiones pendientes antes de implementar

- [ ] ¿Los `portionFactors` defaults (0.6/1.0/0.75) son aceptables o el usuario quiere otros?
- [ ] ¿El label del modo es "For N portions" o "Recipe batch" o algo más claro?
- [ ] ¿`baseServings` aparece solo cuando hay un ingrediente yield, o siempre visible?