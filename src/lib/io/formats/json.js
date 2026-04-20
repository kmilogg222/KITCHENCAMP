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
