/**
 * @file bulk.js
 * @description Funciones de batch insert para Supabase.
 * Usan .insert(array) que inserta todos los registros en un solo roundtrip.
 *
 * SOLO se usan desde el módulo IO — el store existente NO se modifica.
 * Reservado para futura optimización de bulk imports.
 */
import { supabase, USE_SUPABASE } from './client';
import {
  storeSupplierToDb,
  storeIngredientToDb,
  storeRecipeToDb,
  storeRecipeIngredientsToDb,
} from './transform';

/**
 * Batch insert de suppliers a Supabase.
 * @param {Object[]} suppliers - Array de suppliers en formato store
 * @param {string} userId - auth.uid()
 * @returns {{ data, error }}
 */
export async function bulkInsertSuppliers(suppliers, userId) {
  if (!USE_SUPABASE || suppliers.length === 0) return { data: null, error: null };
  const rows = suppliers.map(s => storeSupplierToDb(s, userId));
  return supabase.from('suppliers').insert(rows);
}

/**
 * Batch insert de ingredients a Supabase.
 * @param {Object[]} ingredients - Array de ingredients en formato store
 * @param {string} userId - auth.uid()
 * @param {Map} supplierNameMap - Map<supplierName, supplierUUID>
 * @returns {{ data, error }}
 */
export async function bulkInsertIngredients(ingredients, userId, supplierNameMap) {
  if (!USE_SUPABASE || ingredients.length === 0) return { data: null, error: null };
  const rows = ingredients.map(ing => storeIngredientToDb(ing, userId, supplierNameMap));
  return supabase.from('ingredients').insert(rows);
}

/**
 * Batch insert de recipes a Supabase (inserta recipes + recipe_ingredients).
 * @param {Object[]} recipes - Array de recipes en formato store
 * @param {string} userId - auth.uid()
 * @returns {{ data, error }}
 */
export async function bulkInsertRecipes(recipes, userId) {
  if (!USE_SUPABASE || recipes.length === 0) return { data: null, error: null };

  // 1. Insert recipe rows
  const recipeRows = recipes.map(r => storeRecipeToDb(r, userId));
  const { error: recipeError } = await supabase.from('recipes').insert(recipeRows);
  if (recipeError) return { data: null, error: recipeError };

  // 2. Insert recipe_ingredients rows
  const riRows = recipes.flatMap(r =>
    storeRecipeIngredientsToDb(r.id, r.ingredients ?? [], userId)
  );
  if (riRows.length > 0) {
    const { error: riError } = await supabase.from('recipe_ingredients').insert(riRows);
    if (riError) return { data: null, error: riError };
  }

  return { data: recipeRows, error: null };
}
