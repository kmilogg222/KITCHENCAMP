/**
 * @file transform.js
 * @description Funciones de transformación entre la forma de la DB (snake_case, tablas planas)
 * y la forma del store de Zustand (camelCase, objetos anidados).
 *
 * Regla de oro: Las views NO conocen Supabase. Este módulo es el único adaptador.
 */
import { supabase } from './client';

// ── Fetch completo del usuario (hidratación inicial) ──────────────────────────
/**
 * Obtiene todos los datos del usuario autenticado desde Supabase en paralelo
 * y los transforma a la forma exacta que espera el store de Zustand.
 *
 * @returns {Promise<{ suppliers, ingredients, recipes, menus, calendarEvents }>}
 */
export async function fetchAllUserData() {
  const [
    suppliersRes,
    ingredientsRes,
    recipesRes,
    recipeIngredientsRes,
    menusRes,
    menuRecipesRes,
    calendarRes,
  ] = await Promise.all([
    supabase.from('suppliers').select('*'),
    supabase.from('ingredients').select('*'),
    supabase.from('recipes').select('*'),
    supabase.from('recipe_ingredients').select('*'),
    supabase.from('menus').select('*').order('created_at'),
    supabase.from('menu_recipes').select('*').order('position'),
    supabase.from('calendar_events').select('*'),
  ]);

  // Verificar errores en todas las peticiones
  const checks = {
    suppliers: suppliersRes,
    ingredients: ingredientsRes,
    recipes: recipesRes,
    recipe_ingredients: recipeIngredientsRes,
    menus: menusRes,
    menu_recipes: menuRecipesRes,
    calendar_events: calendarRes,
  };
  for (const [key, res] of Object.entries(checks)) {
    if (res.error) throw new Error(`Error fetching ${key}: ${res.error.message}`);
  }

  return transformDbToStoreShape({
    suppliers:         suppliersRes.data,
    ingredients:       ingredientsRes.data,
    recipes:           recipesRes.data,
    recipeIngredients: recipeIngredientsRes.data,
    menus:             menusRes.data,
    menuRecipes:       menuRecipesRes.data,
    calendarEvents:    calendarRes.data,
  });
}

// ── Transformación DB → Store ─────────────────────────────────────────────────
/**
 * Convierte los datos planos de la DB al shape anidado del store de Zustand.
 * Mapea snake_case → camelCase y reconstruye las relaciones.
 *
 * @param {object} raw - Datos crudos de la DB
 * @returns {{ suppliers, ingredients, recipes, menus, calendarEvents }}
 */
export function transformDbToStoreShape({ suppliers, ingredients, recipeIngredients, recipes, menuRecipes, menus, calendarEvents }) {
  // 1. Suppliers: snake_case → camelCase (no tiene campos compuestos)
  const storeSuppliers = suppliers.map(dbSupplierToStore);

  // 2. Ingredients: resolver supplier_id → supplier name para compatibilidad con las views
  const supplierMap = new Map(storeSuppliers.map(s => [s.id, s.name]));
  const storeIngredients = ingredients.map(ing => dbIngredientToStore(ing, supplierMap));

  // 3. Recipes: reconstruir ingredients[] anidado desde recipe_ingredients
  const riByRecipe = groupBy(recipeIngredients, 'recipe_id');
  const ingredientMap = new Map(storeIngredients.map(i => [i.id, i]));
  const storeRecipes = recipes.map(r => dbRecipeToStore(r, riByRecipe[r.id] || [], ingredientMap));

  // 4. Menus: reconstruir recipeIds[] ordenados por position desde menu_recipes
  const mrByMenu = groupBy(menuRecipes, 'menu_id');
  const recipeIdMap = new Map(storeRecipes.map(r => [r.id, r.id]));
  const storeMenus = menus.map(m => dbMenuToStore(m, mrByMenu[m.id] || [], recipeIdMap));

  // 5. CalendarEvents: reconstruir { "YYYY-MM-DD": events[] } desde filas planas
  // Pasamos storeRecipes y storeMenus para reconstruir los objetos completos que CalendarView espera
  const { events: storeCalendarEvents, warnings: calendarWarnings } =
    dbCalendarToStore(calendarEvents, storeRecipes, storeMenus);
  if (calendarWarnings.length > 0) {
    console.warn('[KitchenCamp] Advertencias de integridad en el calendario:', calendarWarnings);
  }

  return {
    suppliers:      storeSuppliers,
    ingredients:    storeIngredients,
    recipes:        storeRecipes,
    menus:          storeMenus,
    calendarEvents: storeCalendarEvents,
  };
}

// ── Mappers individuales DB → Store ──────────────────────────────────────────

export function dbSupplierToStore(s) {
  return {
    id:      s.id,
    name:    s.name,
    contact: s.contact  ?? '',
    email:   s.email    ?? '',
    phone:   s.phone    ?? '',
    color:   s.color    ?? '#6b3fa0',
    notes:   s.notes    ?? '',
  };
}

export function dbIngredientToStore(ing, supplierMap) {
  return {
    id:            ing.id,
    name:          ing.name,
    unit:          ing.unit,
    packSize:      ing.pack_size,
    currentStock:  ing.current_stock,
    minOrder:      ing.min_order,
    supplier:      supplierMap?.get(ing.supplier_id) ?? '',   // name para compatibilidad
    supplierId:    ing.supplier_id,                            // UUID para escritura
    pricePerPack:  ing.price_per_pack,
    substitutable: ing.substitutable,
    substitute:    ing.substitute ?? '',
  };
}

export function dbRecipeToStore(recipe, recipeIngRows, ingredientMap) {
  // Reconstruir ingredients[] anidado  con la forma que espera el store
  const ingredients = recipeIngRows.map(ri => {
    const ref = {
      ingredientId:   ri.ingredient_id,
      inputMode:      ri.input_mode,
    };
    if (ri.input_mode === 'per-person') {
      ref.portionByGroup = ri.portion_by_group ?? { A: 0, B: 0, C: 0 };
    } else {
      ref.quantityForBase = ri.quantity_for_base ?? 0;
    }
    if (ri.waste_pct) ref.wastePct = ri.waste_pct;
    return ref;
  });

  const base = {
    id:          recipe.id,
    name:        recipe.name,
    category:    recipe.category    ?? 'Main Course',
    rating:      recipe.rating      ?? 3,
    image:       recipe.image       ?? '🍽️',
    description: recipe.description ?? '',
    isNew:       recipe.is_new      ?? false,
    ingredients,
  };

  // Solo añadir campos yield si existen
  if (recipe.base_servings)   base.baseServings   = recipe.base_servings;
  if (recipe.portion_factors) base.portionFactors = recipe.portion_factors;

  return base;
}

export function dbMenuToStore(menu, menuRecipeRows, _recipeIdMap) {
  // Ordenar por position y reconstruir recipeIds[]
  const sorted    = [...menuRecipeRows].sort((a, b) => a.position - b.position);
  const recipeIds = sorted.map(mr => mr.recipe_id);

  return {
    id:          menu.id,
    name:        menu.name,
    description: menu.description ?? '',
    image:       menu.image       ?? '🍽️',
    recipeIds,
    createdAt:   menu.created_at?.split('T')[0] ?? '',
  };
}

export function dbCalendarToStore(calendarRows, storeRecipes = [], storeMenus = []) {
  // Reconstruir { "YYYY-MM-DD": CalendarEvent[] }
  // storeRecipes / storeMenus se usan para reconstruir los objetos completos
  // que CalendarView espera (igual que en actualizaciones optimistas).
  const recipeMap = new Map(storeRecipes.map(r => [r.id, r]));
  const menuMap   = new Map(storeMenus.map(m => [m.id, m]));

  const warnings = [];
  const result = {};
  for (const row of calendarRows) {
    const dateKey = row.event_date; // ya viene como "YYYY-MM-DD"
    if (!result[dateKey]) result[dateKey] = [];

    const entry = {
      id:      row.id,
      type:    row.type,
      slotKey: row.slot, // CalendarView usa slotKey, no slot
      note:    row.note ?? '',
    };

    if (row.type === 'recipe') {
      if (row.recipe_id && !recipeMap.has(row.recipe_id)) {
        warnings.push(`Evento en ${dateKey}: recipe_id "${row.recipe_id}" no encontrado — descartado.`);
        continue;
      }
      entry.recipe = recipeMap.get(row.recipe_id);
    } else {
      const menu = menuMap.get(row.menu_id);
      if (row.menu_id && !menu) {
        warnings.push(`Evento en ${dateKey}: menu_id "${row.menu_id}" no encontrado — descartado.`);
        continue;
      }
      entry.menu = menu;
      // Detectar recipeIds huérfanos dentro del menú
      const orphanRids = (menu?.recipeIds ?? []).filter(rid => !recipeMap.has(rid));
      if (orphanRids.length > 0) {
        warnings.push(`Menú "${menu?.name}" en ${dateKey}: recipe IDs [${orphanRids.join(', ')}] no encontrados — omitidos del display.`);
      }
      entry.menuRecipes = (menu?.recipeIds ?? [])
        .map(rid => recipeMap.get(rid))
        .filter(Boolean);
    }

    result[dateKey].push(entry);
  }
  return { events: result, warnings };
}

// ── Mappers Store → DB (para escritura) ──────────────────────────────────────

/**
 * Convierte un supplier del store al formato de inserción en DB.
 * @param {object} supplier - Supplier del store
 * @param {string} userId   - auth.uid() del usuario
 */
export function storeSupplierToDb(supplier, userId) {
  return {
    id:      supplier.id,
    user_id: userId,
    name:    supplier.name,
    contact: supplier.contact ?? '',
    email:   supplier.email   ?? '',
    phone:   supplier.phone   ?? '',
    color:   supplier.color   ?? '#6b3fa0',
    notes:   supplier.notes   ?? '',
  };
}

/**
 * Convierte un ingrediente del store al formato de inserción en DB.
 * Resuelve supplier name → supplier_id usando el mapa de suppliers.
 *
 * @param {object} ingredient  - Ingrediente del store
 * @param {string} userId      - auth.uid() del usuario
 * @param {Map}    supplierMap - Map<supplierName, supplierId>
 */
export function storeIngredientToDb(ingredient, userId, supplierMap) {
  // supplierId puede venir directo (ya tenemos el UUID) o hay que resolverlo por nombre
  const supplierId = ingredient.supplierId
    ?? supplierMap?.get(ingredient.supplier)
    ?? null;

  return {
    id:             ingredient.id,
    user_id:        userId,
    name:           ingredient.name,
    unit:           ingredient.unit,
    pack_size:      ingredient.packSize,
    current_stock:  ingredient.currentStock,
    min_order:      ingredient.minOrder,
    supplier_id:    supplierId,
    price_per_pack: ingredient.pricePerPack,
    substitutable:  ingredient.substitutable ?? false,
    substitute:     ingredient.substitute    ?? '',
  };
}

/**
 * Convierte una receta del store al formato de inserción en DB (solo la fila recipes).
 */
export function storeRecipeToDb(recipe, userId) {
  return {
    id:              recipe.id,
    user_id:         userId,
    name:            recipe.name,
    category:        recipe.category    ?? 'Main Course',
    rating:          recipe.rating      ?? 3,
    image:           recipe.image       ?? '🍽️',
    description:     recipe.description ?? '',
    is_new:          recipe.isNew       ?? false,
    base_servings:   recipe.baseServings   ?? null,
    portion_factors: recipe.portionFactors ?? null,
  };
}

/**
 * Convierte los ingredient refs de una receta al formato de inserción en recipe_ingredients.
 */
export function storeRecipeIngredientsToDb(recipeId, ingredients, userId) {
  return ingredients.map(ref => ({
    recipe_id:        recipeId,
    ingredient_id:    ref.ingredientId,
    user_id:          userId,
    input_mode:       ref.inputMode ?? 'per-person',
    portion_by_group: ref.portionByGroup ?? null,
    quantity_for_base: ref.quantityForBase ?? null,
    waste_pct:        ref.wastePct ?? 0,
  }));
}

/**
 * Convierte los recipeIds de un menu al formato de inserción en menu_recipes.
 */
export function storeMenuRecipesToDb(menuId, recipeIds, userId) {
  return recipeIds.map((recipeId, position) => ({
    menu_id:   menuId,
    recipe_id: recipeId,
    user_id:   userId,
    position,
  }));
}

// ── Utilidades ────────────────────────────────────────────────────────────────

/** Agrupa un array de objetos por el valor de una clave. */
function groupBy(arr, key) {
  return (arr ?? []).reduce((acc, item) => {
    const k = item[key];
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}
