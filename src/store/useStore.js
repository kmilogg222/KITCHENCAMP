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
import { ingredientsCatalog, recipes, menus, suppliers, computeOrderPacks, aggregateCalendarDemand, calcConsumption } from '../data/mockData';
import { USE_SUPABASE } from '../lib/db/client';

// ── Importaciones de DB (solo se usan cuando USE_SUPABASE = true) ─────────────
import {
  insertSupplier, updateSupplierInDb, deleteSupplierFromDb,
  insertIngredient, updateIngredientInDb, deleteIngredientFromDb, updateStockInDb,
  insertRecipeWithIngredients, updateRecipeWithIngredients, deleteRecipeFromDb,
  insertMenuWithRecipes, updateMenuWithRecipes, deleteMenuFromDb,
  setCalendarEventsForDate, setEventCooked,
  insertStockMovement, deleteMovementsByRef,
  insertPurchaseOrder, fetchPurchaseOrders, updatePurchaseOrderStatus, deletePurchaseOrder as deletePurchaseOrderFromDb,
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
  cartMeta:       { deliveryDate: null, startDate: null, endDate: null },
  calendarEvents: {},
  purchaseOrders: [],

  // ── Estado de hidratación ─────────────────────────────────────────────────
  isHydrating:    false,  // no bloquea la UI — datos se llenan en background
  hasHydrated:    false,  // indica que la hidratación ya terminó exitosamente para el usuario actual
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
    purchaseOrders: data.purchaseOrders ?? [],
    isHydrating:    false,
    hasHydrated:    true,
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

    // Detectar si solo cambió el stock (debounce de 600ms)
    const stockOnly = prev &&
      (prev.stockQty !== updatedIng.stockQty || prev.currentStock !== updatedIng.currentStock) &&
      prev.name           === updatedIng.name &&
      prev.unit           === updatedIng.unit &&
      prev.packSize       === updatedIng.packSize &&
      prev.minOrder       === updatedIng.minOrder &&
      prev.pricePerPack   === updatedIng.pricePerPack &&
      prev.supplier       === updatedIng.supplier &&
      prev.substitutable  === updatedIng.substitutable &&
      prev.substitute     === updatedIng.substitute;

    if (stockOnly) {
      clearTimeout(_stockDebounceTimers.get(updatedIng.id));
      const timer = setTimeout(async () => {
        _stockDebounceTimers.delete(updatedIng.id);
        const newStockQty = updatedIng.stockQty ?? ((updatedIng.currentStock ?? 0) * (updatedIng.packSize ?? 1));
        const { error } = await updateStockInDb(updatedIng.id, newStockQty, updatedIng.packSize);
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

  // ── Cart (efímero — no se persiste en DB) ────────────────────────────────
  // item canónico: { ingredientId, name, unit, packSize, pricePerPack, supplier,
  //                  currentStock, minOrder, demandSafe, R }
  addToCart: (ingredient, result) => set((state) => {
    const addedDemand = result?.D_safe ?? 0;
    const existing = state.cart.find(c => c.ingredientId === ingredient.id);
    if (existing) {
      const demandSafe = existing.demandSafe + addedDemand;
      return {
        cart: state.cart.map(c => c.ingredientId === ingredient.id
          ? { ...c, demandSafe, R: computeOrderPacks(demandSafe, c.packSize, c.stockQty, c.minOrder) }
          : c),
      };
    }
    const stockQty = ingredient.stockQty ?? ((ingredient.currentStock ?? 0) * (ingredient.packSize ?? 1));
    const item = {
      ingredientId: ingredient.id,
      name:         ingredient.name,
      unit:         ingredient.unit,
      packSize:     ingredient.packSize,
      pricePerPack: ingredient.pricePerPack,
      supplier:     ingredient.supplier,
      currentStock: ingredient.currentStock ?? 0,
      stockQty,
      minOrder:     ingredient.minOrder ?? 1,
      demandSafe:   addedDemand,
      R:            computeOrderPacks(addedDemand, ingredient.packSize, stockQty, ingredient.minOrder ?? 1),
    };
    return { cart: [...state.cart, item] };
  }),
  removeFromCart: (ingredientId) => set(state => ({
    cart: state.cart.filter(c => c.ingredientId !== ingredientId),
  })),
  clearCart: () => set({ cart: [] }),

  // Genera el carrito desde un rango del calendario. supplierFilter: Set<supplierId> | null (null = todos)
  buildCartFromCalendar: ({ startDate, endDate, deliveryDate, supplierFilter = null }) => {
    const { calendarEvents, recipes: storeRecipes, ingredients } = get();
    const { items } = aggregateCalendarDemand(calendarEvents, startDate, endDate, storeRecipes, ingredients);
    const cart = items
      .filter(({ ingredient }) => !supplierFilter || supplierFilter.has(ingredient.supplierId ?? ingredient.supplier))
      .map(({ ingredient, demandSafe }) => {
        const stockQty = ingredient.stockQty ?? ((ingredient.currentStock ?? 0) * (ingredient.packSize ?? 1));
        return {
          ingredientId: ingredient.id,
          name:         ingredient.name,
          unit:         ingredient.unit,
          packSize:     ingredient.packSize,
          pricePerPack: ingredient.pricePerPack,
          supplier:     ingredient.supplier,
          currentStock: ingredient.currentStock ?? 0,
          stockQty,
          minOrder:     ingredient.minOrder ?? 1,
          demandSafe,
          R: computeOrderPacks(demandSafe, ingredient.packSize, stockQty, ingredient.minOrder ?? 1),
        };
      })
      .filter(it => it.R > 0);
    set({ cart, cartMeta: { deliveryDate: deliveryDate ?? null, startDate, endDate } });
  },

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

  // ── Órdenes de compra persistentes ───────────────────────────────────────
  loadPurchaseOrders: async () => {
    if (!USE_SUPABASE) return;
    const { data, error } = await fetchPurchaseOrders(_currentUserId);
    if (!error && data) set({ purchaseOrders: data });
  },

  createPurchaseOrderFromCart: async ({ deliveryDate, startDate, endDate }) => {
    const state = get();
    const { cart, cartMeta } = state;
    if (cart.length === 0) return;

    const total = cart.reduce((s, i) => s + i.pricePerPack * i.R, 0);
    const po = {
      status:       'pending',
      deliveryDate: deliveryDate ?? cartMeta.deliveryDate ?? null,
      startDate:    startDate   ?? cartMeta.startDate    ?? null,
      endDate:      endDate     ?? cartMeta.endDate      ?? null,
      total,
      createdAt:    new Date().toISOString(),
      items:        cart,
    };
    const localPo = { ...po, id: crypto.randomUUID() };

    // Optimistic: agregar PO al store y limpiar carrito
    set(s => ({ purchaseOrders: [localPo, ...s.purchaseOrders], cart: [] }));

    if (!USE_SUPABASE) return;

    const { data, error } = await insertPurchaseOrder(po, cart, _currentUserId);
    if (error) {
      set(s => ({ purchaseOrders: s.purchaseOrders.filter(p => p.id !== localPo.id), cart }));
      get().addToast({ type: 'error', message: `No se pudo guardar la orden: ${mapSupabaseError(error)}` });
    } else {
      set(s => ({ purchaseOrders: s.purchaseOrders.map(p => p.id === localPo.id ? { ...localPo, id: data.id } : p) }));
    }
  },

  receivePurchaseOrder: async (poId) => {
    const state = get();
    const po = state.purchaseOrders.find(p => p.id === poId);
    if (!po || po.status !== 'pending') return;

    const prevIngredients = state.ingredients;
    const prevOrders = state.purchaseOrders;

    // Optimistic: sumar stock + marcar recibida
    set(s => {
      const updatedIngredients = s.ingredients.map(ing => {
        const item = po.items?.find(i => i.ingredientId === ing.id);
        if (!item) return ing;
        const added = item.R * item.packSize;
        const newQty = (ing.stockQty ?? 0) + added;
        const newPacks = ing.packSize > 0 ? Math.round(newQty / ing.packSize) : 0;
        return { ...ing, stockQty: newQty, currentStock: newPacks };
      });
      const updatedOrders = s.purchaseOrders.map(p =>
        p.id === poId ? { ...p, status: 'received', receivedAt: new Date().toISOString() } : p
      );
      return { ingredients: updatedIngredients, purchaseOrders: updatedOrders };
    });

    get().addToast({ type: 'success', message: 'Purchase order received — stock updated.' });

    if (!USE_SUPABASE) return;

    try {
      for (const item of (po.items ?? [])) {
        const ing = prevIngredients.find(i => i.id === item.ingredientId);
        const added = item.R * item.packSize;
        const newQty = (ing?.stockQty ?? 0) + added;
        await insertStockMovement({ ingredient_id: item.ingredientId, qty_base: added, reason: 'purchase', ref_type: 'purchase_order', ref_id: poId }, _currentUserId);
        await updateStockInDb(item.ingredientId, newQty, ing?.packSize);
      }
      await updatePurchaseOrderStatus(poId, 'received');
    } catch (err) {
      set({ ingredients: prevIngredients, purchaseOrders: prevOrders });
      get().addToast({ type: 'error', message: `No se pudo registrar la recepción: ${err.message}` });
    }
  },

  deletePurchaseOrder: async (poId) => {
    set(s => ({ purchaseOrders: s.purchaseOrders.filter(p => p.id !== poId) }));
    if (!USE_SUPABASE) return;
    const { error } = await deletePurchaseOrderFromDb(poId);
    if (error) {
      get().addToast({ type: 'error', message: `No se pudo eliminar la orden: ${error.message}` });
    }
  },

  // ── Marcar evento del calendario como cocinado ───────────────────────────
  cookCalendarEvent: async (dateKey, eventId) => {
    const state = get();
    const dayEvents = state.calendarEvents[dateKey] ?? [];
    const event = dayEvents.find(e => e.id === eventId);
    if (!event || event.cooked) return;

    const recipeIndex = new Map(state.recipes.map(r => [r.id, r]));
    const consumed = calcConsumption(event, recipeIndex, state.ingredients);

    const prevIngredients = state.ingredients;
    const prevCalendar = state.calendarEvents;

    set(s => {
      const updatedIngredients = s.ingredients.map(ing => {
        const entry = consumed.find(c => c.ingredientId === ing.id);
        if (!entry) return ing;
        const newQty = Math.max(0, (ing.stockQty ?? 0) - entry.qtyBase);
        const newPacks = ing.packSize > 0 ? Math.round(newQty / ing.packSize) : 0;
        return { ...ing, stockQty: newQty, currentStock: newPacks };
      });
      const updatedCalendar = {
        ...s.calendarEvents,
        [dateKey]: (s.calendarEvents[dateKey] ?? []).map(e =>
          e.id === eventId ? { ...e, cooked: true, cookedAt: new Date().toISOString() } : e
        ),
      };
      return { ingredients: updatedIngredients, calendarEvents: updatedCalendar };
    });

    const summary = consumed.map(c => {
      const ing = state.ingredients.find(i => i.id === c.ingredientId);
      return ing ? `${ing.name} ${c.qtyBase.toFixed(1)} ${ing.unit}` : null;
    }).filter(Boolean).slice(0, 3).join(', ');
    get().addToast({ type: 'success', message: `Cooked! Consumed: ${summary || 'no items'}` });

    if (!USE_SUPABASE) return;

    try {
      for (const c of consumed) {
        const ing = prevIngredients.find(i => i.id === c.ingredientId);
        const newQty = Math.max(0, (ing?.stockQty ?? 0) - c.qtyBase);
        await insertStockMovement({ ingredient_id: c.ingredientId, qty_base: -c.qtyBase, reason: 'production', ref_type: 'calendar_event', ref_id: eventId }, _currentUserId);
        await updateStockInDb(c.ingredientId, newQty, ing?.packSize);
      }
      await setEventCooked(eventId, true);
    } catch (err) {
      set({ ingredients: prevIngredients, calendarEvents: prevCalendar });
      get().addToast({ type: 'error', message: `No se pudo registrar la cocción: ${err.message}` });
    }
  },

  uncookCalendarEvent: async (dateKey, eventId) => {
    const state = get();
    const dayEvents = state.calendarEvents[dateKey] ?? [];
    const event = dayEvents.find(e => e.id === eventId);
    if (!event || !event.cooked) return;

    const recipeIndex = new Map(state.recipes.map(r => [r.id, r]));
    const consumed = calcConsumption(event, recipeIndex, state.ingredients);

    const prevIngredients = state.ingredients;
    const prevCalendar = state.calendarEvents;

    set(s => {
      const updatedIngredients = s.ingredients.map(ing => {
        const entry = consumed.find(c => c.ingredientId === ing.id);
        if (!entry) return ing;
        const newQty = (ing.stockQty ?? 0) + entry.qtyBase;
        const newPacks = ing.packSize > 0 ? Math.round(newQty / ing.packSize) : 0;
        return { ...ing, stockQty: newQty, currentStock: newPacks };
      });
      const updatedCalendar = {
        ...s.calendarEvents,
        [dateKey]: (s.calendarEvents[dateKey] ?? []).map(e =>
          e.id === eventId ? { ...e, cooked: false, cookedAt: null } : e
        ),
      };
      return { ingredients: updatedIngredients, calendarEvents: updatedCalendar };
    });

    get().addToast({ type: 'success', message: 'Cooking undone — stock restored.' });

    if (!USE_SUPABASE) return;

    try {
      for (const c of consumed) {
        const ing = prevIngredients.find(i => i.id === c.ingredientId);
        const newQty = (ing?.stockQty ?? 0) + c.qtyBase;
        await updateStockInDb(c.ingredientId, newQty, ing?.packSize);
      }
      await deleteMovementsByRef('calendar_event', eventId);
      await setEventCooked(eventId, false);
    } catch (err) {
      set({ ingredients: prevIngredients, calendarEvents: prevCalendar });
      get().addToast({ type: 'error', message: `No se pudo deshacer la cocción: ${err.message}` });
    }
  },

  // ── Reset global (vuelve a mockData, útil para logout) ───────────────────
  resetStore: () => set({
    ingredients:    USE_SUPABASE ? [] : ingredientsCatalog,
    recipes:        USE_SUPABASE ? [] : recipes,
    menus:          USE_SUPABASE ? [] : menus,
    suppliers:      USE_SUPABASE ? [] : suppliers,
    cart:           [],
    cartMeta:       { deliveryDate: null, startDate: null, endDate: null },
    calendarEvents: {},
    purchaseOrders: [],
    isHydrating:    false,
    hasHydrated:    false,
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
