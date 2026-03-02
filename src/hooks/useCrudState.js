/**
 * @file hooks/useCrudState.js
 * @description Custom hook genérico para manejar colecciones CRUD en estado local.
 *
 * Evita repetir el mismo patrón add / update / delete en cada entidad
 * (ingredientes, suppliers, recetas). Basta con llamar useCrudState(initialData)
 * y obtienes los tres handlers listos para usar.
 *
 * @template T - Tipo de elemento de la colección (debe tener campo { id }).
 * @param {T[]} initialData - Array inicial de elementos.
 * @returns {{
 *   items:  T[],
 *   add:    (item: T) => void,
 *   update: (updated: T) => void,
 *   remove: (id: string | number) => void,
 * }}
 */
import { useState } from 'react';

export function useCrudState(initialData = []) {
    const [items, setItems] = useState(initialData);

    /** Agrega un nuevo elemento al final de la colección. */
    const add = (item) =>
        setItems(prev => [...prev, item]);

    /**
     * Reemplaza el elemento cuyo id coincide con updated.id.
     * Si no lo encuentra, la colección no cambia.
     */
    const update = (updated) =>
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i));

    /** Elimina el elemento con el id dado. */
    const remove = (id) =>
        setItems(prev => prev.filter(i => i.id !== id));

    return { items, add, update, remove };
}
