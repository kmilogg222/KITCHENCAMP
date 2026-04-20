# Plan: Sistema de Import / Export — KitchenCalc

**Fecha:** 2026-04-18  
**Tipo:** Diseño de sistema — plan para implementación futura  
**Estado:** 📐 Diseño completo — pendiente ejecución  
**Prioridad:** P1 (alta)

---

## 1. Contexto y Motivación

KitchenCalc almacena datos críticos de producción: ingredientes, proveedores, recetas y menús. En este momento:

- No hay forma de hacer backup fuera de Supabase / localStorage
- No hay forma de migrar datos entre cuentas o cocinas (multi-kitchen es roadmap P3)
- No hay forma de importar catálogos desde Excel/CSV (flujo habitual en cocinas reales)
- El único export existente es el PDF de Purchase Orders (`utils/generatePurchaseOrderPDF.js`)

Este sistema debe ser **flexible y extensible**: agregar una nueva entidad (ej. `staff`) o un nuevo formato (ej. XLSX) debe requerir cambios mínimos y localizados.

---

## 2. Objetivos de Diseño

| Objetivo | Cómo se logra |
|----------|--------------|
| Flexibilidad | Entity Registry — cada entidad registra sus handlers; agregar una nueva entidad = 1 objeto nuevo |
| Escalabilidad | Format Registry — JSON, CSV, XLSX son adaptadores intercambiables |
| Adaptabilidad | Conflict Resolver genérico: skip / overwrite / rename aplican a cualquier entidad |
| Dual-mode | Funciona con `USE_SUPABASE=true` (batch DB) y `false` (localStorage) |
| Sin pérdida de datos | Validación de esquema antes de tocar el store; rollback si algo falla |
| UX consistente | Mismo patrón visual que AuthGate / MigrationBanner (glass card, toasts, estados de loading) |

---

## 3. Arquitectura del Sistema

```
src/
├── lib/
│   ├── db/          (ya existe — Supabase CRUD)
│   └── io/          ← NUEVO módulo
│       ├── index.js         → public API
│       ├── registry.js      → Entity Registry + Format Registry
│       ├── validate.js      → validación de esquema por entidad
│       ├── conflicts.js     → resolución de conflictos (skip/overwrite/rename)
│       ├── idRemap.js       → reasignación de IDs al importar
│       ├── formats/
│       │   ├── json.js      → serialize / deserialize JSON
│       │   └── csv.js       → serialize / deserialize CSV (papaparse)
│       ├── exporters/
│       │   ├── suppliers.js
│       │   ├── ingredients.js
│       │   ├── recipes.js
│       │   ├── menus.js
│       │   └── calendar.js
│       └── importers/
│           ├── suppliers.js
│           ├── ingredients.js
│           ├── recipes.js
│           ├── menus.js
│           └── calendar.js
│
├── views/
│   └── DataPortalView.jsx   ← NUEVO view (lazy-loaded)
│
└── components/
    └── ImportPreviewModal.jsx ← NUEVO componente
```

---

## 4. Entity Registry — Núcleo del Sistema

El registry es el corazón flexible. Cada entidad describe cómo exporta, qué formatos soporta, en qué orden importar, y cómo resolver conflictos.

```javascript
// src/lib/io/registry.js

export const ENTITY_REGISTRY = {
  suppliers: {
    label:       'Suppliers',
    icon:        '🚚',
    storeKey:    'suppliers',           // useStore(s => s.suppliers)
    addAction:   'addSupplier',         // useStore(s => s.addSupplier)
    updateAction:'updateSupplier',
    importOrder: 1,                     // menor número = importar primero (respeta FKs)
    formats:     ['json', 'csv'],
    csvHeaders:  ['name','contact','email','phone','color','notes'],
    required:    ['name'],
    conflictKey: 'name',               // campo para detectar duplicados al importar
  },

  ingredients: {
    label:       'Ingredients',
    icon:        '🥦',
    storeKey:    'ingredients',
    addAction:   'addIngredient',
    updateAction:'updateIngredient',
    importOrder: 2,
    formats:     ['json', 'csv'],
    csvHeaders:  ['name','unit','packSize','currentStock','minOrder','supplier','pricePerPack','substitutable','substitute','wastePct'],
    required:    ['name','unit','packSize'],
    conflictKey: 'name',
  },

  recipes: {
    label:       'Recipes',
    icon:        '📋',
    storeKey:    'recipes',
    addAction:   'addRecipe',
    updateAction:'updateRecipe',
    importOrder: 3,
    formats:     ['json'],             // CSV no soporta la estructura anidada (ingredients[])
    required:    ['name'],
    conflictKey: 'name',
  },

  menus: {
    label:       'Menus',
    icon:        '🍱',
    storeKey:    'menus',
    addAction:   'addMenu',
    updateAction:'updateMenu',
    importOrder: 4,
    formats:     ['json'],
    required:    ['name'],
    conflictKey: 'name',
  },

  calendar: {
    label:       'Calendar Events',
    icon:        '📅',
    storeKey:    'calendarEvents',
    addAction:   'setCalendarEvents',
    importOrder: 5,
    formats:     ['json'],
    required:    [],
    conflictKey: null,                 // no hay conflictos posibles en calendar (se reemplaza por fecha)
  },
};

// Format registry — agregar nuevo formato = nuevo objeto aquí
export const FORMAT_REGISTRY = {
  json: {
    label:       'JSON',
    extension:   '.json',
    mimeType:    'application/json',
    description: 'Backup completo, lossless. Ideal para restaurar datos.',
    supports:    'all',               // todas las entidades
  },
  csv: {
    label:       'CSV',
    extension:   '.csv',
    mimeType:    'text/csv',
    description: 'Tabla plana, compatible con Excel/Sheets. Solo para entidades simples.',
    supports:    ['suppliers', 'ingredients'],
  },
};
```

---

## 5. Módulo `validate.js`

Antes de importar cualquier dato, todos los items pasan por validación. Esto previene que datos malformados corrompan el store o la DB.

```javascript
// src/lib/io/validate.js

/**
 * Valida un array de objetos para una entidad dada.
 * @returns { valid: Object[], invalid: { item, errors }[] }
 */
export function validateEntities(entityKey, items) {
  const def = ENTITY_REGISTRY[entityKey];
  const valid = [];
  const invalid = [];

  for (const item of items) {
    const errors = [];
    
    // Campos requeridos
    for (const field of def.required) {
      if (!item[field] || String(item[field]).trim() === '') {
        errors.push(`Campo requerido faltante: "${field}"`);
      }
    }

    // Validaciones específicas por entidad
    if (entityKey === 'ingredients') {
      if (item.unit && !INGREDIENT_UNITS.includes(item.unit)) {
        errors.push(`Unidad inválida: "${item.unit}". Válidas: ${INGREDIENT_UNITS.join(', ')}`);
      }
      if (item.packSize !== undefined && Number(item.packSize) <= 0) {
        errors.push(`packSize debe ser > 0`);
      }
    }

    if (entityKey === 'recipes') {
      if (item.ingredients && !Array.isArray(item.ingredients)) {
        errors.push(`"ingredients" debe ser un array`);
      }
    }

    errors.length === 0 ? valid.push(item) : invalid.push({ item, errors });
  }

  return { valid, invalid };
}
```

---

## 6. Módulo `idRemap.js`

Al importar datos de otra cuenta o backup, los IDs legacy/UUIDs entran en conflicto con los IDs existentes. Este módulo construye los mapas de traducción respetando las dependencias entre entidades.

```javascript
// src/lib/io/idRemap.js
import { v4 as uuid } from 'uuid';  // ya disponible via @supabase/supabase-js

/**
 * Dado un array de entidades importadas, asigna IDs nuevos
 * y devuelve el map oldId → newId para que las entidades
 * dependientes (recetas → ingredientes, menús → recetas) 
 * puedan actualizar sus referencias.
 */
export function remapIds(items) {
  const idMap = new Map();   // oldId → newId
  const remapped = items.map(item => {
    const newId = uuid();
    idMap.set(item.id, newId);
    return { ...item, id: newId };
  });
  return { remapped, idMap };
}

/**
 * Actualiza las referencias internas de recetas:
 * recipe.ingredients[].ingredientId usa el mapa ingIdMap.
 */
export function remapRecipeRefs(recipes, ingIdMap) {
  return recipes.map(recipe => ({
    ...recipe,
    ingredients: (recipe.ingredients ?? []).map(ref => ({
      ...ref,
      ingredientId: ingIdMap.get(ref.ingredientId) ?? ref.ingredientId,
    })),
  }));
}

/**
 * Actualiza las referencias de menús:
 * menu.recipeIds[] usa el mapa recipeIdMap.
 */
export function remapMenuRefs(menus, recipeIdMap) {
  return menus.map(menu => ({
    ...menu,
    recipeIds: (menu.recipeIds ?? []).map(id => recipeIdMap.get(id) ?? id),
  }));
}

/**
 * Actualiza referencias de eventos de calendario.
 */
export function remapCalendarRefs(calendarEvents, recipeIdMap, menuIdMap) {
  const result = {};
  for (const [date, events] of Object.entries(calendarEvents)) {
    result[date] = events.map(ev => ({
      ...ev,
      ...(ev.type === 'recipe' && { recipe: ev.recipe ? { ...ev.recipe, id: recipeIdMap.get(ev.recipe.id) ?? ev.recipe.id } : ev.recipe }),
      ...(ev.type === 'menu'   && { menu:   ev.menu   ? { ...ev.menu,   id: menuIdMap.get(ev.menu.id)     ?? ev.menu.id   } : ev.menu }),
    }));
  }
  return result;
}
```

---

## 7. Módulo `conflicts.js`

Cuando el usuario importa datos que ya existen (por `conflictKey`, usualmente `name`), se puede elegir:

- **skip** — no importar el duplicado (valor por defecto)
- **overwrite** — reemplazar el existente
- **rename** — importar con sufijo ` (imported)`

```javascript
// src/lib/io/conflicts.js

export const CONFLICT_STRATEGIES = ['skip', 'overwrite', 'rename'];

/**
 * Dado un array de items a importar y los existentes en el store,
 * clasifica cada item según la estrategia elegida.
 * @returns { toAdd, toUpdate, toSkip }
 */
export function resolveConflicts(entityKey, incoming, existing, strategy = 'skip') {
  const def = ENTITY_REGISTRY[entityKey];
  const conflictKey = def.conflictKey;
  
  if (!conflictKey) {
    // Sin conflictKey: todos son nuevos (e.g. calendar)
    return { toAdd: incoming, toUpdate: [], toSkip: [] };
  }

  const existingIndex = new Map(existing.map(e => [e[conflictKey]?.toLowerCase(), e]));
  const toAdd = [], toUpdate = [], toSkip = [];

  for (const item of incoming) {
    const matchKey = item[conflictKey]?.toLowerCase();
    const existingItem = existingIndex.get(matchKey);

    if (!existingItem) {
      toAdd.push(item);                             // no existe → siempre agregar
    } else if (strategy === 'skip') {
      toSkip.push(item);
    } else if (strategy === 'overwrite') {
      toUpdate.push({ ...item, id: existingItem.id }); // usar el ID del existente
    } else if (strategy === 'rename') {
      toAdd.push({ ...item, [conflictKey]: `${item[conflictKey]} (imported)` });
    }
  }

  return { toAdd, toUpdate, toSkip };
}
```

---

## 8. Formatos: JSON y CSV

### 8.1 JSON — Backup completo

```javascript
// src/lib/io/formats/json.js

const CURRENT_VERSION = '1.0';

/**
 * Serializa las entidades seleccionadas a una cadena JSON.
 * @param {Object} storeData — { suppliers, ingredients, recipes, menus, calendarEvents }
 * @param {string[]} entityKeys — qué entidades incluir
 */
export function serializeToJson(storeData, entityKeys) {
  const payload = {
    _meta: {
      version:   CURRENT_VERSION,
      app:       'KitchenCalc',
      exportedAt: new Date().toISOString(),
      entities:   entityKeys,
    },
  };

  for (const key of entityKeys) {
    const def = ENTITY_REGISTRY[key];
    payload[key] = storeData[def.storeKey] ?? {};
  }

  return JSON.stringify(payload, null, 2);
}

/**
 * Deserializa y valida un string JSON exportado.
 * @returns { meta, data, errors }
 */
export function deserializeFromJson(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { meta: null, data: null, errors: ['Archivo JSON inválido — no se pudo parsear'] };
  }

  if (!parsed._meta?.app === 'KitchenCalc') {
    return { meta: null, data: null, errors: ['Este archivo no es un backup de KitchenCalc'] };
  }

  return { meta: parsed._meta, data: parsed, errors: [] };
}
```

### 8.2 CSV — Tablas planas (solo suppliers e ingredients)

```javascript
// src/lib/io/formats/csv.js
// Depende de: papaparse (npm install papaparse)

import Papa from 'papaparse';

export function serializeToCsv(items, entityKey) {
  const def = ENTITY_REGISTRY[entityKey];
  const rows = items.map(item => {
    const row = {};
    for (const header of def.csvHeaders) {
      row[header] = item[header] ?? '';
    }
    return row;
  });
  return Papa.unparse(rows, { header: true });
}

export function deserializeFromCsv(csvString, entityKey) {
  const result = Papa.parse(csvString, { header: true, skipEmptyLines: true, dynamicTyping: true });
  if (result.errors.length > 0) {
    return { data: null, errors: result.errors.map(e => e.message) };
  }
  return { data: result.data, errors: [] };
}
```

---

## 9. Public API — `src/lib/io/index.js`

```javascript
// src/lib/io/index.js
// Punto único de entrada al módulo IO. Las vistas importan solo de aquí.

export { ENTITY_REGISTRY, FORMAT_REGISTRY } from './registry';

// Export orchestrator
export async function exportData({ entityKeys, format, storeData }) {
  // 1. Serializar
  const content = format === 'json'
    ? serializeToJson(storeData, entityKeys)
    : serializeToCsv(storeData[ENTITY_REGISTRY[entityKeys[0]].storeKey], entityKeys[0]);

  // 2. Trigger download
  const ext  = FORMAT_REGISTRY[format].extension;
  const mime = FORMAT_REGISTRY[format].mimeType;
  const name = `KitchenCalc_${entityKeys.join('-')}_${datestamp()}${ext}`;
  triggerDownload(content, name, mime);

  return name;  // para mostrar en toast/banner
}

// Import orchestrator (returns a preview object before committing to store)
export async function previewImport({ fileContent, fileName }) {
  const format = detectFormat(fileName);   // .json → 'json', .csv → 'csv'
  
  let meta, data, errors;

  if (format === 'json') {
    ({ meta, data, errors } = deserializeFromJson(fileContent));
  } else if (format === 'csv') {
    // CSV: entidad inferida desde el nombre del archivo ej. "KitchenCalc_ingredients_*.csv"
    const entityKey = inferEntityFromFilename(fileName);
    ({ data, errors } = deserializeFromCsv(fileContent, entityKey));
    meta = { entities: [entityKey] };
    if (!errors.length) data = { [entityKey]: data };
  }

  if (errors.length) return { ok: false, errors };

  // Validar cada entidad
  const preview = {};
  for (const entityKey of (meta?.entities ?? [])) {
    if (!data[entityKey]) continue;
    const items = Array.isArray(data[entityKey]) ? data[entityKey] : Object.values(data[entityKey]);
    preview[entityKey] = validateEntities(entityKey, items);
  }

  return { ok: true, meta, preview };
}

// Commit import to store (llamado tras confirmación del usuario)
export async function commitImport({ preview, strategy, storeSnapshot, storeActions }) {
  const ordered = Object.keys(preview).sort(
    (a, b) => ENTITY_REGISTRY[a].importOrder - ENTITY_REGISTRY[b].importOrder
  );

  const idMaps = {};  // acumula los idMaps para resolver referencias cruzadas

  for (const entityKey of ordered) {
    const { valid } = preview[entityKey];
    const existing = storeSnapshot[ENTITY_REGISTRY[entityKey].storeKey] ?? [];
    
    // 1. Re-mapear IDs
    const { remapped, idMap } = remapIds(valid);
    idMaps[entityKey] = idMap;

    // 2. Aplicar referencias cruzadas
    let finalItems = remapped;
    if (entityKey === 'recipes')  finalItems = remapRecipeRefs(remapped, idMaps.ingredients);
    if (entityKey === 'menus')    finalItems = remapMenuRefs(remapped, idMaps.recipes);
    if (entityKey === 'calendar') finalItems = remapCalendarRefs(remapped, idMaps.recipes, idMaps.menus);

    // 3. Resolver conflictos
    const { toAdd, toUpdate, toSkip } = resolveConflicts(entityKey, finalItems, existing, strategy);

    // 4. Commit al store (que a su vez sincroniza con Supabase si USE_SUPABASE=true)
    const addAction    = storeActions[ENTITY_REGISTRY[entityKey].addAction];
    const updateAction = storeActions[ENTITY_REGISTRY[entityKey].updateAction];

    for (const item of toAdd)    await addAction?.(item);
    for (const item of toUpdate) await updateAction?.(item);

    // toSkip → no action
  }
}

// Helper: trigger browser file download
function triggerDownload(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function datestamp() {
  return new Date().toISOString().slice(0, 10);
}

function detectFormat(fileName) {
  if (fileName.endsWith('.json')) return 'json';
  if (fileName.endsWith('.csv'))  return 'csv';
  throw new Error(`Formato no soportado: ${fileName}`);
}

function inferEntityFromFilename(fileName) {
  for (const key of Object.keys(ENTITY_REGISTRY)) {
    if (fileName.toLowerCase().includes(key)) return key;
  }
  throw new Error(`No se pudo inferir la entidad desde el nombre del archivo: ${fileName}`);
}
```

---

## 10. UI — `DataPortalView.jsx`

### 10.1 Ubicación y acceso

Nueva ruta lazy-loaded en `App.jsx`:
```jsx
const DataPortalView = React.lazy(() => import('./views/DataPortalView'));
// ...
<Route path="/data" element={<DataPortalView />} />
```

Nueva entrada en `Sidebar.jsx` `navItems`:
```javascript
{ id: 'data', icon: ArrowUpDown, label: 'Data' }  // lucide-react: ArrowUpDown
```

### 10.2 Layout de la vista

```
DataPortalView
├── Header — "Data Portal" + subtitle
│
├── Section: EXPORT
│   ├── Title: "Export your data"
│   ├── Entity selector (grid de checkboxes/cards)
│   │   ├── [✓] Suppliers (6 items)
│   │   ├── [✓] Ingredients (24 items)
│   │   ├── [✓] Recipes (8 items)
│   │   ├── [✓] Menus (3 items)
│   │   └── [ ] Calendar Events (opcional)
│   │
│   ├── Format selector (radio buttons)
│   │   ├── (•) JSON — Backup completo, lossless
│   │   └── ( ) CSV  — Solo Suppliers/Ingredients, compatible con Excel
│   │              (deshabilitado si entidades seleccionadas incluyen recipes/menus)
│   │
│   └── [Export Selected] button (con icono Download)
│
├── Divider
│
└── Section: IMPORT
    ├── Title: "Import data"
    ├── File drop zone (drag & drop + click to browse)
    │   ├── Soporta: .json y .csv
    │   └── Shows file type icons
    │
    ├── (tras seleccionar archivo) ImportPreviewModal se abre →
    │   ver §10.3
    │
    └── Warning note: "Importing will add new items — existing items are not removed"
```

### 10.3 ImportPreviewModal

```
ImportPreviewModal (glass-card, centered, max-width: 560px)
├── Header: "Import Preview" + × close
│
├── Meta info: "KitchenCalc backup — exported 2026-04-18"
│
├── Preview table (por entidad)
│   ├── ✅ Suppliers: 4 to add, 1 duplicate
│   ├── ✅ Ingredients: 12 to add, 0 issues
│   ├── ⚠️  Recipes: 3 to add, 1 invalid (missing name)
│   └── (expandible: mostrar los items inválidos con sus errores)
│
├── Conflict Strategy selector (solo si hay duplicados)
│   ├── ( ) Skip duplicates (Recommended)
│   ├── ( ) Overwrite existing
│   └── ( ) Rename (add " (imported)" suffix)
│
├── Warning: "This will create X new items across Y collections."
│
└── Action buttons
    ├── [Cancel] — ghost button
    └── [Import X items] — primary gradient, con loader state
```

---

## 11. Plan de Implementación por Fases

### Fase A — Núcleo del módulo IO (sin UI)
**Entregables:** `src/lib/io/` completo + tests manuales en consola

1. Crear `registry.js` con `ENTITY_REGISTRY` y `FORMAT_REGISTRY`
2. Crear `validate.js`
3. Crear `idRemap.js`
4. Crear `conflicts.js`
5. Crear `formats/json.js` (sin dependencias externas)
6. Crear `index.js` con `exportData`, `previewImport`, `commitImport`
7. Test: abrir consola en la app → importar `{ exportData, previewImport }` → exportar ingredientes a JSON → verificar estructura

### Fase B — Export funcional
**Entregables:** Botón de export en `DataPortalView` + descarga de archivo

1. Crear `DataPortalView.jsx` (solo sección Export)
2. Agregar ruta `/data` en `App.jsx` (lazy)
3. Agregar item `data` en `Sidebar.jsx`
4. Conectar botón "Export" a `exportData()` → browser download
5. Toast de confirmación: "KitchenCalc_all_2026-04-18.json exported"

### Fase C — CSV (opcional, solo suppliers/ingredients)
**Entregables:** Export CSV funcional para las 2 entidades planas

1. Instalar `papaparse` (`npm install papaparse`)
2. Crear `formats/csv.js`
3. Habilitar opción CSV en DataPortalView (desactivar si se seleccionan recipes/menus)
4. Test: exportar ingredients → abrir en Excel → verificar columnas

### Fase D — Import con Preview
**Entregables:** Drop zone + `ImportPreviewModal` + commit al store

1. Crear `ImportPreviewModal.jsx`
2. Agregar drop zone en `DataPortalView`
3. Conectar a `previewImport()` → renderizar preview
4. Conectar botón "Import" a `commitImport()` con la estrategia seleccionada
5. Toast de éxito/error al finalizar
6. Test completo: export JSON → cerrar sesión → nueva sesión → import → verificar datos

---

## 12. Dependencias Nuevas

| Package | Versión | Uso | ¿Necesaria? |
|---------|---------|-----|-------------|
| `papaparse` | `^5.x` | Parse/serialize CSV | Solo si se implementa Fase C |

> `uuid` ya está disponible como dependencia transitiva de `@supabase/supabase-js`.  
> No se necesita `xlsx`, `file-saver` ni `jszip` en el alcance inicial.

---

## 13. Consideraciones de Seguridad

| Riesgo | Mitigación |
|--------|-----------|
| Importar archivo malicioso | `deserializeFromJson` valida `_meta.app === 'KitchenCalc'` antes de procesar; `validateEntities` filtra campos inesperados |
| Inyección via nombre de archivo CSV | `inferEntityFromFilename` solo compara contra claves de `ENTITY_REGISTRY` |
| Sobreescritura accidental de todos los datos | Estrategia `skip` es la default; modal muestra preview antes de commitear |
| XSS via datos importados | React escapa por defecto; no se usa `dangerouslySetInnerHTML` |
| IDs en conflicto con DB | `remapIds` genera UUIDs nuevos para todos los items importados |

---

## 14. Extensibilidad — Cómo agregar nuevas entidades o formatos

### Agregar entidad `staff` en el futuro

1. Agregar objeto en `ENTITY_REGISTRY` en `registry.js`:
   ```javascript
   staff: {
     label: 'Staff Members',
     icon: '👤',
     storeKey: 'staff',
     addAction: 'addStaff',
     updateAction: 'updateStaff',
     importOrder: 6,
     formats: ['json', 'csv'],
     csvHeaders: ['name', 'role', 'email', 'phone'],
     required: ['name'],
     conflictKey: 'name',
   }
   ```
2. El resto del sistema (validación, export, import, UI) lo detecta automáticamente.

### Agregar formato XLSX

1. Instalar `xlsx`
2. Crear `formats/xlsx.js` con `serializeToXlsx` / `deserializeFromXlsx`
3. Agregar entrada en `FORMAT_REGISTRY`
4. El selector de formato en DataPortalView lo muestra automáticamente

---

## 15. Archivos a Crear / Modificar

| Archivo | Acción | Notas |
|---------|--------|-------|
| `src/lib/io/registry.js` | Crear | Núcleo del sistema |
| `src/lib/io/validate.js` | Crear | |
| `src/lib/io/idRemap.js` | Crear | |
| `src/lib/io/conflicts.js` | Crear | |
| `src/lib/io/formats/json.js` | Crear | Sin dependencias externas |
| `src/lib/io/formats/csv.js` | Crear | Requiere papaparse |
| `src/lib/io/index.js` | Crear | Public API |
| `src/views/DataPortalView.jsx` | Crear | Nueva vista lazy-loaded |
| `src/components/ImportPreviewModal.jsx` | Crear | |
| `src/App.jsx` | Modificar | + ruta `/data` |
| `src/components/Sidebar.jsx` | Modificar | + item `data` |
| `package.json` | Modificar | + `papaparse` (solo si Fase C) |

---

## 16. Verificación End-to-End

1. `/data` es accesible desde la sidebar con icono `ArrowUpDown`
2. **Export JSON (all):** Seleccionar todas las entidades → formato JSON → click Export → archivo `KitchenCalc_all_2026-04-18.json` descargado → abrir en editor → verificar `_meta.app`, datos de todas las entidades
3. **Export CSV (ingredients):** Seleccionar solo Ingredients → formato CSV → click Export → abrir en Excel → verificar columnas y tipos
4. **Import JSON:** Drag & drop el archivo exportado → Preview modal aparece → muestra conteos correctos → Conflict Strategy en "skip" → click "Import" → toast "X items imported" → verificar en Inventory, Recipes, Menus
5. **Import con conflicto "overwrite":** Editar un supplier en la app → importar el backup anterior → verificar que el supplier vuelve al estado original
6. **Import CSV:** Crear CSV de ingredientes manualmente → importar → verificar que aparecen en Inventory
7. **Modo localStorage (USE_SUPABASE=false):** Repetir tests 2, 4 y 6 sin credenciales de Supabase — debe funcionar igual

---

*Archivo guardado: `agent-sessions/2026-04-18_import-export-system-plan.md`*  
*Referencia: `DEVELOPMENT_TRACKER.md` → Backlog P1 (agregar entry cuando se implemente)*
