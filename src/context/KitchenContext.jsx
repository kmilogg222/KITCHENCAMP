import React, { createContext, useContext, useState } from 'react';
import { useCrudState } from '../hooks/useCrudState';
import { useCartManager } from '../hooks/useCartManager';
import {
    recipes as MOCK_RECIPES,
    ingredientsCatalog as MOCK_CATALOG,
    suppliers as MOCK_SUPPLIERS,
    menus as MOCK_MENUS,
} from '../data/mockData';

const KitchenContext = createContext(null);

export function KitchenProvider({ children }) {
    const {
        items: ingredients,
        add: addIngredient,
        update: updateIngredient,
        remove: deleteIngredient,
    } = useCrudState(MOCK_CATALOG, 'ingredients');

    const {
        items: suppliers,
        add: addSupplier,
        update: updateSupplier,
        remove: deleteSupplier,
    } = useCrudState(MOCK_SUPPLIERS, 'suppliers');

    const {
        items: recipes,
        add: addRecipe,
        update: updateRecipe,
        remove: removeRecipe,
    } = useCrudState(MOCK_RECIPES, 'recipes');

    const {
        items: menus,
        add: addMenu,
        update: updateMenu,
        remove: removeMenu,
    } = useCrudState(MOCK_MENUS, 'menus');

    const { cart, addToCart, removeFromCart, clearCart } = useCartManager();

    const value = {
        ingredients, addIngredient, updateIngredient, deleteIngredient,
        suppliers, addSupplier, updateSupplier, deleteSupplier,
        recipes, addRecipe, updateRecipe, removeRecipe,
        menus, addMenu, updateMenu, removeMenu,
        cart, addToCart, removeFromCart, clearCart
    };

    return (
        <KitchenContext.Provider value={value}>
            {children}
        </KitchenContext.Provider>
    );
}

export function useKitchen() {
    const context = useContext(KitchenContext);
    if (!context) {
        throw new Error('useKitchen must be used within a KitchenProvider');
    }
    return context;
}
