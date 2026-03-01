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
