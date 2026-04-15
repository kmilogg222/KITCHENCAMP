/**
 * @file recipes.js
 * @description CRUD de recipes en Supabase.
 * Las recetas afectan DOS tablas: recipes + recipe_ingredients.
 * Se usan transacciones implícitas: si falla el insert de recipe_ingredients,
 * se borra la recipe creada (rollback manual).
 */
import { supabase } from './client';
import { storeRecipeToDb, storeRecipeIngredientsToDb } from './transform';

/**
 * Inserta una receta completa: fila en recipes + filas en recipe_ingredients.
 * @param {object} recipe  - Recipe del store (con ingredients[])
 * @param {string} userId  - auth.uid()
 */
export async function insertRecipeWithIngredients(recipe, userId) {
  // 1. Insertar la receta
  const { data: recipeData, error: recipeError } = await supabase
    .from('recipes')
    .insert(storeRecipeToDb(recipe, userId))
    .select()
    .single();

  if (recipeError) return { data: null, error: recipeError };

  // 2. Insertar los ingredient refs (si los hay)
  if (recipe.ingredients?.length > 0) {
    const riRows = storeRecipeIngredientsToDb(recipeData.id, recipe.ingredients, userId);
    const { error: riError } = await supabase
      .from('recipe_ingredients')
      .insert(riRows);

    if (riError) {
      // Rollback: borrar la receta recién creada
      await supabase.from('recipes').delete().eq('id', recipeData.id);
      return { data: null, error: riError };
    }
  }

  return { data: recipeData, error: null };
}

/**
 * Actualiza una receta: reemplaza la fila en recipes + borra y re-inserta recipe_ingredients.
 */
export async function updateRecipeWithIngredients(recipe, userId) {
  const { id, ...recipeRow } = storeRecipeToDb(recipe, userId);

  // 1. Actualizar la receta base
  const { data: recipeData, error: recipeError } = await supabase
    .from('recipes')
    .update(recipeRow)
    .eq('id', id)
    .select()
    .single();

  if (recipeError) return { data: null, error: recipeError };

  // 2. Reemplazar recipe_ingredients: DELETE all + INSERT new
  const { error: deleteError } = await supabase
    .from('recipe_ingredients')
    .delete()
    .eq('recipe_id', id);

  if (deleteError) return { data: null, error: deleteError };

  if (recipe.ingredients?.length > 0) {
    const riRows = storeRecipeIngredientsToDb(id, recipe.ingredients, userId);
    const { error: riError } = await supabase
      .from('recipe_ingredients')
      .insert(riRows);
    if (riError) return { data: null, error: riError };
  }

  return { data: recipeData, error: null };
}

/**
 * Elimina una receta. Los recipe_ingredients se borran automáticamente por CASCADE.
 */
export async function deleteRecipeFromDb(id) {
  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', id);
  return { error };
}
