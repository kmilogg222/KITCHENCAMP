/**
 * @file theme.js
 * @description Design tokens centralizados para toda la aplicación.
 *
 * Principio: un solo lugar donde cambiar colores, tipografías, tamaños o
 * espaciados. Cualquier componente que necesite un valor de diseño lo importa
 * desde aquí, en lugar de repetir literales de color por el código.
 */

// ── Paleta de colores ─────────────────────────────────────────────────────────
export const COLORS = {
    // Púrpura — color principal de la marca
    purpleDeep: '#3d1a78',
    purpleMid: '#6b3fa0',
    purpleLight: '#9b6dca',
    purplePale: '#e8d5f5',
    purpleBg: '#f3eafc',

    // Teal — color de acento / confirmación
    teal: '#4ecdc4',
    tealDark: '#38b2ac',
    tealLight: '#81e6d9',

    // Estado
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',

    // Grises neutros
    gray50: '#f9fafb',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray600: '#4b5563',
    gray700: '#374151',
    gray800: '#1f2937',

    white: '#ffffff',
};

// ── Paleta de colores para suppliers (color picker) ───────────────────────────
export const SUPPLIER_COLOR_PALETTE = [
    '#6b3fa0', '#4ecdc4', '#10b981', '#f59e0b', '#ef4444',
    '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
    '#06b6d4', '#84cc16', '#a855f7', '#0ea5e9', '#d97706',
];

// ── Slots de comida del calendario ────────────────────────────────────────────
// Importado por CalendarView; definirlo aquí evita re-crearlo en cada render.
import { Coffee, Sun, Moon, Apple } from 'lucide-react';

export const MEAL_SLOTS = [
    { key: 'breakfast', label: 'Breakfast', icon: Coffee, color: COLORS.warning },
    { key: 'lunch', label: 'Lunch', icon: Sun, color: COLORS.purpleMid },
    { key: 'dinner', label: 'Dinner', icon: Moon, color: COLORS.teal },
    { key: 'snack', label: 'Snack', icon: Apple, color: COLORS.success },
];

// ── Unidades disponibles para ingredientes ────────────────────────────────────
export const INGREDIENT_UNITS = ['g', 'ml', 'units', 'kg', 'L', 'oz', 'gal', 'qt', 'lb', '1#'];

// ── Estilo base para inputs de formulario ─────────────────────────────────────
// Reutilizable en cualquier modal/formulario sin repetir el objeto.
export const INPUT_STYLE = {
    padding: '8px 11px',
    borderRadius: 9,
    fontSize: 13,
    border: `1.5px solid rgba(155,109,202,0.3)`,
    outline: 'none',
    background: 'rgba(255,255,255,0.85)',
    color: COLORS.gray800,
    width: '100%',
};
