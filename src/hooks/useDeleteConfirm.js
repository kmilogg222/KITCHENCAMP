/**
 * @file hooks/useDeleteConfirm.js
 * @description Hook to manage delete confirmation state with a timeout.
 * Automatically cleans up the timer on unmount to prevent state updates on unmounted components.
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export default function useDeleteConfirm(timeoutMs = 3000) {
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const timeoutRef = useRef(null);

    const confirmDelete = useCallback((id, onDelete) => {
        if (deleteConfirm === id) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setDeleteConfirm(null);
            onDelete(id);
        } else {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setDeleteConfirm(id);
            timeoutRef.current = setTimeout(() => {
                setDeleteConfirm(null);
            }, timeoutMs);
        }
    }, [deleteConfirm, timeoutMs]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return { deleteConfirm, confirmDelete, setDeleteConfirm };
}
