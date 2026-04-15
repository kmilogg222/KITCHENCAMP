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
  insertIngredient, updateIngredientInDb, deleteIngredientFromDb,
  insertRecipeWithIngredients, updateRecipeWithIngredients, deleteRecipeFromDb,
  insertMenuWithRecipes, updateMenuWithRecipes, deleteMenuFromDb,
  setCalendarEventsForDate,
} from '../lib/db';

// ── Helper: obtener userId del contexto (se inyecta en hydrate) ───────────────
let _currentUserId = null;
export function setCurrentUserId(id) { _currentUserId = id; }

// ── Helper: obtener mapa supplier name→id desde el store ─────────────────────
function getSupplierNameToIdMap(suppliers) {
  return new Map(suppliers.map(s => [s.name, s.id]));
}

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
  isHydrating:    USE_SUPABASE,  // true mientras esperamos datos de Supabase
  hydrationError: null,

  // ── Toasts (notificaciones de error) ──────────────────────────────────────
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}`;
    set(state => ({ toasts: [...state.toasts, { ...toast, id }] }));
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
      get().addToast({ type: 'error', message: `Failed to save supplier: ${error.message}` });
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
      get().addToast({ type: 'error', message: `Failed to update supplier: ${error.message}` });
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
      get().addToast({ type: 'error', message: `Failed to delete supplier: ${error.message}` });
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
      get().addToast({ type: 'error', message: `Failed to save ingredient: ${error.message}` });
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
    set(state => ({ ingredients: state.ingredients.map(i => i.id === updatedIng.id ? updatedIng : i) }));
    const supplierMap = getSupplierNameToIdMap(get().suppliers);
    const { error } = await updateIngredientInDb(updatedIng, _currentUserId, supplierMap);
    if (error) {
      set(state => ({ ingredients: state.ingredients.map(i => i.id === updatedIng.id ? prev : i) }));
      get().addToast({ type: 'error', message: `Failed to update ingredient: ${error.message}` });
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
      get().addToast({ type: 'error', message: `Failed to delete ingredient: ${error.message}` });
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
      get().addToast({ type: 'error', message: `Failed to save recipe: ${error.message}` });
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
      get().addToast({ type: 'error', message: `Failed to update recipe: ${error.message}` });
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
      get().addToast({ type: 'error', message: `Failed to delete recipe: ${error.message}` });
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
      get().addToast({ type: 'error', message: `Failed to save menu: ${error.message}` });
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
      get().addToast({ type: 'error', message: `Failed to update menu: ${error.message}` });
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
      get().addToast({ type: 'error', message: `Failed to delete menu: ${error.message}` });
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
        get().addToast({ type: 'error', message: `Failed to save calendar: ${error.message}` });
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
