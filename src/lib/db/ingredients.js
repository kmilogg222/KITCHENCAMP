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

export async function updateStockInDb(ingredientId, newStock) {
  const { error } = await supabase
    .from('ingredients')
    .update({ current_stock: newStock })
    .eq('id', ingredientId);
  return { error };
}
