/**
 * @file idRemap.js
 * @description Reasignación de IDs al importar datos de otra cuenta o backup.
 *
 * Al importar, los IDs originales pueden colisionar con los IDs existentes.
 * Este módulo genera UUIDs nuevos y construye mapas de traducción (oldId → newId)
 * para que las entidades dependientes actualicen sus referencias.
 *
 * Usa crypto.randomUUID() nativo — sin dependencias externas.
 */

/**
 * Dado un array de entidades importadas, asigna IDs nuevos
 * y devuelve el map oldId → newId.
 * @param {Object[]} items - Items a remapear
 * @returns {{ remapped: Object[], idMap: Map<string, string> }}
 */
export function remapIds(items) {
  const idMap = new Map();
  const remapped = items.map(item => {
    const newId = crypto.randomUUID();
    if (item.id) idMap.set(item.id, newId);
    return { ...item, id: newId };
  });
  return { remapped, idMap };
}

/**
 * Actualiza recipe.ingredients[].ingredientId usando el mapa de IDs de ingredientes.
 * @param {Object[]} recipes - Recetas con IDs ya remapeados
 * @param {Map<string, string>} ingIdMap - Mapa oldIngId → newIngId
 * @returns {Object[]}
 */
export function remapRecipeRefs(recipes, ingIdMap) {
  if (!ingIdMap || ingIdMap.size === 0) return recipes;
  return recipes.map(recipe => ({
    ...recipe,
    ingredients: (recipe.ingredients ?? []).map(ref => ({
      ...ref,
      ingredientId: ingIdMap.get(ref.ingredientId) ?? ref.ingredientId,
    })),
  }));
}

/**
 * Actualiza menu.recipeIds[] usando el mapa de IDs de recetas.
 * @param {Object[]} menus - Menús con IDs ya remapeados
 * @param {Map<string, string>} recipeIdMap - Mapa oldRecipeId → newRecipeId
 * @returns {Object[]}
 */
export function remapMenuRefs(menus, recipeIdMap) {
  if (!recipeIdMap || recipeIdMap.size === 0) return menus;
  return menus.map(menu => ({
    ...menu,
    recipeIds: (menu.recipeIds ?? []).map(id => recipeIdMap.get(id) ?? id),
  }));
}

/**
 * Actualiza referencias dentro de eventos de calendario.
 * calendarEvents es un Object { "YYYY-MM-DD": events[] }, NO un array.
 * @param {Object} calendarEvents - Diccionario date → events[]
 * @param {Map<string, string>} recipeIdMap
 * @param {Map<string, string>} menuIdMap
 * @returns {Object}
 */
export function remapCalendarRefs(calendarEvents, recipeIdMap, menuIdMap) {
  if (!calendarEvents || typeof calendarEvents !== 'object') return {};
  const result = {};
  for (const [date, events] of Object.entries(calendarEvents)) {
    if (!Array.isArray(events)) continue;
    result[date] = events.map(ev => {
      const remapped = { ...ev, id: crypto.randomUUID() };
      if (ev.type === 'recipe' && ev.recipe) {
        const newRecipeId = recipeIdMap?.get(ev.recipe.id) ?? ev.recipe.id;
        remapped.recipe = { ...ev.recipe, id: newRecipeId };
      }
      if (ev.type === 'menu' && ev.menu) {
        const newMenuId = menuIdMap?.get(ev.menu.id) ?? ev.menu.id;
        remapped.menu = { ...ev.menu, id: newMenuId };
        // También remapear menuRecipes si existen
        if (Array.isArray(ev.menuRecipes)) {
          remapped.menuRecipes = ev.menuRecipes.map(r => ({
            ...r,
            id: recipeIdMap?.get(r.id) ?? r.id,
          }));
        }
      }
      return remapped;
    });
  }
  return result;
}
