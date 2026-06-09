/**
 * @file ingredients.js
 * @description CRUD de ingredients en Supabase.
 */
import { supabase } from './client';
import { storeIngredientToDb } from './transform';

export async function insertIngredient(ingredient, userId, supplierMap) {
  const { data, error } = await supabase
    .from('ingredients')
    .insert(storeIngredientToDb(ingredient, userId, supplierMap))
    .select()
    .single();
  return { data, error };
}

export async function updateIngredientInDb(ingredient, userId, supplierMap) {
  const { id, ...rest } = storeIngredientToDb(ingredient, userId, supplierMap);
  const { data, error } = await supabase
    .from('ingredients')
    .update(rest)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteIngredientFromDb(id) {
  const { error } = await supabase
    .from('ingredients')
    .delete()
    .eq('id', id);
  return { error };
}

/**
 * Actualiza el stock de un ingrediente.
 * @param {string} ingredientId
 * @param {number} newStockQty - Cantidad en unidad base (g, ml, units, etc.)
 * @param {number} [packSize]  - Tamaño de pack para derivar current_stock legacy
 */
export async function updateStockInDb(ingredientId, newStockQty, packSize) {
  const update = { stock_qty: newStockQty };
  if (packSize && packSize > 0) {
    update.current_stock = Math.round(newStockQty / packSize);
  }
  const { error } = await supabase
    .from('ingredients')
    .update(update)
    .eq('id', ingredientId);
  return { error };
}
