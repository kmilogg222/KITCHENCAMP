/**
 * @file hooks/useCartManager.js
 * @description Custom hook que encapsula TODA la lógica del carrito de compras.
 *
 * Separar esta lógica de App.jsx cumple el principio de
 * "Single Responsibility": App solo orquesta vistas; este hook
 * se encarga exclusivamente del estado del carrito.
 *
 * @returns {{
 *   cart: CartItem[],
 *   addToCart: (ingredient: Ingredient, result: CalcResult) => void,
 *   removeFromCart: (ingredientId: string) => void,
 *   clearCart: () => void,
 * }}
 */
import { useState } from 'react';

export function useCartManager() {
    const [cart, setCart] = useState([]);

    /**
     * Agrega un ingrediente al carrito.
     * Si el ingrediente ya existe (por id), no lo duplica.
     *
     * @param {object} ingredient - Objeto del catálogo de ingredientes.
     * @param {object} result     - Resultado de calcRequisition({ R, packSize, unit }).
     */
    const addToCart = (ingredient, result) => {
        setCart(prev => {
            // Evitar duplicados: si ya está en el carrito, ignorar
            if (prev.some(i => i.ingredientId === ingredient.id)) return prev;

            return [...prev, {
                ingredientId: ingredient.id,
                name: ingredient.name,
                R: result.R,            // packs a ordenar
                pricePerPack: ingredient.pricePerPack,
                supplier: ingredient.supplier,
                packSize: ingredient.packSize,
                unit: ingredient.unit,
            }];
        });
    };

    /** Elimina un item del carrito por su ingredientId. */
    const removeFromCart = (ingredientId) =>
        setCart(prev => prev.filter(i => i.ingredientId !== ingredientId));

    /** Vacía el carrito por completo. */
    const clearCart = () => setCart([]);

    return { cart, addToCart, removeFromCart, clearCart };
}
