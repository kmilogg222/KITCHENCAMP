# Análisis: Limitaciones del modelo de cálculo actual

**Fecha:** 2026-04-13
**Participantes:** Usuario (Kamilo G) + Agente arquitecto
**Estado:** Análisis completo — pendiente de decisión de implementación
**Archivos relevantes:** `src/data/mockData.js`, `src/views/CreateRecipeView.jsx`, `src/views/RecipesView.jsx`

---

## Contexto de la conversación

El usuario identificó una limitación conceptual en el modelo de datos de las recetas:
al crear una receta, el sistema pide cuánto de cada ingrediente consume **cada persona por grupo demográfico**, pero en la práctica un chef no piensa así — piensa en cantidades totales para un número de porciones.

---

## El modelo actual (portionByGroup)

Cada ingrediente en una receta almacena:
```js
{ ingredientId: 'ing-001', portionByGroup: { A: 120, B: 200, C: 150 } }
// A = Kids: 120g por persona
// B = Adults: 200g por persona
// C = Seniors: 150g por persona
```

**Fórmula:**
```
D = (portionA × countA) + (portionB × countB) + (portionC × countC)
D_safe = D × 1.10
R = ⌈D_safe / packSize⌉
```

Datos reales en `mockData.js`:
```js
// Chicken Piccata
{ ingredientId: 'ing-001', portionByGroup: { A: 120, B: 200, C: 150 } }, // Chicken
{ ingredientId: 'ing-002', portionByGroup: { A: 80,  B: 130, C: 100 } }, // Pasta
{ ingredientId: 'ing-003', portionByGroup: { A: 10,  B: 20,  C: 15  } }, // Capers
{ ingredientId: 'ing-004', portionByGroup: { A: 15,  B: 30,  C: 20  } }, // Lemon Juice
```

---

## Limitaciones identificadas

### 1. Datos de entrada no naturales (problema principal)
El sistema obliga al chef a pre-calcular "cuánto come cada persona de cada ingrediente".
Un chef no tiene ese dato — tiene una ficha de receta que dice: *"para 10 personas uso 2kg de pollo"*.
El sistema está delegando al usuario una matemática que debería resolver él mismo.

### 2. Explosión de campos de entrada
- 6 ingredientes × 3 grupos = **18 números a ingresar** por receta
- Una receta real puede tener 12+ ingredientes → 36+ números
- Muchos son interdependientes (si cambias Adults, deberías ajustar Kids/Seniors proporcionalmente)

### 3. Sin consistencia forzada entre grupos
El sistema no verifica que `portionA / portionB` sea consistente.
Si el chef entra `A: 100, B: 200` para pollo y `A: 150, B: 200` para pasta,
la proporción kids/adults es diferente por ingrediente — generalmente un error de entrada, no intencional.

### 4. Sin concepto de rendimiento de receta
No existe `baseServings`. No se puede saber "esta receta es para N porciones".
Cambiar la escala de la receta requiere recalcular todos los campos manualmente.

### 5. Grupos demográficos fijos (A/B/C)
Los labels Kids/Adults/Seniors no siempre aplican:
- "50 invitados sin distinción" → necesita un solo grupo
- "Vegetarianos + omnívoros" → agrupación por dieta, no edad
- "VIP (porción premium) + regular" → dos grupos adultos

### 6. Sin yield percentage (pérdida en preparación)
El modelo asume 100% de aprovechamiento.
Real: 1kg pechuga cruda → ~780g usable tras limpieza/cocción.
Cocinas profesionales aplican factores de rendimiento por ingrediente.
*(Funcionalidad avanzada — menor prioridad)*

---

## Modelo alternativo propuesto: Yield-First

### Concepto
El chef ingresa la receta como aparece en su **ficha de receta** (recipe card):
- Cantidad total de cada ingrediente para un número base de porciones
- Los factores de porción por grupo se definen una sola vez, no por ingrediente

### Estructura de datos propuesta

```js
// Receta
{
  id: 'recipe-001',
  name: 'Chicken Piccata',
  baseServings: 10,           // ← NUEVO: "esta receta es para 10 personas"
  portionFactors: {           // ← NUEVO: cuánto del plato come cada grupo
    A: 0.6,                   //   Kids = 60% de una porción estándar
    B: 1.0,                   //   Adults = porción de referencia
    C: 0.75,                  //   Seniors = 75% de una porción estándar
  },
  ingredients: [
    { ingredientId: 'ing-001', quantityForBase: 1800 }, // 1800g para las 10 porciones
    { ingredientId: 'ing-002', quantityForBase: 600  }, // 600g pasta para 10 porciones
    { ingredientId: 'ing-003', quantityForBase: 80   }, // 80g capers para 10 porciones
    { ingredientId: 'ing-004', quantityForBase: 200  }, // 200ml lemon juice para 10
  ]
}
```

### Nueva fórmula de cálculo

```
equivalentServings = Σ(group.count × recipe.portionFactors[group.id])
                   = (countKids × 0.6) + (countAdults × 1.0) + (countSeniors × 0.75)

scaleFactor = equivalentServings / recipe.baseServings

Por cada ingrediente:
  D       = ingredient.quantityForBase × scaleFactor
  D_safe  = D × 1.10
  R       = ⌈D_safe / packSize⌉
```

### Ejemplo concreto

Evento: 15 kids + 25 adults + 10 seniors, Chicken Piccata (base: 10 porciones, 1800g pollo)
```
equivalentServings = (15 × 0.6) + (25 × 1.0) + (10 × 0.75)
                   = 9 + 25 + 7.5 = 41.5 porciones equivalentes

scaleFactor = 41.5 / 10 = 4.15

chicken_needed = 1800g × 4.15 = 7,470g
D_safe = 7,470 × 1.10 = 8,217g
R = ⌈8,217 / 2000⌉ = 5 packs
```

### Comparación

| Aspecto | Modelo actual | Modelo yield-first |
|---------|--------------|-------------------|
| Datos a ingresar (6 ing.) | 18 campos | 6 campos + 3 factores (1 vez) |
| Pensamiento requerido | "¿cuánto come cada persona de cada ingrediente?" | "¿cuánto usa mi receta para N porciones?" |
| Cambiar escala receta | Recalcular 18+ campos | Cambiar solo `baseServings` |
| Consistencia grupos | No garantizada | Garantizada (un solo factor por grupo) |
| Natural para chef | No | Sí |

---

## Archivos que cambiarían en implementación

| Archivo | Tipo de cambio |
|---------|---------------|
| `src/data/mockData.js` | Data model de recipes + funciones `calcRequisition` / `calcMenuRequisition` |
| `src/views/CreateRecipeView.jsx` | UI: reemplazar 3 campos por grupo → 1 campo total + inputs de `portionFactors` + `baseServings` |
| `src/views/RecipesView.jsx` | Lógica de cálculo + display de resultados |
| `src/views/MenusView.jsx` | `calcMenuRequisition` ya consolida — adaptar al nuevo modelo |
| `src/store/useStore.js` | Inicialización de seed data |

---

## Preguntas abiertas (sin resolver en esta sesión)

1. **¿Los `portionFactors` son por receta o globales?**
   - Global: más simple, menos flexible
   - Por receta: permite que una ensalada tenga distinto factor que un plato principal
   - Recomendación: definir defaults globales + permitir override por receta

2. **¿Migramos completamente o ofrecemos ambos modos?**
   - Migración completa: más limpio, pero rompe datos existentes
   - Ambos modos: más complejo de mantener, confuso para el usuario

3. **¿Qué pasa con los datos existentes en localStorage?**
   - Si se cambia el data model, los datos de usuarios actuales son incompatibles
   - Necesita estrategia de migración (resetStore o transformación en onRehydrate)

4. **¿Incluimos yield percentage en esta iteración?**
   - Añade precisión pero complejidad significativa
   - Recomendación: dejarlo para una fase posterior

---

## Decisión pendiente del usuario

Antes de implementar, confirmar:
- [ ] ¿Adoptamos el modelo yield-first completamente?
- [ ] ¿Los `portionFactors` van a nivel global de grupo o por receta?
- [ ] ¿Qué hacemos con los datos existentes en localStorage?