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
