# Implementation Plan: Sistema Import / Export — KitchenCalc

**Fecha:** 2026-04-20  
**Tipo:** Plan de implementación definitivo — listo para ejecución  
**Estado:** ✅ Aprobado — listo para implementar  
**Basado en:** `agent-sessions/2026-04-18_import-export-system-plan.md` (diseño original, revisado y corregido)  
**Decisiones tomadas:**
- ✅ Batch insert optimizado (funciones `bulk` en `src/lib/db/`)
- ✅ CSV pospuesto a una PR separada — este plan es **JSON-only**
- ✅ 7 bugs del plan original corregidos (ver §1)

---

## 0. Contexto del Proyecto (LEER PRIMERO)

### Stack tecnológico
- **Framework:** React 19 + Vite 7 + React Router 7
- **State:** Zustand 5 (con `persist` condicional)
- **Backend:** Supabase (PostgreSQL + Auth + RLS), controlado por feature flag `USE_SUPABASE`
- **Styling:** Tailwind CSS 4 + CSS custom properties + inline styles (patrón mixto)
- **Icons:** lucide-react
- **No TypeScript** — proyecto usa JavaScript puro

### Archivos clave que DEBES leer antes de codificar
| Archivo | Por qué |
|---------|---------|
| `src/store/useStore.js` | Contiene todas las acciones CRUD (async, optimistic updates). Las funciones que el módulo IO llamará. |
| `src/lib/db/transform.js` | La forma exacta de los datos en el store (camelCase, objetos anidados). El módulo IO debe producir datos en esta forma. |
| `src/constants/theme.js` | `INGREDIENT_UNITS` para validación. `COLORS` para UI. |
| `src/components/Sidebar.jsx` | Donde agregar el nav item. Patrón de `navItems` array. |
| `src/App.jsx` | Donde agregar la ruta lazy-loaded. Patrón existente. |
| `src/components/Toast.jsx` | Patrón de toasts. El store ya tiene `addToast()`. |
| `src/components/AuthGate.jsx` | Referencia de estilo glass-card modal. |
| `src/index.css` | Clases CSS disponibles: `.glass-card`, `.btn-primary`, `.btn-teal`, `.btn-ghost`, `.fade-in-up`, `.hover-lift`, etc. |
| `DEVELOPMENT_TRACKER.md` | Estado del proyecto. Actualizar al finalizar. |

### Forma de los datos en el store (CRÍTICO)

```javascript
// useStore.getState() devuelve:
{
  suppliers: [{ id, name, contact, email, phone, color, notes }],
  ingredients: [{ id, name, unit, packSize, currentStock, minOrder, supplier/*name*/, supplierId/*uuid|null*/, pricePerPack, substitutable, substitute }],
  recipes: [{ id, name, category, rating, image, description, isNew, ingredients: [{ ingredientId, inputMode, portionByGroup?, quantityForBase?, wastePct? }], baseServings?, portionFactors? }],
  menus: [{ id, name, description, image, recipeIds: [...], createdAt }],
  calendarEvents: { "2026-04-20": [{ id, type, slotKey, note, recipe?, menu?, menuRecipes? }] },  // ← OBJECT, not array!
  cart: [...],  // efímero, no se exporta
}
```

> **IMPORTANTE:** `calendarEvents` es un **Object** (diccionario por fecha), NO un Array.  
> **IMPORTANTE:** `ingredients[].supplier` es el **nombre** del supplier, no el ID.  
> **IMPORTANTE:** `wastePct` pertenece al recipe-ingredient ref, NO al catálogo de ingredientes.

---

## 1. Bugs Corregidos del Plan Original

Estos bugs estaban en `agent-sessions/2026-04-18_import-export-system-plan.md`. Ya están corregidos en el código de este plan:

| # | Bug | Corrección aplicada |
|---|-----|---------------------|
| P1 | `!parsed._meta?.app === 'KitchenCalc'` — siempre evalúa `false` | Cambiado a `parsed._meta?.app !== 'KitchenCalc'` |
| P2 | N inserts secuenciales a Supabase (lento) | Nuevo módulo `src/lib/db/bulk.js` con batch inserts |
| P3 | `calendarEvents` es Object, no Array — `.map()` crashea | Tratamiento especial en `commitImport` para calendar |
| P4 | `import { v4 as uuid } from 'uuid'` — no existe como dep | Usar `crypto.randomUUID()` nativo |
| P5 | `wastePct` en `csvHeaders` de ingredients — campo inexistente | Removido de csvHeaders (y CSV pospuesto) |
| P6 | `supplierId` de UUIDs ajenos al importar | Forzar `supplierId: null` para resolución por nombre |
| P7 | `overwrite` en recetas con dependencias | Documentado — funciona gracias a `updateRecipeWithIngredients` |

---

## 2. Arquitectura de Archivos

```
src/
├── lib/
│   ├── db/
│   │   ├── bulk.js          ← NUEVO (batch inserts para import)
│   │   └── index.js         ← MODIFICAR (agregar re-exports de bulk.js)
│   └── io/                  ← NUEVO directorio completo
│       ├── index.js          → Public API (exportData, previewImport, commitImport)
│       ├── registry.js       → Entity Registry + Format Registry
│       ├── validate.js       → Validación de esquema por entidad
│       ├── conflicts.js      → Resolución de conflictos (skip/overwrite/rename)
│       ├── idRemap.js        → Reasignación de IDs al importar
│       └── formats/
│           └── json.js       → Serialize / deserialize JSON
│
├── views/
│   └── DataPortalView.jsx   ← NUEVO (vista principal del portal de datos)
│
├── components/
│   ├── ImportPreviewModal.jsx ← NUEVO (modal de preview antes de importar)
│   └── Sidebar.jsx           ← MODIFICAR (agregar nav item "Data")
│
└── App.jsx                   ← MODIFICAR (agregar ruta /data)
```

**También modificar:**
- `DEVELOPMENT_TRACKER.md` — marcar tarea como completada

---

## 3. Orden de Implementación (SEGUIR EXACTAMENTE)

### FASE A — Core IO Module (sin UI)

Crear los 6 archivos del módulo IO en este orden (las dependencias van primero):

```
Paso A1: src/lib/io/registry.js
Paso A2: src/lib/io/validate.js      (depende de registry.js)
Paso A3: src/lib/io/idRemap.js       (sin dependencias internas)
Paso A4: src/lib/io/conflicts.js     (depende de registry.js)
Paso A5: src/lib/io/formats/json.js  (depende de registry.js)
Paso A6: src/lib/io/index.js         (depende de todos los anteriores)
```

### FASE B — DB Bulk Operations

```
Paso B1: src/lib/db/bulk.js          (nuevo módulo)
Paso B2: src/lib/db/index.js         (agregar re-exports)
```

### FASE C — UI Export

```
Paso C1: src/views/DataPortalView.jsx     (nueva vista, solo export inicialmente)
Paso C2: src/App.jsx                       (agregar ruta)
Paso C3: src/components/Sidebar.jsx        (agregar nav item)
```

### FASE D — UI Import

```
Paso D1: src/components/ImportPreviewModal.jsx  (nuevo componente)
Paso D2: src/views/DataPortalView.jsx           (agregar sección Import + drop zone)
```

### FASE E — Verificación

```
Paso E1: npm run dev → verificar que compila sin errores
Paso E2: Navegar a /data → verificar layout
Paso E3: Exportar JSON → verificar archivo
Paso E4: Importar JSON → verificar preview modal → confirmar → verificar datos
```

### FASE F — Documentación

```
Paso F1: DEVELOPMENT_TRACKER.md → mover tarea a completada
```

---

## 4. Código Exacto por Archivo

### A1 — `src/lib/io/registry.js`

```javascript
/**
 * @file registry.js
 * @description Entity Registry y Format Registry para el sistema de Import/Export.
 *
 * El Entity Registry es el corazón flexible del sistema. Cada entidad describe:
 * - Cómo se mapea al store de Zustand
 * - Qué acciones usar para add/update
 * - En qué orden importar (respetando foreign keys)
 * - Qué campos son requeridos
 * - Qué campo usar para detectar duplicados
 *
 * Agregar una nueva entidad = agregar un objeto aquí. El resto del sistema la detecta.
 */

export const ENTITY_REGISTRY = {
  suppliers: {
    label:        'Suppliers',
    icon:         '🚚',
    storeKey:     'suppliers',
    addAction:    'addSupplier',
    updateAction: 'updateSupplier',
    importOrder:  1,                     // menor = importar primero (respeta FKs)
    formats:      ['json'],
    required:     ['name'],
    conflictKey:  'name',                // campo para detectar duplicados al importar
  },

  ingredients: {
    label:        'Ingredients',
    icon:         '🥦',
    storeKey:     'ingredients',
    addAction:    'addIngredient',
    updateAction: 'updateIngredient',
    importOrder:  2,
    formats:      ['json'],
    required:     ['name', 'unit', 'packSize'],
    conflictKey:  'name',
  },

  recipes: {
    label:        'Recipes',
    icon:         '📋',
    storeKey:     'recipes',
    addAction:    'addRecipe',
    updateAction: 'updateRecipe',
    importOrder:  3,
    formats:      ['json'],
    required:     ['name'],
    conflictKey:  'name',
  },

  menus: {
    label:        'Menus',
    icon:         '🍱',
    storeKey:     'menus',
    addAction:    'addMenu',
    updateAction: 'updateMenu',
    importOrder:  4,
    formats:      ['json'],
    required:     ['name'],
    conflictKey:  'name',
  },

  calendar: {
    label:        'Calendar Events',
    icon:         '📅',
    storeKey:     'calendarEvents',
    addAction:    'setCalendarEvents',   // reemplaza TODO el diccionario
    importOrder:  5,
    formats:      ['json'],
    required:     [],
    conflictKey:  null,                  // sin conflictos — merge por fecha
  },
};

export const FORMAT_REGISTRY = {
  json: {
    label:       'JSON',
    extension:   '.json',
    mimeType:    'application/json',
    description: 'Complete backup, lossless. Ideal for restoring data.',
    supports:    'all',
  },
  // CSV se agregará en una PR futura
};

/**
 * Devuelve las entidades que soportan un formato dado.
 * @param {string} format - 'json' | 'csv'
 * @returns {string[]} - array de entityKeys
 */
export function getEntitiesForFormat(format) {
  if (FORMAT_REGISTRY[format]?.supports === 'all') {
    return Object.keys(ENTITY_REGISTRY);
  }
  return FORMAT_REGISTRY[format]?.supports ?? [];
}
```

---

### A2 — `src/lib/io/validate.js`

```javascript
/**
 * @file validate.js
 * @description Validación de esquema por entidad antes de importar.
 * Previene que datos malformados corrompan el store o la DB.
 */
import { ENTITY_REGISTRY } from './registry';
import { INGREDIENT_UNITS } from '../../constants/theme';

/**
 * Valida un array de objetos para una entidad dada.
 * @param {string} entityKey - Clave de la entidad en ENTITY_REGISTRY
 * @param {Object[]} items - Array de objetos a validar
 * @returns {{ valid: Object[], invalid: { item: Object, errors: string[] }[] }}
 */
export function validateEntities(entityKey, items) {
  const def = ENTITY_REGISTRY[entityKey];
  if (!def) {
    return { valid: [], invalid: items.map(item => ({ item, errors: [`Unknown entity: "${entityKey}"`] })) };
  }

  const valid = [];
  const invalid = [];

  for (const item of items) {
    const errors = [];

    // Campos requeridos
    for (const field of def.required) {
      if (item[field] === undefined || item[field] === null || String(item[field]).trim() === '') {
        errors.push(`Required field missing: "${field}"`);
      }
    }

    // Validaciones específicas por entidad
    if (entityKey === 'ingredients') {
      if (item.unit && !INGREDIENT_UNITS.includes(item.unit)) {
        errors.push(`Invalid unit: "${item.unit}". Valid: ${INGREDIENT_UNITS.join(', ')}`);
      }
      if (item.packSize !== undefined && Number(item.packSize) <= 0) {
        errors.push('packSize must be > 0');
      }
    }

    if (entityKey === 'recipes') {
      if (item.ingredients && !Array.isArray(item.ingredients)) {
        errors.push('"ingredients" must be an array');
      }
    }

    if (entityKey === 'menus') {
      if (item.recipeIds && !Array.isArray(item.recipeIds)) {
        errors.push('"recipeIds" must be an array');
      }
    }

    errors.length === 0 ? valid.push(item) : invalid.push({ item, errors });
  }

  return { valid, invalid };
}
```

---

### A3 — `src/lib/io/idRemap.js`

```javascript
/**
 * @file idRemap.js
 * @description Reasignación de IDs al importar datos de otra cuenta o backup.
 *
 * Al importar, los IDs originales pueden colisionar con los IDs existentes.
 * Este módulo genera UUIDs nuevos y construye mapas de traducción (oldId → newId)
 * para que las entidades dependientes actualicen sus referencias.
 *
 * Usa crypto.randomUUID() nativo — sin dependencias externas.
 */

/**
 * Dado un array de entidades importadas, asigna IDs nuevos
 * y devuelve el map oldId → newId.
 * @param {Object[]} items - Items a remapear
 * @returns {{ remapped: Object[], idMap: Map<string, string> }}
 */
export function remapIds(items) {
  const idMap = new Map();
  const remapped = items.map(item => {
    const newId = crypto.randomUUID();
    if (item.id) idMap.set(item.id, newId);
    return { ...item, id: newId };
  });
  return { remapped, idMap };
}

/**
 * Actualiza recipe.ingredients[].ingredientId usando el mapa de IDs de ingredientes.
 * @param {Object[]} recipes - Recetas con IDs ya remapeados
 * @param {Map<string, string>} ingIdMap - Mapa oldIngId → newIngId
 * @returns {Object[]}
 */
export function remapRecipeRefs(recipes, ingIdMap) {
  if (!ingIdMap || ingIdMap.size === 0) return recipes;
  return recipes.map(recipe => ({
    ...recipe,
    ingredients: (recipe.ingredients ?? []).map(ref => ({
      ...ref,
      ingredientId: ingIdMap.get(ref.ingredientId) ?? ref.ingredientId,
    })),
  }));
}

/**
 * Actualiza menu.recipeIds[] usando el mapa de IDs de recetas.
 * @param {Object[]} menus - Menús con IDs ya remapeados
 * @param {Map<string, string>} recipeIdMap - Mapa oldRecipeId → newRecipeId
 * @returns {Object[]}
 */
export function remapMenuRefs(menus, recipeIdMap) {
  if (!recipeIdMap || recipeIdMap.size === 0) return menus;
  return menus.map(menu => ({
    ...menu,
    recipeIds: (menu.recipeIds ?? []).map(id => recipeIdMap.get(id) ?? id),
  }));
}

/**
 * Actualiza referencias dentro de eventos de calendario.
 * calendarEvents es un Object { "YYYY-MM-DD": events[] }, NO un array.
 * @param {Object} calendarEvents - Diccionario date → events[]
 * @param {Map<string, string>} recipeIdMap
 * @param {Map<string, string>} menuIdMap
 * @returns {Object}
 */
export function remapCalendarRefs(calendarEvents, recipeIdMap, menuIdMap) {
  if (!calendarEvents || typeof calendarEvents !== 'object') return {};
  const result = {};
  for (const [date, events] of Object.entries(calendarEvents)) {
    if (!Array.isArray(events)) continue;
    result[date] = events.map(ev => {
      const remapped = { ...ev, id: crypto.randomUUID() };
      if (ev.type === 'recipe' && ev.recipe) {
        const newRecipeId = recipeIdMap?.get(ev.recipe.id) ?? ev.recipe.id;
        remapped.recipe = { ...ev.recipe, id: newRecipeId };
      }
      if (ev.type === 'menu' && ev.menu) {
        const newMenuId = menuIdMap?.get(ev.menu.id) ?? ev.menu.id;
        remapped.menu = { ...ev.menu, id: newMenuId };
        // También remapear menuRecipes si existen
        if (Array.isArray(ev.menuRecipes)) {
          remapped.menuRecipes = ev.menuRecipes.map(r => ({
            ...r,
            id: recipeIdMap?.get(r.id) ?? r.id,
          }));
        }
      }
      return remapped;
    });
  }
  return result;
}
```

---

### A4 — `src/lib/io/conflicts.js`

```javascript
/**
 * @file conflicts.js
 * @description Resolución de conflictos al importar datos que ya existen.
 *
 * Estrategias:
 * - skip:      no importar el duplicado (default seguro)
 * - overwrite: reemplazar el existente con el importado
 * - rename:    importar con sufijo " (imported)" en el conflictKey
 */
import { ENTITY_REGISTRY } from './registry';

export const CONFLICT_STRATEGIES = ['skip', 'overwrite', 'rename'];

/**
 * Clasifica items importados según la estrategia de conflicto elegida.
 *
 * @param {string} entityKey - Clave de la entidad
 * @param {Object[]} incoming - Items a importar (ya con IDs nuevos)
 * @param {Object[]|Object} existing - Items existentes del store (array o object para calendar)
 * @param {string} strategy - 'skip' | 'overwrite' | 'rename'
 * @returns {{ toAdd: Object[], toUpdate: Object[], toSkip: Object[] }}
 */
export function resolveConflicts(entityKey, incoming, existing, strategy = 'skip') {
  const def = ENTITY_REGISTRY[entityKey];
  const conflictKey = def?.conflictKey;

  // Sin conflictKey (e.g. calendar) → todos son nuevos
  if (!conflictKey) {
    return { toAdd: incoming, toUpdate: [], toSkip: [] };
  }

  // Normalizar: si existing no es array, convertir a array vacío
  const existingArray = Array.isArray(existing) ? existing : [];

  const existingIndex = new Map(
    existingArray.map(e => [String(e[conflictKey] ?? '').toLowerCase(), e])
  );

  const toAdd = [];
  const toUpdate = [];
  const toSkip = [];

  for (const item of incoming) {
    const matchKey = String(item[conflictKey] ?? '').toLowerCase();
    const existingItem = existingIndex.get(matchKey);

    if (!existingItem) {
      toAdd.push(item);
    } else if (strategy === 'skip') {
      toSkip.push(item);
    } else if (strategy === 'overwrite') {
      toUpdate.push({ ...item, id: existingItem.id }); // mantener el ID existente
    } else if (strategy === 'rename') {
      toAdd.push({ ...item, [conflictKey]: `${item[conflictKey]} (imported)` });
    }
  }

  return { toAdd, toUpdate, toSkip };
}

/**
 * Cuenta las estadísticas de conflictos para mostrar en el preview.
 * @param {string} entityKey
 * @param {Object[]} incoming
 * @param {Object[]|Object} existing
 * @returns {{ newCount: number, duplicateCount: number }}
 */
export function countConflicts(entityKey, incoming, existing) {
  const { toAdd, toSkip } = resolveConflicts(entityKey, incoming, existing, 'skip');
  return { newCount: toAdd.length, duplicateCount: toSkip.length };
}
```

---

### A5 — `src/lib/io/formats/json.js`

```javascript
/**
 * @file json.js
 * @description Serialize/deserialize JSON para backup completo de KitchenCalc.
 *
 * Formato del archivo exportado:
 * {
 *   _meta: { version, app, exportedAt, entities },
 *   suppliers: [...],
 *   ingredients: [...],
 *   recipes: [...],
 *   menus: [...],
 *   calendarEvents: { "YYYY-MM-DD": [...] }
 * }
 */
import { ENTITY_REGISTRY } from '../registry';

const CURRENT_VERSION = '1.0';

/**
 * Serializa las entidades seleccionadas a una cadena JSON.
 * @param {Object} storeData - Snapshot del store (useStore.getState())
 * @param {string[]} entityKeys - Qué entidades incluir en el export
 * @returns {string} - JSON string formateado
 */
export function serializeToJson(storeData, entityKeys) {
  const payload = {
    _meta: {
      version:    CURRENT_VERSION,
      app:        'KitchenCalc',
      exportedAt: new Date().toISOString(),
      entities:   entityKeys,
    },
  };

  for (const key of entityKeys) {
    const def = ENTITY_REGISTRY[key];
    if (!def) continue;
    payload[key] = storeData[def.storeKey] ?? (key === 'calendar' ? {} : []);
  }

  return JSON.stringify(payload, null, 2);
}

/**
 * Deserializa y valida un string JSON exportado por KitchenCalc.
 * @param {string} jsonString - Contenido del archivo .json
 * @returns {{ meta: Object|null, data: Object|null, errors: string[] }}
 */
export function deserializeFromJson(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { meta: null, data: null, errors: ['Invalid JSON file — could not parse'] };
  }

  // P1 FIX: la comparación original era `!parsed._meta?.app === 'KitchenCalc'` (siempre false)
  if (parsed._meta?.app !== 'KitchenCalc') {
    return { meta: null, data: null, errors: ['This file is not a KitchenCalc backup'] };
  }

  if (!parsed._meta?.entities || !Array.isArray(parsed._meta.entities)) {
    return { meta: null, data: null, errors: ['Backup file is missing entity list in _meta'] };
  }

  return { meta: parsed._meta, data: parsed, errors: [] };
}
```

---

### A6 — `src/lib/io/index.js`

```javascript
/**
 * @file index.js
 * @description Public API del módulo IO (Import/Export).
 * Las vistas importan SOLO desde aquí — nunca de los sub-módulos directamente.
 *
 * Exports:
 * - exportData()     → genera y descarga un archivo de backup
 * - previewImport()  → parsea un archivo y devuelve un preview (sin tocar el store)
 * - commitImport()   → aplica los datos del preview al store
 * - ENTITY_REGISTRY, FORMAT_REGISTRY → para la UI
 */
export { ENTITY_REGISTRY, FORMAT_REGISTRY, getEntitiesForFormat } from './registry';
export { CONFLICT_STRATEGIES } from './conflicts';

import { ENTITY_REGISTRY, FORMAT_REGISTRY } from './registry';
import { validateEntities } from './validate';
import { remapIds, remapRecipeRefs, remapMenuRefs, remapCalendarRefs } from './idRemap';
import { resolveConflicts, countConflicts } from './conflicts';
import { serializeToJson, deserializeFromJson } from './formats/json';

// ── EXPORT ──────────────────────────────────────────────────────────────────

/**
 * Exporta las entidades seleccionadas como archivo descargable.
 *
 * @param {Object} params
 * @param {string[]} params.entityKeys - Entidades a exportar (ej: ['suppliers','ingredients'])
 * @param {string} params.format - 'json' (csv en futuro)
 * @param {Object} params.storeData - Snapshot de useStore.getState()
 * @returns {string} - Nombre del archivo generado (para mostrar en toast)
 */
export function exportData({ entityKeys, format, storeData }) {
  if (format !== 'json') {
    throw new Error(`Format "${format}" is not yet supported`);
  }

  const content = serializeToJson(storeData, entityKeys);

  const ext  = FORMAT_REGISTRY[format].extension;
  const mime = FORMAT_REGISTRY[format].mimeType;
  const name = `KitchenCalc_${entityKeys.join('-')}_${datestamp()}${ext}`;

  triggerDownload(content, name, mime);
  return name;
}

// ── IMPORT: Preview ─────────────────────────────────────────────────────────

/**
 * Parsea un archivo importado y devuelve un preview sin tocar el store.
 * El usuario ve este preview y decide si continuar.
 *
 * @param {Object} params
 * @param {string} params.fileContent - Contenido del archivo como string
 * @param {string} params.fileName - Nombre del archivo (para detectar formato)
 * @param {Object} params.storeSnapshot - Snapshot actual del store (para contar conflictos)
 * @returns {{ ok: boolean, errors?: string[], meta?: Object, preview?: Object }}
 *
 * preview shape: {
 *   suppliers:   { valid: [...], invalid: [...], newCount, duplicateCount },
 *   ingredients: { valid: [...], invalid: [...], newCount, duplicateCount },
 *   ...
 * }
 */
export function previewImport({ fileContent, fileName, storeSnapshot }) {
  const format = detectFormat(fileName);

  if (format !== 'json') {
    return { ok: false, errors: [`Format "${format}" is not yet supported for import`] };
  }

  const { meta, data, errors } = deserializeFromJson(fileContent);
  if (errors.length) return { ok: false, errors };

  const preview = {};
  let totalValid = 0;

  for (const entityKey of (meta?.entities ?? [])) {
    if (!data[entityKey]) continue;
    if (!ENTITY_REGISTRY[entityKey]) continue;

    // Normalizar: calendar es Object, el resto son Arrays
    let items;
    if (entityKey === 'calendar') {
      // Para calendar, no validamos items individuales — es un blob de fechas
      preview[entityKey] = {
        valid: data[entityKey],
        invalid: [],
        newCount: Object.keys(data[entityKey]).length,
        duplicateCount: 0,
        isCalendar: true,
      };
      totalValid += Object.keys(data[entityKey]).length;
      continue;
    }

    items = Array.isArray(data[entityKey]) ? data[entityKey] : Object.values(data[entityKey]);

    // Validar
    const { valid, invalid } = validateEntities(entityKey, items);

    // Contar conflictos contra datos existentes
    const existing = storeSnapshot[ENTITY_REGISTRY[entityKey].storeKey] ?? [];
    const { newCount, duplicateCount } = countConflicts(entityKey, valid, existing);

    preview[entityKey] = { valid, invalid, newCount, duplicateCount };
    totalValid += valid.length;
  }

  return { ok: true, meta, preview, totalValid };
}

// ── IMPORT: Commit ──────────────────────────────────────────────────────────

/**
 * Aplica los datos validados del preview al store.
 * Llamado después de que el usuario confirma en ImportPreviewModal.
 *
 * @param {Object} params
 * @param {Object} params.preview - El preview devuelto por previewImport()
 * @param {string} params.strategy - 'skip' | 'overwrite' | 'rename'
 * @param {Object} params.storeSnapshot - Snapshot actual del store
 * @param {Object} params.storeActions - Acciones del store: { addSupplier, updateSupplier, ... }
 * @returns {{ imported: number, skipped: number, updated: number, errors: string[] }}
 */
export async function commitImport({ preview, strategy, storeSnapshot, storeActions }) {
  // Ordenar entidades por importOrder (suppliers primero, calendar último)
  const ordered = Object.keys(preview)
    .filter(k => ENTITY_REGISTRY[k])
    .sort((a, b) => ENTITY_REGISTRY[a].importOrder - ENTITY_REGISTRY[b].importOrder);

  const idMaps = {};  // acumula idMaps para resolver referencias cruzadas
  const stats = { imported: 0, skipped: 0, updated: 0, errors: [] };

  for (const entityKey of ordered) {
    try {
      // ── Calendar: tratamiento especial (P3 FIX) ──
      if (entityKey === 'calendar' && preview[entityKey]?.isCalendar) {
        const importedCal = preview[entityKey].valid;
        if (!importedCal || typeof importedCal !== 'object') continue;

        // Remapear referencias internas
        const remappedCal = remapCalendarRefs(importedCal, idMaps.recipes, idMaps.menus);

        // Merge con calendario existente (importado gana en caso de conflicto por fecha)
        const existingCal = storeSnapshot.calendarEvents ?? {};
        const merged = { ...existingCal, ...remappedCal };

        await storeActions.setCalendarEvents(merged);
        stats.imported += Object.keys(remappedCal).length;
        continue;
      }

      // ── Entidades normales (arrays) ──
      const { valid } = preview[entityKey];
      if (!valid || valid.length === 0) continue;

      const existing = storeSnapshot[ENTITY_REGISTRY[entityKey].storeKey] ?? [];

      // 1. Re-mapear IDs
      const { remapped, idMap } = remapIds(valid);
      idMaps[entityKey] = idMap;

      // 2. Aplicar referencias cruzadas
      let finalItems = remapped;
      if (entityKey === 'recipes' && idMaps.ingredients) {
        finalItems = remapRecipeRefs(remapped, idMaps.ingredients);
      }
      if (entityKey === 'menus' && idMaps.recipes) {
        finalItems = remapMenuRefs(remapped, idMaps.recipes);
      }

      // P6 FIX: limpiar supplierId de ingredientes importados (forzar resolución por nombre)
      if (entityKey === 'ingredients') {
        finalItems = finalItems.map(ing => ({
          ...ing,
          supplierId: null,  // addIngredient resolverá por nombre
        }));
      }

      // 3. Resolver conflictos
      const { toAdd, toUpdate, toSkip } = resolveConflicts(entityKey, finalItems, existing, strategy);

      // 4. Commit al store (las acciones del store sincronizan con Supabase si USE_SUPABASE=true)
      const addAction    = storeActions[ENTITY_REGISTRY[entityKey].addAction];
      const updateAction = storeActions[ENTITY_REGISTRY[entityKey].updateAction];

      for (const item of toAdd)    { await addAction?.(item); }
      for (const item of toUpdate) { await updateAction?.(item); }

      stats.imported += toAdd.length;
      stats.updated  += toUpdate.length;
      stats.skipped  += toSkip.length;

    } catch (err) {
      stats.errors.push(`Error importing ${entityKey}: ${err.message}`);
      console.error(`[commitImport] Error in ${entityKey}:`, err);
    }
  }

  return stats;
}

// ── Helpers privados ────────────────────────────────────────────────────────

function triggerDownload(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function datestamp() {
  return new Date().toISOString().slice(0, 10);
}

function detectFormat(fileName) {
  if (fileName.endsWith('.json')) return 'json';
  if (fileName.endsWith('.csv'))  return 'csv';
  throw new Error(`Unsupported format: ${fileName}`);
}
```

---

### B1 — `src/lib/db/bulk.js`

> **NOTA:** Este módulo se creó como optimización futura para imports masivos.
> En la V1: `commitImport` usa las acciones individuales del store (que ya hacen optimistic updates).
> Los batch inserts se integrarán cuando se implemente CSV con datasets grandes.
> Por ahora NO se usa directamente — se reserva para la fase de CSV.

```javascript
/**
 * @file bulk.js
 * @description Funciones de batch insert para Supabase.
 * Usan .insert(array) que inserta todos los registros en un solo roundtrip.
 *
 * SOLO se usan desde el módulo IO — el store existente NO se modifica.
 * Reservado para futura optimización de bulk imports.
 */
import { supabase, USE_SUPABASE } from './client';
import {
  storeSupplierToDb,
  storeIngredientToDb,
  storeRecipeToDb,
  storeRecipeIngredientsToDb,
} from './transform';

/**
 * Batch insert de suppliers a Supabase.
 * @param {Object[]} suppliers - Array de suppliers en formato store
 * @param {string} userId - auth.uid()
 * @returns {{ data, error }}
 */
export async function bulkInsertSuppliers(suppliers, userId) {
  if (!USE_SUPABASE || suppliers.length === 0) return { data: null, error: null };
  const rows = suppliers.map(s => storeSupplierToDb(s, userId));
  return supabase.from('suppliers').insert(rows);
}

/**
 * Batch insert de ingredients a Supabase.
 * @param {Object[]} ingredients - Array de ingredients en formato store
 * @param {string} userId - auth.uid()
 * @param {Map} supplierNameMap - Map<supplierName, supplierUUID>
 * @returns {{ data, error }}
 */
export async function bulkInsertIngredients(ingredients, userId, supplierNameMap) {
  if (!USE_SUPABASE || ingredients.length === 0) return { data: null, error: null };
  const rows = ingredients.map(ing => storeIngredientToDb(ing, userId, supplierNameMap));
  return supabase.from('ingredients').insert(rows);
}

/**
 * Batch insert de recipes a Supabase (inserta recipes + recipe_ingredients).
 * @param {Object[]} recipes - Array de recipes en formato store
 * @param {string} userId - auth.uid()
 * @returns {{ data, error }}
 */
export async function bulkInsertRecipes(recipes, userId) {
  if (!USE_SUPABASE || recipes.length === 0) return { data: null, error: null };

  // 1. Insert recipe rows
  const recipeRows = recipes.map(r => storeRecipeToDb(r, userId));
  const { error: recipeError } = await supabase.from('recipes').insert(recipeRows);
  if (recipeError) return { data: null, error: recipeError };

  // 2. Insert recipe_ingredients rows
  const riRows = recipes.flatMap(r =>
    storeRecipeIngredientsToDb(r.id, r.ingredients ?? [], userId)
  );
  if (riRows.length > 0) {
    const { error: riError } = await supabase.from('recipe_ingredients').insert(riRows);
    if (riError) return { data: null, error: riError };
  }

  return { data: recipeRows, error: null };
}
```

---

### B2 — Modificar `src/lib/db/index.js`

**Agregar al final del archivo** (después de la línea de migración):

```javascript
// ── Bulk Operations (para Import) ─────────────────────────────────────────────
export {
  bulkInsertSuppliers,
  bulkInsertIngredients,
  bulkInsertRecipes,
} from './bulk';
```

---

### C1 — `src/views/DataPortalView.jsx`

```jsx
/**
 * @file DataPortalView.jsx
 * @description Vista principal del portal de datos (Import/Export).
 * Accesible desde /data en la sidebar.
 *
 * Secciones:
 * 1. EXPORT — seleccionar entidades + formato → descargar archivo
 * 2. IMPORT — drop zone + preview modal → importar datos
 */
import { useState, useRef, useCallback } from 'react';
import { Download, Upload, FileJson, Check, Database, ArrowUpDown, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { exportData, previewImport, ENTITY_REGISTRY, FORMAT_REGISTRY } from '../lib/io';
import ImportPreviewModal from '../components/ImportPreviewModal';

const ENTITY_KEYS = Object.keys(ENTITY_REGISTRY);

export default function DataPortalView() {
  // ── State ──
  const [selectedEntities, setSelectedEntities] = useState(
    ENTITY_KEYS.reduce((acc, k) => ({ ...acc, [k]: k !== 'calendar' }), {})
  );
  const [format] = useState('json');  // Solo JSON por ahora
  const [isExporting, setIsExporting] = useState(false);
  const [exportedFile, setExportedFile] = useState(null);

  // Import state
  const [importPreview, setImportPreview] = useState(null);
  const [importMeta, setImportMeta] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const fileInputRef = useRef(null);

  // Store
  const addToast = useStore(s => s.addToast);

  // ── Entity counts from store ──
  const counts = {};
  for (const key of ENTITY_KEYS) {
    const storeKey = ENTITY_REGISTRY[key].storeKey;
    const data = useStore(s => s[storeKey]);
    counts[key] = Array.isArray(data) ? data.length : Object.keys(data ?? {}).length;
  }

  // ── Export handler ──
  const handleExport = () => {
    const selected = ENTITY_KEYS.filter(k => selectedEntities[k]);
    if (selected.length === 0) {
      addToast({ type: 'error', message: 'Select at least one entity to export' });
      return;
    }

    setIsExporting(true);
    try {
      const storeData = useStore.getState();
      const fileName = exportData({ entityKeys: selected, format, storeData });
      setExportedFile(fileName);
      addToast({ type: 'success', message: `Exported: ${fileName}` });
    } catch (err) {
      addToast({ type: 'error', message: `Export failed: ${err.message}` });
    } finally {
      setIsExporting(false);
    }
  };

  // ── Toggle entity selection ──
  const toggleEntity = (key) => {
    setSelectedEntities(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = () => {
    setSelectedEntities(ENTITY_KEYS.reduce((acc, k) => ({ ...acc, [k]: true }), {}));
  };

  const selectNone = () => {
    setSelectedEntities(ENTITY_KEYS.reduce((acc, k) => ({ ...acc, [k]: false }), {}));
  };

  // ── File reading (for import) ──
  const readFile = useCallback((file) => {
    if (!file) return;
    setIsReading(true);
    setImportErrors([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const storeSnapshot = useStore.getState();
        const result = previewImport({
          fileContent: e.target.result,
          fileName: file.name,
          storeSnapshot,
        });

        if (!result.ok) {
          setImportErrors(result.errors);
        } else {
          setImportPreview(result.preview);
          setImportMeta(result.meta);
        }
      } catch (err) {
        setImportErrors([err.message]);
      } finally {
        setIsReading(false);
      }
    };
    reader.onerror = () => {
      setImportErrors(['Could not read file']);
      setIsReading(false);
    };
    reader.readAsText(file);
  }, []);

  // ── Drag & drop handlers ──
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) readFile(file);
  };
  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
    e.target.value = '';  // Reset para permitir reimport del mismo archivo
  };

  // ── Close import modal ──
  const closeImportModal = () => {
    setImportPreview(null);
    setImportMeta(null);
    setImportErrors([]);
  };

  // ── Derived ──
  const selectedCount = ENTITY_KEYS.filter(k => selectedEntities[k]).length;
  const totalItems = ENTITY_KEYS.filter(k => selectedEntities[k]).reduce((sum, k) => sum + counts[k], 0);

  return (
    <div className="fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ── Header ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, #6b3fa0, #4ecdc4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Database size={22} color="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#3d1a78' }}>Data Portal</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#9b6dca' }}>Export backups and import data</p>
          </div>
        </div>
      </div>

      {/* ── EXPORT Section ── */}
      <div className="glass-card" style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Download size={20} color="#4ecdc4" />
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#3d1a78' }}>Export your data</h2>
        </div>

        {/* Entity selector grid */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#6b3fa0' }}>Select entities:</span>
            <button onClick={selectAll} style={linkBtnStyle}>Select all</button>
            <button onClick={selectNone} style={linkBtnStyle}>Clear</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
            {ENTITY_KEYS.map(key => {
              const def = ENTITY_REGISTRY[key];
              const selected = selectedEntities[key];
              return (
                <button
                  key={key}
                  onClick={() => toggleEntity(key)}
                  className="hover-lift"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
                    background: selected ? 'rgba(78, 205, 196, 0.12)' : 'rgba(255,255,255,0.5)',
                    border: selected ? '1.5px solid rgba(78,205,196,0.5)' : '1.5px solid rgba(155,109,202,0.15)',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{def.icon}</span>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: selected ? '#0f766e' : '#6b3fa0' }}>
                      {def.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#9b6dca' }}>
                      {counts[key]} {counts[key] === 1 ? 'item' : 'items'}
                    </div>
                  </div>
                  {selected && (
                    <div style={{
                      width: 22, height: 22, borderRadius: 7,
                      background: 'linear-gradient(135deg, #4ecdc4, #38b2ac)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Check size={14} color="white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Format info */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 10,
          background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)',
          marginBottom: 20,
        }}>
          <FileJson size={16} color="#3b82f6" />
          <span style={{ fontSize: 12, color: '#3b82f6', fontWeight: 500 }}>
            JSON format — complete backup, lossless. Includes all nested data.
          </span>
        </div>

        {/* Export button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            className="btn-primary"
            onClick={handleExport}
            disabled={selectedCount === 0 || isExporting}
            style={{
              opacity: selectedCount === 0 ? 0.5 : 1,
              cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
              padding: '12px 24px', fontSize: 14,
            }}
          >
            <Download size={16} />
            {isExporting ? 'Exporting...' : `Export ${selectedCount} ${selectedCount === 1 ? 'entity' : 'entities'} (${totalItems} items)`}
          </button>

          {exportedFile && (
            <span style={{ fontSize: 12, color: '#10b981', fontWeight: 500 }}>
              ✓ {exportedFile}
            </span>
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(155,109,202,0.3), transparent)' }} />

      {/* ── IMPORT Section ── */}
      <div className="glass-card" style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Upload size={20} color="#6b3fa0" />
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#3d1a78' }}>Import data</h2>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? '#4ecdc4' : 'rgba(155,109,202,0.3)'}`,
            borderRadius: 16, padding: '40px 20px',
            textAlign: 'center', cursor: 'pointer',
            background: isDragging ? 'rgba(78,205,196,0.08)' : 'rgba(255,255,255,0.3)',
            transition: 'all 0.25s',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />

          {isReading ? (
            <div style={{ color: '#9b6dca' }}>
              <div style={{
                width: 36, height: 36, border: '3px solid rgba(155,109,202,0.2)',
                borderTopColor: '#4ecdc4', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 12px',
              }} />
              <p style={{ fontSize: 13 }}>Reading file...</p>
            </div>
          ) : (
            <>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(107,63,160,0.12), rgba(78,205,196,0.12))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <Upload size={24} color="#6b3fa0" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#3d1a78', margin: '0 0 4px' }}>
                Drop a backup file here, or click to browse
              </p>
              <p style={{ fontSize: 12, color: '#9b6dca', margin: 0 }}>
                Supports .json files exported from KitchenCalc
              </p>
            </>
          )}
        </div>

        {/* Import errors */}
        {importErrors.length > 0 && (
          <div style={{
            marginTop: 16, padding: '12px 16px', borderRadius: 12,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          }}>
            {importErrors.map((err, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#ef4444' }}>
                <AlertCircle size={14} />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}

        {/* Info note */}
        <p style={{ marginTop: 16, fontSize: 12, color: '#9b6dca', fontStyle: 'italic' }}>
          Importing adds new items to your data. You can choose how to handle duplicates in the next step.
        </p>
      </div>

      {/* ── Import Preview Modal ── */}
      {importPreview && (
        <ImportPreviewModal
          preview={importPreview}
          meta={importMeta}
          onClose={closeImportModal}
        />
      )}
    </div>
  );
}

// ── Style helpers ──
const linkBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#4ecdc4', fontSize: 12, fontWeight: 600,
  textDecoration: 'underline', padding: 0,
};
```

---

### C2 — Modificar `src/App.jsx`

**Cambio 1:** Agregar lazy import (después de la línea `const CartView = ...`, ~ línea 32):

```javascript
const DataPortalView = React.lazy(() => import('./views/DataPortalView'));
```

**Cambio 2:** Agregar ruta (después de `<Route path="/cart" .../>`, ~ línea 106):

```jsx
<Route path="/data" element={<DataPortalView />} />
```

---

### C3 — Modificar `src/components/Sidebar.jsx`

**Cambio 1:** Agregar import de `ArrowUpDown` (línea 14, agregar al destructuring):

```javascript
import { ChefHat, Calendar, Package, Truck, ShoppingCart, ClipboardList, Calculator, Activity, Users, LogOut, ArrowUpDown } from 'lucide-react';
```

**Cambio 2:** Agregar nav item en el array `navItems` (después de `cart`, antes de los mockups, ~ línea 40):

```javascript
{ id: 'data', icon: ArrowUpDown, label: 'Data' },
```

---

### D1 — `src/components/ImportPreviewModal.jsx`

```jsx
/**
 * @file ImportPreviewModal.jsx
 * @description Modal de preview antes de confirmar un import.
 * Muestra conteos por entidad, items inválidos, y permite elegir estrategia de conflicto.
 */
import { useState } from 'react';
import { X, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import { useStore } from '../store/useStore';
import { commitImport, ENTITY_REGISTRY, CONFLICT_STRATEGIES } from '../lib/io';

export default function ImportPreviewModal({ preview, meta, onClose }) {
  const [strategy, setStrategy] = useState('skip');
  const [isImporting, setIsImporting] = useState(false);
  const [expandedEntity, setExpandedEntity] = useState(null);
  const [result, setResult] = useState(null);

  const addToast = useStore(s => s.addToast);

  // Calcular totales
  const entityKeys = Object.keys(preview).filter(k => ENTITY_REGISTRY[k]);
  let totalToImport = 0;
  let totalInvalid = 0;
  let totalDuplicates = 0;

  for (const key of entityKeys) {
    const p = preview[key];
    if (p.isCalendar) {
      totalToImport += p.newCount;
    } else {
      totalToImport += p.valid?.length ?? 0;
      totalInvalid += p.invalid?.length ?? 0;
      totalDuplicates += p.duplicateCount ?? 0;
    }
  }

  // ── Import handler ──
  const handleImport = async () => {
    setIsImporting(true);
    try {
      const storeSnapshot = useStore.getState();
      const storeActions = {
        addSupplier:       useStore.getState().addSupplier,
        updateSupplier:    useStore.getState().updateSupplier,
        addIngredient:     useStore.getState().addIngredient,
        updateIngredient:  useStore.getState().updateIngredient,
        addRecipe:         useStore.getState().addRecipe,
        updateRecipe:      useStore.getState().updateRecipe,
        addMenu:           useStore.getState().addMenu,
        updateMenu:        useStore.getState().updateMenu,
        setCalendarEvents: useStore.getState().setCalendarEvents,
      };

      const stats = await commitImport({ preview, strategy, storeSnapshot, storeActions });

      setResult(stats);

      if (stats.errors.length === 0) {
        addToast({
          type: 'success',
          message: `Imported ${stats.imported} items${stats.updated > 0 ? `, updated ${stats.updated}` : ''}${stats.skipped > 0 ? `, skipped ${stats.skipped} duplicates` : ''}`,
        });
      } else {
        addToast({
          type: 'error',
          message: `Import completed with ${stats.errors.length} error(s). ${stats.imported} items imported.`,
        });
      }
    } catch (err) {
      addToast({ type: 'error', message: `Import failed: ${err.message}` });
    } finally {
      setIsImporting(false);
    }
  };

  const strategyLabels = {
    skip: 'Skip duplicates (Recommended)',
    overwrite: 'Overwrite existing items',
    rename: 'Rename (add " (imported)" suffix)',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(61,26,120,0.5)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease-out',
    }} onClick={onClose}>

      <div className="glass-card" onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 560, maxHeight: '80vh', overflowY: 'auto',
        padding: '28px 32px',
        animation: 'fadeInUp 0.3s ease-out',
      }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#3d1a78' }}>Import Preview</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#9b6dca', padding: 4,
          }}>
            <X size={20} />
          </button>
        </div>

        {/* ── Meta info ── */}
        {meta && (
          <div style={{
            padding: '10px 14px', borderRadius: 10, marginBottom: 20,
            background: 'rgba(78,205,196,0.08)', border: '1px solid rgba(78,205,196,0.15)',
            fontSize: 12, color: '#0f766e',
          }}>
            KitchenCalc backup — exported {meta.exportedAt ? new Date(meta.exportedAt).toLocaleDateString() : 'unknown date'}
            {meta.version && ` — v${meta.version}`}
          </div>
        )}

        {/* ── Entity preview table ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {entityKeys.map(key => {
            const def = ENTITY_REGISTRY[key];
            const p = preview[key];
            const isCalendar = p.isCalendar;
            const validCount = isCalendar ? p.newCount : (p.valid?.length ?? 0);
            const invalidCount = isCalendar ? 0 : (p.invalid?.length ?? 0);
            const dupCount = p.duplicateCount ?? 0;
            const isExpanded = expandedEntity === key;

            return (
              <div key={key} style={{
                padding: '12px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.5)',
                border: `1px solid ${invalidCount > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(155,109,202,0.12)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{def.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#3d1a78' }}>{def.label}</div>
                    <div style={{ fontSize: 11, color: '#9b6dca' }}>
                      {isCalendar
                        ? `${validCount} day(s) of events`
                        : `${validCount} to add${dupCount > 0 ? `, ${dupCount} duplicate(s)` : ''}${invalidCount > 0 ? `, ${invalidCount} invalid` : ''}`
                      }
                    </div>
                  </div>
                  {invalidCount > 0 ? (
                    <AlertTriangle size={16} color="#f59e0b" />
                  ) : (
                    <CheckCircle size={16} color="#10b981" />
                  )}
                  {invalidCount > 0 && (
                    <button
                      onClick={() => setExpandedEntity(isExpanded ? null : key)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9b6dca', padding: 2 }}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>

                {/* Expanded: show invalid items */}
                {isExpanded && !isCalendar && p.invalid?.length > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(155,109,202,0.12)' }}>
                    {p.invalid.map((inv, i) => (
                      <div key={i} style={{ fontSize: 11, color: '#ef4444', marginBottom: 4 }}>
                        <strong>{inv.item?.name || `Item #${i + 1}`}:</strong>{' '}
                        {inv.errors.join('; ')}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Conflict strategy (solo si hay duplicados) ── */}
        {totalDuplicates > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#6b3fa0', marginBottom: 8 }}>
              Conflict strategy ({totalDuplicates} duplicate{totalDuplicates !== 1 && 's'})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {CONFLICT_STRATEGIES.map(s => (
                <label key={s} style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  padding: '8px 12px', borderRadius: 10,
                  background: strategy === s ? 'rgba(78,205,196,0.1)' : 'transparent',
                  border: strategy === s ? '1px solid rgba(78,205,196,0.3)' : '1px solid transparent',
                  transition: 'all 0.15s',
                }}>
                  <input
                    type="radio"
                    name="conflict-strategy"
                    value={s}
                    checked={strategy === s}
                    onChange={() => setStrategy(s)}
                    style={{ accentColor: '#4ecdc4' }}
                  />
                  <span style={{ fontSize: 13, color: '#3d1a78', fontWeight: strategy === s ? 600 : 400 }}>
                    {strategyLabels[s]}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ── Summary warning ── */}
        <div style={{
          padding: '10px 14px', borderRadius: 10, marginBottom: 20,
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)',
          fontSize: 12, color: '#92400e',
        }}>
          This will create up to <strong>{totalToImport}</strong> new item{totalToImport !== 1 && 's'} across <strong>{entityKeys.length}</strong> collection{entityKeys.length !== 1 && 's'}.
          {totalInvalid > 0 && ` ${totalInvalid} invalid item${totalInvalid !== 1 && 's'} will be skipped.`}
        </div>

        {/* ── Result (after import) ── */}
        {result && (
          <div style={{
            padding: '12px 14px', borderRadius: 10, marginBottom: 16,
            background: result.errors.length === 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${result.errors.length === 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: result.errors.length === 0 ? '#10b981' : '#ef4444', marginBottom: 4 }}>
              {result.errors.length === 0 ? '✓ Import complete!' : '⚠ Import completed with errors'}
            </div>
            <div style={{ fontSize: 12, color: '#6b3fa0' }}>
              {result.imported} imported, {result.updated} updated, {result.skipped} skipped
            </div>
            {result.errors.map((err, i) => (
              <div key={i} style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{err}</div>
            ))}
          </div>
        )}

        {/* ── Action buttons ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose}>
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button
              className="btn-primary"
              onClick={handleImport}
              disabled={isImporting || totalToImport === 0}
              style={{
                opacity: totalToImport === 0 ? 0.5 : 1,
                cursor: totalToImport === 0 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {isImporting ? (
                <>
                  <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  Importing...
                </>
              ) : (
                `Import ${totalToImport} item${totalToImport !== 1 ? 's' : ''}`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## 5. Modificaciones a Archivos Existentes (DIFFS EXACTOS)

### `src/App.jsx`

```diff
 const CartView         = React.lazy(() => import('./views/CartView'));
+const DataPortalView   = React.lazy(() => import('./views/DataPortalView'));
```

```diff
               <Route path="/cart"             element={<CartView />} />
+              <Route path="/data"             element={<DataPortalView />} />
               <Route path="*"                 element={<Navigate to="/dashboard" replace />} />
```

### `src/components/Sidebar.jsx`

```diff
-import { ChefHat, Calendar, Package, Truck, ShoppingCart, ClipboardList, Calculator, Activity, Users, LogOut } from 'lucide-react';
+import { ChefHat, Calendar, Package, Truck, ShoppingCart, ClipboardList, Calculator, Activity, Users, LogOut, ArrowUpDown } from 'lucide-react';
```

```diff
         { id: 'cart', icon: ShoppingCart, label: 'Cart', badge: cartCount },
+        { id: 'data', icon: ArrowUpDown, label: 'Data' },
         // --- Mockups ---
```

### `src/lib/db/index.js`

```diff
 export { migrateLocalDataToDb, isUserDbEmpty, hasLocalData } from './migration';
+
+// ── Bulk Operations (para Import) ─────────────────────────────────────────────
+export {
+  bulkInsertSuppliers,
+  bulkInsertIngredients,
+  bulkInsertRecipes,
+} from './bulk';
```

### `DEVELOPMENT_TRACKER.md`

En la sección `## 🔄 In Progress`:

```diff
-| — | No active development tasks | Idle |
+| Sistema Import/Export | Implementación completa: módulo IO, DataPortalView, ImportPreviewModal | ✅ Done |
```

En la sección `## 📌 Backlog → P1`:

```diff
-- [ ] **Sistema de Import / Export de datos**
-  - Plan completo diseñado: ver `agent-sessions/2026-04-18_import-export-system-plan.md`
-  - Módulo `src/lib/io/`: Entity Registry, Format Registry, validación, idRemap, conflict resolution
-  - Formatos: JSON (backup completo, todas las entidades) + CSV (suppliers e ingredients)
-  - UI: `DataPortalView.jsx` en `/data` + `ImportPreviewModal.jsx`
-  - Fases: A (core lib) → B (export) → C (CSV) → D (import con preview)
-  - Única nueva dep opcional: `papaparse` (solo Fase C)
-  - Files: `src/lib/io/`, `src/views/DataPortalView.jsx`, `src/components/ImportPreviewModal.jsx`, mods en `App.jsx` y `Sidebar.jsx`
+- [x] **Sistema de Import / Export de datos** — Implementado 2026-04-20
+  - Plan + implementación: ver `agent-sessions/2026-04-20_import-export-implementation.md`
+  - Módulo `src/lib/io/`: Entity Registry, Format Registry, validación, idRemap, conflict resolution
+  - Formato: JSON (backup completo, todas las entidades). CSV pospuesto a PR futura.
+  - UI: `DataPortalView.jsx` en `/data` + `ImportPreviewModal.jsx`
+  - Archivos creados: 7 en `src/lib/io/`, 1 en `src/lib/db/`, 2 en views/components
+  - Archivos modificados: `App.jsx`, `Sidebar.jsx`, `src/lib/db/index.js`
```

En la sección `## ✅ Completed Features`, agregar nueva subsección:

```markdown
### Import / Export System (2026-04-20)

- [x] **`src/lib/io/registry.js`** — Entity Registry (5 entidades) + Format Registry (JSON). Diseño extensible: agregar entidad = 1 objeto nuevo.
- [x] **`src/lib/io/validate.js`** — Validación de esquema por entidad antes de importar. Verifica campos requeridos + validaciones específicas (units, packSize, arrays anidados).
- [x] **`src/lib/io/idRemap.js`** — Reasignación de UUIDs al importar. Usa `crypto.randomUUID()`. Mapas de traducción oldId→newId para resolver FKs cruzadas (recipe→ingredient, menu→recipe, calendar→recipe/menu).
- [x] **`src/lib/io/conflicts.js`** — Resolución de duplicados: skip (default), overwrite, rename.
- [x] **`src/lib/io/formats/json.js`** — Serialize/deserialize JSON con metadata (`_meta.app`, `_meta.version`, `_meta.exportedAt`).
- [x] **`src/lib/io/index.js`** — Public API: `exportData()`, `previewImport()`, `commitImport()`. Tratamiento especial para calendar (Object merge) e ingredients (limpiar supplierId).
- [x] **`src/lib/db/bulk.js`** — Funciones de batch insert para Supabase (reservado para future CSV optimization).
- [x] **`src/views/DataPortalView.jsx`** — Vista con secciones Export (entity selector grid, format info, download) + Import (drag & drop zone, file reader, error display).
- [x] **`src/components/ImportPreviewModal.jsx`** — Modal glassmorphism con preview por entidad (valid/invalid counts), conflict strategy selector, progress indicator, result summary.
- [x] **Integración** — Ruta `/data` lazy-loaded en App.jsx. Nav item "Data" con icono `ArrowUpDown` en Sidebar.jsx.
```

---

## 6. Verificación End-to-End

Después de implementar todo, ejecutar estas verificaciones:

### E1 — Compilación
```bash
npm run dev
```
Verificar: sin errores de compilación, sin warnings de import.

### E2 — Navegación
1. Abrir la app en el browser
2. Click en "Data" en la sidebar → debe navegar a `/data`
3. Verificar que la vista carga (lazy-loaded)
4. Verificar que el header "Data Portal" aparece
5. Verificar que los entity cards muestran conteos correctos

### E3 — Export JSON
1. Seleccionar todas las entidades
2. Click "Export"
3. Verificar que se descarga un archivo `KitchenCalc_suppliers-ingredients-recipes-menus-calendar_YYYY-MM-DD.json`
4. Abrir el archivo → verificar `_meta.app === 'KitchenCalc'`
5. Verificar que los datos de cada entidad están presentes

### E4 — Import JSON
1. Drag & drop el archivo exportado en la zona de import
2. Verificar que el ImportPreviewModal aparece
3. Verificar que muestra conteos correctos por entidad
4. Verificar que los duplicados se detectan (todos deberían ser duplicados si se reimporta)
5. Seleccionar estrategia "skip" → click Import → verificar que dice "X skipped"
6. Cerrar modal → seleccionar el mismo archivo → estrategia "rename" → Import → verificar items con " (imported)" suffix en las vistas

### E5 — Import archivo inválido
1. Crear un archivo `test.json` con contenido `{"invalid": true}`
2. Importar → verificar que muestra error "This file is not a KitchenCalc backup"

### E6 — Modo localStorage
1. Verificar que export/import funciona sin credenciales de Supabase (`USE_SUPABASE=false`)

---

## 7. Notas para el Agente Implementador

1. **NO instalar nuevas dependencias.** Este plan es zero-dependency (JSON only). `papaparse` se agregará en una PR futura para CSV.

2. **NO modificar el store (`useStore.js`).** El módulo IO usa las acciones existentes del store (`addSupplier`, `addIngredient`, etc.) directamente. No se crean acciones nuevas.

3. **Respetar el patrón de styling.** La app usa una mezcla de:
   - Clases CSS de `index.css` (`.glass-card`, `.btn-primary`, etc.)
   - Tailwind utilities donde ya se usan
   - Inline styles para layout y colores específicos
   - Seguir el mismo patrón que los componentes existentes

4. **Imports de lucide-react.** Verificar que los íconos usados (`Download`, `Upload`, `FileJson`, `Check`, `Database`, `ArrowUpDown`, `AlertCircle`, `X`, `AlertTriangle`, `CheckCircle`, `ChevronDown`, `ChevronUp`, `Loader`) están disponibles en la versión instalada (`^0.575.0`).

5. **Test de cada fase.** Después de completar cada fase (A, B, C, D), verificar que `npm run dev` compila sin errores antes de continuar.

---

*Archivo: `agent-sessions/2026-04-20_import-export-implementation.md`*  
*Aprobado por: usuario + agente analista*  
*Listo para: ejecución por agente programador*
