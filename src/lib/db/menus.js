/**
 * @file menus.js
 * @description CRUD de menus en Supabase.
 * Los menus afectan DOS tablas: menus + menu_recipes.
 */
import { supabase } from './client';

function menuToDb(menu, userId) {
  return {
    id:          menu.id,
    user_id:     userId,
    name:        menu.name,
    description: menu.description ?? '',
    image:       menu.image       ?? '🍽️',
  };
}

function menuRecipesToDb(menuId, recipeIds, userId) {
  return recipeIds.map((recipeId, position) => ({
    menu_id:   menuId,
    recipe_id: recipeId,
    user_id:   userId,
    position,
  }));
}

export async function insertMenuWithRecipes(menu, userId) {
  const { data: menuData, error: menuError } = await supabase
    .from('menus')
    .insert(menuToDb(menu, userId))
    .select()
    .single();

  if (menuError) return { data: null, error: menuError };

  if (menu.recipeIds?.length > 0) {
    const mrRows = menuRecipesToDb(menuData.id, menu.recipeIds, userId);
    const { error: mrError } = await supabase
      .from('menu_recipes')
      .insert(mrRows);

    if (mrError) {
      await supabase.from('menus').delete().eq('id', menuData.id);
      return { data: null, error: mrError };
    }
  }

  return { data: menuData, error: null };
}

export async function updateMenuWithRecipes(menu, userId) {
  const { id, ...menuRow } = menuToDb(menu, userId);

  const { data: menuData, error: menuError } = await supabase
    .from('menus')
    .update(menuRow)
    .eq('id', id)
    .select()
    .single();

  if (menuError) return { data: null, error: menuError };

  // Reemplazar menu_recipes
  await supabase.from('menu_recipes').delete().eq('menu_id', id);

  if (menu.recipeIds?.length > 0) {
    const mrRows = menuRecipesToDb(id, menu.recipeIds, userId);
    const { error: mrError } = await supabase
      .from('menu_recipes')
      .insert(mrRows);
    if (mrError) return { data: null, error: mrError };
  }

  return { data: menuData, error: null };
}

export async function deleteMenuFromDb(id) {
  const { error } = await supabase
    .from('menus')
    .delete()
    .eq('id', id);
  return { error };
}
