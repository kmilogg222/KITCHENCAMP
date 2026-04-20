/**
 * @file SkeletonList.jsx
 * @description Placeholder animado que se muestra mientras el store hidrata desde Supabase.
 * Solo renderiza cuando USE_SUPABASE=true e isHydrating=true.
 */
import { useStore } from '../store/useStore';
import { USE_SUPABASE } from '../lib/db/client';

const shimmerStyle = (height, width, borderRadius = 6) => ({
  height,
  width,
  borderRadius,
  background: 'linear-gradient(90deg, rgba(155,109,202,0.12) 25%, rgba(78,205,196,0.18) 50%, rgba(155,109,202,0.12) 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeletonShimmer 1.5s ease-in-out infinite',
  flexShrink: 0,
});

/**
 * @param {number}  rows  - Número de filas skeleton (default 5)
 */
export default function SkeletonList({ rows = 5 }) {
  const isHydrating = useStore(s => s.isHydrating);
  if (!USE_SUPABASE || !isHydrating) return null;

  return (
    <>
      <style>{`
        @keyframes skeletonShimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            style={{
              background: 'rgba(255,255,255,0.55)',
              borderRadius: 14,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              border: '1px solid rgba(155,109,202,0.12)',
            }}
          >
            <div style={shimmerStyle(36, 36, 10)} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={shimmerStyle(13, `${50 + (i % 3) * 15}%`, 5)} />
              <div style={shimmerStyle(10, `${28 + (i % 2) * 18}%`, 5)} />
            </div>
            <div style={shimmerStyle(10, 52, 5)} />
          </div>
        ))}
      </div>
    </>
  );
}
