/**
 * @file migration.js
 * @description Migración de datos desde localStorage → Supabase.
 * Se ejecuta UNA sola vez cuando el usuario decide mover sus datos locales a la nube.
 *
 * Orden obligatorio de inserción (por FKs):
 *   1. suppliers         (sin FKs de datos)
 *   2. ingredients       (FK → suppliers)
 *   3. recipes           (sin FK a datos del usuario)
 *   4. recipe_ingredients (FK → recipes, ingredients)
 *   5. menus             (sin FK a datos del usuario)
 *   6. menu_recipes      (FK → menus, recipes)
 *   7. calendar_events   (FK → recipes/menus)
 */
import { supabase } from './client';
import { storeRecipeIngredientsToDb } from './transform';

/**
 * Migra todos los datos de localStorage al usuario autenticado en Supabase.
 * @param {string} userId - auth.uid() del usuario actual
 * @returns {Promise<{ success: boolean, error: string|null }>}
 */
export async function migrateLocalDataToDb(userId) {
  try {
    const raw = localStorage.getItem('kitchencalc-store');
    if (!raw) return { success: false, error: 'No local data found' };

    const parsed = JSON.parse(raw);
    const state  = parsed?.state;
    if (!state)  return { success: false, error: 'Invalid local store format' };

    const { suppliers = [], ingredients = [], recipes = [], menus = [], calendarEvents = {} } = state;

    // ── 1. Suppliers ────────────────────────────────────────────────────────
    // Mapa de id/name legacy → UUID nuevo (los IDs legacy son nombres: 'SISCO')
    const supplierIdMap = new Map(); // legacyId → newUUID

    if (suppliers.length > 0) {
      const supplierRows = suppliers.map(s => ({
        user_id: userId,
        name:    s.name,
        contact: s.contact ?? '',
        email:   s.email   ?? '',
        phone:   s.phone   ?? '',
        color:   s.color   ?? '#6b3fa0',
        notes:   s.notes   ?? '',
      }));

      const { data: insertedSuppliers, error } = await supabase
        .from('suppliers')
        .insert(supplierRows)
        .select();

      if (error) throw new Error(`Suppliers: ${error.message}`);

      // Construir map: por name (ya que los IDs legacy son nombres o strings no-UUID)
      insertedSuppliers.forEach((ins, i) => {
        const legacy = suppliers[i];
        supplierIdMap.set(legacy.id,   ins.id); // por id ('SISCO' → uuid)
        supplierIdMap.set(legacy.name, ins.id); // por name también
      });
    }

    // ── 2. Ingredients ──────────────────────────────────────────────────────
    // Mapa de id legacy ('ing-001') → UUID nuevo
    const ingredientIdMap = new Map();

    if (ingredients.length > 0) {
      const ingredientRows = ingredients.map(ing => ({
        user_id:        userId,
        name:           ing.name,
        unit:           ing.unit,
        pack_size:      ing.packSize,
        current_stock:  ing.currentStock,
        min_order:      ing.minOrder,
        // Resolver supplier name → UUID
        supplier_id:    supplierIdMap.get(ing.supplier) ?? null,
        price_per_pack: ing.pricePerPack,
        substitutable:  ing.substitutable ?? false,
        substitute:     ing.substitute    ?? '',
      }));

      const { data: insertedIngredients, error } = await supabase
        .from('ingredients')
        .insert(ingredientRows)
        .select();

      if (error) throw new Error(`Ingredients: ${error.message}`);

      insertedIngredients.forEach((ins, i) => {
        ingredientIdMap.set(ingredients[i].id, ins.id);
      });
    }

    // ── 3. Recipes ──────────────────────────────────────────────────────────
    const recipeIdMap = new Map(); // legacyId (int o string) → UUID nuevo

    if (recipes.length > 0) {
      const recipeRows = recipes.map(r => ({
        user_id:         userId,
        name:            r.name,
        category:        r.category    ?? 'Main Course',
        rating:          r.rating      ?? 3,
        image:           r.image       ?? '🍽️',
        description:     r.description ?? '',
        is_new:          r.isNew       ?? false,
        base_servings:   r.baseServings   ?? null,
        portion_factors: r.portionFactors ?? null,
      }));

      const { data: insertedRecipes, error } = await supabase
        .from('recipes')
        .insert(recipeRows)
        .select();

      if (error) throw new Error(`Recipes: ${error.message}`);

      insertedRecipes.forEach((ins, i) => {
        recipeIdMap.set(recipes[i].id, ins.id);
        // También mapear como string por si acaso
        recipeIdMap.set(String(recipes[i].id), ins.id);
      });
    }

    // ── 4. Recipe Ingredients ───────────────────────────────────────────────
    const allRecipeIngRows = [];
    for (const recipe of recipes) {
      const newRecipeId = recipeIdMap.get(recipe.id);
      if (!newRecipeId || !recipe.ingredients?.length) continue;

      for (const ref of recipe.ingredients) {
        const newIngId = ingredientIdMap.get(ref.ingredientId);
        if (!newIngId) continue; // ingrediente no migrado

        allRecipeIngRows.push({
          user_id:           userId,
          recipe_id:         newRecipeId,
          ingredient_id:     newIngId,
          input_mode:        ref.inputMode ?? 'per-person',
          portion_by_group:  ref.portionByGroup ?? null,
          quantity_for_base: ref.quantityForBase ?? null,
          waste_pct:         ref.wastePct ?? 0,
        });
      }
    }

    if (allRecipeIngRows.length > 0) {
      const { error } = await supabase.from('recipe_ingredients').insert(allRecipeIngRows);
      if (error) throw new Error(`Recipe ingredients: ${error.message}`);
    }

    // ── 5. Menus ────────────────────────────────────────────────────────────
    const menuIdMap = new Map();

    if (menus.length > 0) {
      const menuRows = menus.map(m => ({
        user_id:     userId,
        name:        m.name,
        description: m.description ?? '',
        image:       m.image       ?? '🍽️',
      }));

      const { data: insertedMenus, error } = await supabase
        .from('menus')
        .insert(menuRows)
        .select();

      if (error) throw new Error(`Menus: ${error.message}`);

      insertedMenus.forEach((ins, i) => {
        menuIdMap.set(menus[i].id, ins.id);
      });
    }

    // ── 6. Menu Recipes ─────────────────────────────────────────────────────
    const allMenuRecipeRows = [];
    for (const menu of menus) {
      const newMenuId = menuIdMap.get(menu.id);
      if (!newMenuId || !menu.recipeIds?.length) continue;

      menu.recipeIds.forEach((rId, position) => {
        const newRecipeId = recipeIdMap.get(rId) ?? recipeIdMap.get(String(rId));
        if (!newRecipeId) return;
        allMenuRecipeRows.push({
          user_id:   userId,
          menu_id:   newMenuId,
          recipe_id: newRecipeId,
          position,
        });
      });
    }

    if (allMenuRecipeRows.length > 0) {
      const { error } = await supabase.from('menu_recipes').insert(allMenuRecipeRows);
      if (error) throw new Error(`Menu recipes: ${error.message}`);
    }

    // ── 7. Calendar Events ──────────────────────────────────────────────────
    const calendarRows = [];
    for (const [dateKey, events] of Object.entries(calendarEvents)) {
      for (const ev of (events || [])) {
        let recipeId = null;
        let menuId   = null;

        if (ev.type === 'recipe') {
          recipeId = recipeIdMap.get(ev.itemId) ?? recipeIdMap.get(String(ev.itemId));
        } else if (ev.type === 'menu') {
          menuId = menuIdMap.get(ev.itemId);
        }

        // Solo insertar si pudimos resolver el item
        if (!recipeId && !menuId) continue;

        calendarRows.push({
          user_id:    userId,
          event_date: dateKey,
          slot:       ev.slot,
          type:       ev.type,
          recipe_id:  recipeId,
          menu_id:    menuId,
          note:       ev.note ?? '',
        });
      }
    }

    if (calendarRows.length > 0) {
      const { error } = await supabase.from('calendar_events').insert(calendarRows);
      if (error) throw new Error(`Calendar events: ${error.message}`);
    }

    // ── Limpiar localStorage después de migrar ──────────────────────────────
    localStorage.removeItem('kitchencalc-store');

    return { success: true, error: null };

  } catch (err) {
    console.error('[migrateLocalDataToDb]', err);
    return { success: false, error: err.message };
  }
}

/**
 * Verifica si el usuario ya tiene datos en Supabase (para decidir si mostrar el banner).
 * @param {string} userId
 * @returns {Promise<boolean>} true si la DB está vacía para este usuario
 */
export async function isUserDbEmpty(userId) {
  const { count } = await supabase
    .from('ingredients')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return (count ?? 0) === 0;
}

/**
 * Verifica si hay datos en localStorage del store de KitchenCalc.
 * @returns {boolean}
 */
export function hasLocalData() {
  try {
    const raw = localStorage.getItem('kitchencalc-store');
    if (!raw) return false;
    const state = JSON.parse(raw)?.state;
    return (state?.ingredients?.length > 0 || state?.recipes?.length > 0);
  } catch {
    return false;
  }
}
