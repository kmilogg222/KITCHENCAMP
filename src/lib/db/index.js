/**
 * @file index.js
 * @description Re-exports públicos del módulo de base de datos.
 * Los consumers importan desde '../lib/db' (no de los módulos internos).
 */

// ── Cliente y feature flag ────────────────────────────────────────────────────
export { supabase, USE_SUPABASE } from './client';

// ── Fetch + transform ─────────────────────────────────────────────────────────
export { fetchAllUserData } from './transform';

// ── Suppliers ─────────────────────────────────────────────────────────────────
export { insertSupplier, updateSupplierInDb, deleteSupplierFromDb } from './suppliers';

// ── Ingredients ───────────────────────────────────────────────────────────────
export {
  insertIngredient,
  updateIngredientInDb,
  deleteIngredientFromDb,
  updateStockInDb,
} from './ingredients';

// ── Recipes ───────────────────────────────────────────────────────────────────
export {
  insertRecipeWithIngredients,
  updateRecipeWithIngredients,
  deleteRecipeFromDb,
} from './recipes';

// ── Menus ─────────────────────────────────────────────────────────────────────
export {
  insertMenuWithRecipes,
  updateMenuWithRecipes,
  deleteMenuFromDb,
} from './menus';

// ── Calendar ──────────────────────────────────────────────────────────────────
export {
  insertCalendarEvent,
  setCalendarEventsForDate,
  deleteCalendarEventFromDb,
} from './calendar';

// ── Migración ─────────────────────────────────────────────────────────────────
export { migrateLocalDataToDb, isUserDbEmpty, hasLocalData } from './migration';

// ── Utilidades de error ───────────────────────────────────────────────────────
export { mapSupabaseError } from './errors';

// ── Bulk Operations (para Import) ─────────────────────────────────────────────
export {
  bulkInsertSuppliers,
  bulkInsertIngredients,
  bulkInsertRecipes,
} from './bulk';
