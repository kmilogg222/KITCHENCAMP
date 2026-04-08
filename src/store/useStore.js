import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ingredientsCatalog, recipes, menus, suppliers } from '../data/mockData';

export const useStore = create(
    persist(
        (set, get) => ({
            // Collections
            ingredients: ingredientsCatalog,
            recipes: recipes,
            menus: menus,
            suppliers: suppliers,
            cart: [],

            // Ingredients actions
            addIngredient: (ing) => set((state) => ({ ingredients: [...state.ingredients, ing] })),
            updateIngredient: (updatedIng) => set((state) => ({
                ingredients: state.ingredients.map(i => i.id === updatedIng.id ? updatedIng : i)
            })),
            deleteIngredient: (id) => set((state) => ({
                ingredients: state.ingredients.filter(i => i.id !== id)
            })),

            // Recipes actions
            addRecipe: (recipe) => set((state) => ({ recipes: [...state.recipes, recipe] })),
            updateRecipe: (updatedRecipe) => set((state) => ({
                recipes: state.recipes.map(r => r.id === updatedRecipe.id ? updatedRecipe : r)
            })),
            deleteRecipe: (id) => set((state) => ({
                recipes: state.recipes.filter(r => r.id !== id)
            })),

            // Menus actions
            addMenu: (menu) => set((state) => ({ menus: [...state.menus, menu] })),
            updateMenu: (updatedMenu) => set((state) => ({
                menus: state.menus.map(m => m.id === updatedMenu.id ? updatedMenu : m)
            })),
            deleteMenu: (id) => set((state) => ({
                menus: state.menus.filter(m => m.id !== id)
            })),

            // Suppliers actions
            addSupplier: (supplier) => set((state) => ({ suppliers: [...state.suppliers, supplier] })),
            updateSupplier: (updatedSupplier) => set((state) => ({
                suppliers: state.suppliers.map(s => s.id === updatedSupplier.id ? updatedSupplier : s)
            })),
            deleteSupplier: (id) => set((state) => ({
                suppliers: state.suppliers.filter(s => s.id !== id)
            })),

            // Cart actions
            addToCart: (item) => set((state) => {
                const existing = state.cart.find(c => c.ingredient.id === item.ingredient.id);
                if (existing) {
                    return {
                        cart: state.cart.map(c =>
                            c.ingredient.id === item.ingredient.id
                                ? { ...c, packs: c.packs + item.packs }
                                : c
                        )
                    };
                }
                return { cart: [...state.cart, item] };
            }),
            removeFromCart: (id) => set((state) => ({
                cart: state.cart.filter(c => c.ingredient.id !== id)
            })),
            clearCart: () => set({ cart: [] }),

            // Calendar events (if needed globally, currently handled inside CalendarView)
            // But good to have state here if we want persistence
            calendarEvents: {},
            setCalendarEvents: (events) => set({ calendarEvents: events }),

            // Global Reset
            resetStore: () => set({
                ingredients: ingredientsCatalog,
                recipes,
                menus,
                suppliers,
                cart: []
            }),
        }),
        {
            name: 'kitchencalc-store',
            version: 1,
        }
    )
);
