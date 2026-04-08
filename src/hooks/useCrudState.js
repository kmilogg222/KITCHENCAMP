/**
 * @file hooks/useCrudState.js
 * @description Custom hook genérico para manejar colecciones CRUD en estado local.
 *
 * Evita repetir el mismo patrón add / update / delete en cada entidad
 * (ingredientes, suppliers, recetas). Basta con llamar useCrudState(initialData, storageKey)
 * y obtienes los tres handlers listos para usar.
 *
 * Si se proporciona un storageKey, la colección se persiste automáticamente
 * en localStorage y se rehidrata al montar el hook. Cuando no hay datos
 * guardados, se usa initialData como fallback (datos semilla).
 *
 * @template T - Tipo de elemento de la colección (debe tener campo { id }).
 * @param {T[]} initialData - Array inicial de elementos (datos semilla).
 * @param {string} [storageKey] - Clave para persistir en localStorage. Opcional.
 * @returns {{
 *   items:  T[],
 *   add:    (item: T) => void,
 *   update: (updated: T) => void,
 *   remove: (id: string | number) => void,
 * }}
 */
import { useState, useEffect } from 'react';

/**
 * Lee datos desde localStorage de forma segura.
 * Retorna null si no existen datos o si el JSON está corrupto.
 * @param {string} key - Clave de localStorage.
 * @returns {any|null}
 */
function readFromStorage(key) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return null;
        return JSON.parse(raw);
    } catch {
        console.warn(`[useCrudState] Error leyendo localStorage key "${key}", usando datos iniciales.`);
        return null;
    }
}

export function useCrudState(initialData = [], storageKey) {
    const [items, setItems] = useState(() => {
        if (!storageKey) return initialData;
        const stored = readFromStorage(storageKey);
        return Array.isArray(stored) ? stored : initialData;
    });

    // Persistir en localStorage cada vez que items cambie
    useEffect(() => {
        if (!storageKey) return;
        try {
            localStorage.setItem(storageKey, JSON.stringify(items));
        } catch (err) {
            console.warn(`[useCrudState] Error guardando en localStorage key "${storageKey}":`, err);
        }
    }, [items, storageKey]);

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
