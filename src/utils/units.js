/**
 * @file utils/units.js
 * @description Utilidad de conversión de unidades para KitchenCalc.
 *
 * Soporta tres dimensiones: masa, volumen y conteo.
 * La conversión solo es válida dentro de la misma dimensión.
 * Las porciones del motor de cálculo quedan siempre en la unidad
 * del catálogo (ing.unit) para que calcRequisition no necesite cambios.
 */
import { INGREDIENT_UNITS } from '../constants/theme';

// Dimensión de cada unidad soportada
const UNIT_DIMENSION = {
  g:     'mass',
  kg:    'mass',
  oz:    'mass',
  lb:    'mass',
  '1#':  'mass',
  ml:    'volume',
  L:     'volume',
  gal:   'volume',
  qt:    'volume',
  units: 'count',
};

// Factor de conversión a la unidad base de la dimensión
// masa → g  |  volumen → ml  |  conteo → units
const UNIT_TO_BASE = {
  g:     1,
  kg:    1000,
  oz:    28.3495,
  lb:    453.592,
  '1#':  453.592,
  ml:    1,
  L:     1000,
  gal:   3785.41,
  qt:    946.353,
  units: 1,
};

/** Retorna la dimensión de una unidad, o null si no está reconocida. */
export function getDimension(unit) {
  return UNIT_DIMENSION[unit] ?? null;
}

/** True si ambas unidades pertenecen a la misma dimensión (no nula). */
export function areCompatible(a, b) {
  const da = getDimension(a);
  return da !== null && da === getDimension(b);
}

/**
 * Convierte una cantidad de `fromUnit` a `toUnit`.
 * Retorna null si las unidades no son compatibles (distintas dimensiones).
 */
export function convert(qty, fromUnit, toUnit) {
  if (fromUnit === toUnit) return qty;
  if (!areCompatible(fromUnit, toUnit)) return null;
  return qty * UNIT_TO_BASE[fromUnit] / UNIT_TO_BASE[toUnit];
}

/**
 * Retorna todas las unidades de INGREDIENT_UNITS que son compatibles con `unit`.
 * Útil para poblar selects en la UI (solo mostrar unidades de la misma dimensión).
 */
export function compatibleUnits(unit) {
  const dim = getDimension(unit);
  if (!dim) return INGREDIENT_UNITS;
  return INGREDIENT_UNITS.filter(u => getDimension(u) === dim);
}
