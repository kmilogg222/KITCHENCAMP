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
