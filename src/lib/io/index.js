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
