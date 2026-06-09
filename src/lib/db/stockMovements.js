/**
 * @file stockMovements.js
 * @description CRUD de movimientos de stock en Supabase.
 */
import { supabase } from './client';

/**
 * Inserta un movimiento de stock.
 * @param {{ ingredient_id, qty_base, reason, ref_type?, ref_id? }} mv
 * @param {string} userId
 */
export async function insertStockMovement(mv, userId) {
  const { error } = await supabase
    .from('stock_movements')
    .insert({ ...mv, user_id: userId });
  return { error };
}

/**
 * Elimina todos los movimientos asociados a una referencia (ej. deshacer cocción).
 * @param {'calendar_event'|'purchase_order'} refType
 * @param {string} refId
 */
export async function deleteMovementsByRef(refType, refId) {
  const { error } = await supabase
    .from('stock_movements')
    .delete()
    .eq('ref_type', refType)
    .eq('ref_id', refId);
  return { error };
}
