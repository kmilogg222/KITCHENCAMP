/**
 * @file UnsavedChangesModal.jsx
 * @description Modal de confirmación que se muestra cuando el usuario intenta
 * abandonar un formulario con cambios sin guardar.
 */
import { AlertTriangle } from 'lucide-react';

export default function UnsavedChangesModal({ isOpen, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(61,26,120,0.5)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onCancel}
    >
      <div
        className="glass-card"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 400,
          padding: '32px 36px',
          animation: 'fadeInUp 0.3s ease-out',
          textAlign: 'center',
        }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px',
        }}>
          <AlertTriangle size={24} color="#ef4444" />
        </div>

        <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 800, color: '#3d1a78' }}>
          Unsaved changes
        </h2>
        <p style={{ margin: '0 0 28px', fontSize: 14, color: '#6b3fa0', lineHeight: 1.5 }}>
          If you leave this page, your changes will be lost.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn-ghost" onClick={onCancel} style={{ minWidth: 100 }}>
            Stay
          </button>
          <button
            onClick={onConfirm}
            style={{
              minWidth: 140,
              padding: '10px 20px',
              borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 700, color: 'white',
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
              boxShadow: '0 4px 12px rgba(239,68,68,0.35)',
              transition: 'opacity 0.15s',
            }}
          >
            Leave anyway
          </button>
        </div>
      </div>
    </div>
  );
}
