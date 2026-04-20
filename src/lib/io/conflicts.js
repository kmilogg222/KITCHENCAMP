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
