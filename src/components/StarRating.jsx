/**
 * @file StarRating.jsx
 * @description Muestra una calificación visual con estrellas (sólo lectura).
 *
 * Props:
 *  - rating {number} - Número de estrellas llenas (0 a `max`).
 *  - max    {number} - Total de estrellas a mostrar. Por defecto: 5.
 */
import { Star } from 'lucide-react';

export default function StarRating({ rating, max = 5 }) {
    return (
        <div style={{ display: 'flex', gap: 2 }}>
            {Array.from({ length: max }).map((_, i) => (
                <Star
                    key={i}
                    size={14}
                    fill={i < rating ? '#fbbf24' : 'none'}
                    stroke={i < rating ? '#fbbf24' : '#d1d5db'}
                />
            ))}
        </div>
    );
}
