/**
 * @file useStore.js
 * @description Store global de Zustand para KitchenCalc.
 *
 * Cuando USE_SUPABASE = true:
 *   - El store no usa `persist` (los datos vienen de Supabase al login)
 *   - Las acciones async persisten en Supabase + actualizan el estado local
 * Cuando USE_SUPABASE = false:
 *   - Comportamiento original: persist middleware + localStorage
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ingredientsCatalog, recipes, menus, suppliers } from '../data/mockData';
import { USE_SUPABASE } from '../lib/db/client';

// ── Importaciones de DB (solo se usan cuando USE_SUPABASE = true) ─────────────
import {
  insertSupplier, updateSupplierInDb, deleteSupplierFromDb,
  insertIngredient, updateIngredientInDb, deleteIngredientFromDb, updateStockInDb,
  insertRecipeWithIngredients, updateRecipeWithIngredients, deleteRecipeFromDb,
  insertMenuWithRecipes, updateMenuWithRecipes, deleteMenuFromDb,
  setCalendarEventsForDate,
  mapSupabaseError,
} from '../lib/db';

// ── Helper: obtener userId del contexto (se inyecta en hydrate) ───────────────
let _currentUserId = null;
export function setCurrentUserId(id) { _currentUserId = id; }

// ── Helper: obtener mapa supplier name→id desde el store ─────────────────────
function getSupplierNameToIdMap(suppliers) {
  return new Map(suppliers.map(s => [s.name, s.id]));
}

// ── Debounce map para actualizaciones de stock (ingredientId → timer handle) ──
const _stockDebounceTimers = new Map();

// ── Creador del store ─────────────────────────────────────────────────────────
const storeCreator = (set, get) => ({
  // ── Estado ────────────────────────────────────────────────────────────────
  ingredients:    USE_SUPABASE ? [] : ingredientsCatalog,
  recipes:        USE_SUPABASE ? [] : recipes,
  menus:          USE_SUPABASE ? [] : menus,
  suppliers:      USE_SUPABASE ? [] : suppliers,
  cart:           [],
  calendarEvents: {},

  // ── Estado de hidratación ─────────────────────────────────────────────────
  isHydrating:    false,  // no bloquea la UI — datos se llenan en background
  hydrationError: null,

  // ── Toasts (notificaciones) ───────────────────────────────────────────────
  toasts: [],
  addToast: (toast) => {
    const MAX_TOASTS = 5;
    const id = `toast-${Date.now()}`;
    set(state => {
      // Deduplicar: ignorar si el último toast tiene el mismo mensaje y tipo
      const last = state.toasts[state.toasts.length - 1];
      if (last?.message === toast.message && last?.type === toast.type) return {};
      const updated = [...state.toasts, { ...toast, id }];
      return { toasts: updated.slice(-MAX_TOASTS) };
    });
    setTimeout(() => {
      set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 5000);
  },
  removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),

  // ── Hydrate desde Supabase ────────────────────────────────────────────────
  hydrate: (data) => set({
    ingredients:    data.ingredients,
    recipes:        data.recipes,
    menus:          data.menus,
    suppliers:      data.suppliers,
    calendarEvents: data.calendarEvents ?? {},
    isHydrating:    false,
    hydrationError: null,
  }),
  setHydrationError: (error) => set({ isHydrating: false, hydrationError: error }),
  setHydrating: (val) => set({ isHydrating: val }),

  // ── Suppliers ─────────────────────────────────────────────────────────────
  addSupplier: async (supplier) => {
    if (!USE_SUPABASE) {
      set(state => ({ suppliers: [...state.suppliers, supplier] }));
      return;
    }
    set(state => ({ suppliers: [...state.suppliers, supplier] }));
    const { data, error } = await insertSupplier(supplier, _currentUserId);
    if (error) {
      set(state => ({ suppliers: state.suppliers.filter(s => s.id !== supplier.id) }));
      get().addToast({ type: 'error', message: `No se pudo guardar el proveedor: ${mapSupabaseError(error)}` });
    } else if (data && data.id !== supplier.id) {
      set(state => ({ suppliers: state.suppliers.map(s => s.id === supplier.id ? { ...s, id: data.id } : s) }));
    }
  },

  updateSupplier: async (updatedSupplier) => {
    if (!USE_SUPABASE) {
      set(state => ({ suppliers: state.suppliers.map(s => s.id === updatedSupplier.id ? updatedSupplier : s) }));
      return;
    }
    const prev = get().suppliers.find(s => s.id === updatedSupplier.id);
    set(state => ({ suppliers: state.suppliers.map(s => s.id === updatedSupplier.id ? updatedSupplier : s) }));
    const { error } = await updateSupplierInDb(updatedSupplier, _currentUserId);
    if (error) {
      set(state => ({ suppliers: state.suppliers.map(s => s.id === updatedSupplier.id ? prev : s) }));
      get().addToast({ type: 'error', message: `No se pudo actualizar el proveedor: ${mapSupabaseError(error)}` });
    }
  },

  deleteSupplier: async (id) => {
    if (!USE_SUPABASE) {
      set(state => ({ suppliers: state.suppliers.filter(s => s.id !== id) }));
      return;
    }
    const prev = get().suppliers;
    set(state => ({ suppliers: state.suppliers.filter(s => s.id !== id) }));
    const { error } = await deleteSupplierFromDb(id);
    if (error) {
      set({ suppliers: prev });
      get().addToast({ type: 'error', message: `No se pudo eliminar el proveedor: ${mapSupabaseError(error)}` });
    }
  },

  // ── Ingredients ───────────────────────────────────────────────────────────
  addIngredient: async (ing) => {
    if (!USE_SUPABASE) {
      set(state => ({ ingredients: [...state.ingredients, ing] }));
      return;
    }
    set(state => ({ ingredients: [...state.ingredients, ing] }));
    const supplierMap = getSupplierNameToIdMap(get().suppliers);
    const { data, error } = await insertIngredient(ing, _currentUserId, supplierMap);
    if (error) {
      set(state => ({ ingredients: state.ingredients.filter(i => i.id !== ing.id) }));
      get().addToast({ type: 'error', message: `No se pudo guardar el ingrediente: ${mapSupabaseError(error)}` });
    } else if (data && data.id !== ing.id) {
      set(state => ({ ingredients: state.ingredients.map(i => i.id === ing.id ? { ...i, id: data.id } : i) }));
    }
  },

  updateIngredient: async (updatedIng) => {
    if (!USE_SUPABASE) {
      set(state => ({ ingredients: state.ingredients.map(i => i.id === updatedIng.id ? updatedIng : i) }));
      return;
    }
    const prev = get().ingredients.find(i => i.id === updatedIng.id);
    // Actualización optimista siempre inmediata
    set(state => ({ ingredients: state.ingredients.map(i => i.id === updatedIng.id ? updatedIng : i) }));

    // Detectar si solo cambió currentStock (debounce de 600ms)
    const stockOnly = prev &&
      prev.currentStock !== updatedIng.currentStock &&
      prev.name     === updatedIng.name &&
      prev.unit     === updatedIng.unit &&
      prev.cost     === updatedIng.cost &&
      prev.supplier === updatedIng.supplier;

    if (stockOnly) {
      clearTimeout(_stockDebounceTimers.get(updatedIng.id));
      const timer = setTimeout(async () => {
        _stockDebounceTimers.delete(updatedIng.id);
        const { error } = await updateStockInDb(updatedIng.id, updatedIng.currentStock);
        if (error) {
          set(state => ({ ingredients: state.ingredients.map(i => i.id === updatedIng.id ? prev : i) }));
          get().addToast({ type: 'error', message: `No se pudo actualizar el stock: ${mapSupabaseError(error)}` });
        }
      }, 600);
      _stockDebounceTimers.set(updatedIng.id, timer);
      return;
    }

    // Cambio completo (nombre, precio, proveedor, etc.) → inmediato
    const supplierMap = getSupplierNameToIdMap(get().suppliers);
    const { error } = await updateIngredientInDb(updatedIng, _currentUserId, supplierMap);
    if (error) {
      set(state => ({ ingredients: state.ingredients.map(i => i.id === updatedIng.id ? prev : i) }));
      get().addToast({ type: 'error', message: `No se pudo actualizar el ingrediente: ${mapSupabaseError(error)}` });
    }
  },

  deleteIngredient: async (id) => {
    if (!USE_SUPABASE) {
      set(state => ({ ingredients: state.ingredients.filter(i => i.id !== id) }));
      return;
    }
    const prev = get().ingredients;
    set(state => ({ ingredients: state.ingredients.filter(i => i.id !== id) }));
    const { error } = await deleteIngredientFromDb(id);
    if (error) {
      set({ ingredients: prev });
      get().addToast({ type: 'error', message: `No se pudo eliminar el ingrediente: ${mapSupabaseError(error)}` });
    }
  },

  // ── Recipes ───────────────────────────────────────────────────────────────
  addRecipe: async (recipe) => {
    if (!USE_SUPABASE) {
      set(state => ({ recipes: [...state.recipes, recipe] }));
      return;
    }
    set(state => ({ recipes: [...state.recipes, recipe] }));
    const { data, error } = await insertRecipeWithIngredients(recipe, _currentUserId);
    if (error) {
      set(state => ({ recipes: state.recipes.filter(r => r.id !== recipe.id) }));
      get().addToast({ type: 'error', message: `No se pudo guardar la receta: ${mapSupabaseError(error)}` });
    } else if (data && data.id !== recipe.id) {
      set(state => ({ recipes: state.recipes.map(r => r.id === recipe.id ? { ...recipe, id: data.id } : r) }));
    }
  },

  updateRecipe: async (updatedRecipe) => {
    if (!USE_SUPABASE) {
      set(state => ({ recipes: state.recipes.map(r => r.id === updatedRecipe.id ? updatedRecipe : r) }));
      return;
    }
    const prev = get().recipes.find(r => r.id === updatedRecipe.id);
    set(state => ({ recipes: state.recipes.map(r => r.id === updatedRecipe.id ? updatedRecipe : r) }));
    const { error } = await updateRecipeWithIngredients(updatedRecipe, _currentUserId);
    if (error) {
      set(state => ({ recipes: state.recipes.map(r => r.id === updatedRecipe.id ? prev : r) }));
      get().addToast({ type: 'error', message: `No se pudo actualizar la receta: ${mapSupabaseError(error)}` });
    }
  },

  deleteRecipe: async (id) => {
    if (!USE_SUPABASE) {
      set(state => ({ recipes: state.recipes.filter(r => r.id !== id) }));
      return;
    }
    const prev = get().recipes;
    set(state => ({ recipes: state.recipes.filter(r => r.id !== id) }));
    const { error } = await deleteRecipeFromDb(id);
    if (error) {
      set({ recipes: prev });
      get().addToast({ type: 'error', message: `No se pudo eliminar la receta: ${mapSupabaseError(error)}` });
    }
  },

  // ── Menus ─────────────────────────────────────────────────────────────────
  addMenu: async (menu) => {
    if (!USE_SUPABASE) {
      set(state => ({ menus: [...state.menus, menu] }));
      return;
    }
    set(state => ({ menus: [...state.menus, menu] }));
    const { data, error } = await insertMenuWithRecipes(menu, _currentUserId);
    if (error) {
      set(state => ({ menus: state.menus.filter(m => m.id !== menu.id) }));
      get().addToast({ type: 'error', message: `No se pudo guardar el menú: ${mapSupabaseError(error)}` });
    } else if (data && data.id !== menu.id) {
      set(state => ({ menus: state.menus.map(m => m.id === menu.id ? { ...menu, id: data.id } : m) }));
    }
  },

  updateMenu: async (updatedMenu) => {
    if (!USE_SUPABASE) {
      set(state => ({ menus: state.menus.map(m => m.id === updatedMenu.id ? updatedMenu : m) }));
      return;
    }
    const prev = get().menus.find(m => m.id === updatedMenu.id);
    set(state => ({ menus: state.menus.map(m => m.id === updatedMenu.id ? updatedMenu : m) }));
    const { error } = await updateMenuWithRecipes(updatedMenu, _currentUserId);
    if (error) {
      set(state => ({ menus: state.menus.map(m => m.id === updatedMenu.id ? prev : m) }));
      get().addToast({ type: 'error', message: `No se pudo actualizar el menú: ${mapSupabaseError(error)}` });
    }
  },

  deleteMenu: async (id) => {
    if (!USE_SUPABASE) {
      set(state => ({ menus: state.menus.filter(m => m.id !== id) }));
      return;
    }
    const prev = get().menus;
    set(state => ({ menus: state.menus.filter(m => m.id !== id) }));
    const { error } = await deleteMenuFromDb(id);
    if (error) {
      set({ menus: prev });
      get().addToast({ type: 'error', message: `No se pudo eliminar el menú: ${mapSupabaseError(error)}` });
    }
  },

  // ── Cart (siempre efímero — no se persiste en DB) ─────────────────────────
  addToCart: (item) => set((state) => {
    const existing = state.cart.find(c => c.ingredient.id === item.ingredient.id);
    if (existing) {
      return { cart: state.cart.map(c => c.ingredient.id === item.ingredient.id ? { ...c, packs: c.packs + item.packs } : c) };
    }
    return { cart: [...state.cart, item] };
  }),
  removeFromCart: (id) => set(state => ({ cart: state.cart.filter(c => c.ingredient.id !== id) })),
  clearCart: () => set({ cart: [] }),

  // ── Calendar Events ───────────────────────────────────────────────────────
  setCalendarEvents: async (events) => {
    if (!USE_SUPABASE) {
      set({ calendarEvents: events });
      return;
    }

    const prev = get().calendarEvents;
    set({ calendarEvents: events });

    // Detectar qué fechas cambiaron y sincronizar solo esas
    const allDates = new Set([...Object.keys(prev), ...Object.keys(events)]);
    for (const dateKey of allDates) {
      const prevEvents = prev[dateKey] ?? [];
      const newEvents  = events[dateKey] ?? [];

      // Comparar por JSON para detectar cambios reales
      if (JSON.stringify(prevEvents) === JSON.stringify(newEvents)) continue;

      const { error } = await setCalendarEventsForDate(dateKey, newEvents, _currentUserId);
      if (error) {
        console.error(`[setCalendarEvents] Error syncing ${dateKey}:`, error.message);
        set({ calendarEvents: prev });
        get().addToast({ type: 'error', message: `No se pudo guardar el calendario: ${mapSupabaseError(error)}` });
        return;
      }
    }
  },

  // ── Reset global (vuelve a mockData, útil para logout) ───────────────────
  resetStore: () => set({
    ingredients:    USE_SUPABASE ? [] : ingredientsCatalog,
    recipes:        USE_SUPABASE ? [] : recipes,
    menus:          USE_SUPABASE ? [] : menus,
    suppliers:      USE_SUPABASE ? [] : suppliers,
    cart:           [],
    calendarEvents: {},
    isHydrating:    false,
    hydrationError: null,
    toasts:         [],
  }),
});

// ── Crear el store: con o sin persist según el feature flag ──────────────────
export const useStore = create(
  USE_SUPABASE
    ? storeCreator
    : persist(storeCreator, { name: 'kitchencalc-store', version: 1 })
);
