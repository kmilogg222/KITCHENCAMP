/**
 * @file Toast.jsx
 * @description Sistema de notificaciones de error/éxito para errores de persistencia.
 * Se renderiza en App.jsx. Los toasts se auto-descartan a los 5 segundos.
 */
import { useStore } from '../store/useStore';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

const TOAST_STYLES = {
  error:   { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  icon: AlertCircle,  color: '#fca5a5' },
  success: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', icon: CheckCircle,  color: '#6ee7b7' },
  info:    { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)', icon: Info,         color: '#93c5fd' },
};

export default function ToastContainer() {
  const toasts      = useStore(s => s.toasts);
  const removeToast = useStore(s => s.removeToast);

  if (!toasts?.length) return null;

  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      maxWidth: 360,
    }}>
      {toasts.map(toast => {
        const style = TOAST_STYLES[toast.type] ?? TOAST_STYLES.info;
        const Icon  = style.icon;
        return (
          <div key={toast.id} style={{
            background: style.bg,
            border: `1px solid ${style.border}`,
            borderRadius: 12, padding: '12px 14px',
            backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'flex-start', gap: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            animation: 'slideIn 0.2s ease-out',
          }}>
            <Icon size={16} color={style.color} style={{ marginTop: 1, flexShrink: 0 }} />
            <p style={{ color: 'white', fontSize: 13, margin: 0, flex: 1, lineHeight: 1.4 }}>
              {toast.message}
            </p>
            <button onClick={() => removeToast(toast.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 0, flexShrink: 0 }}>
              <X size={14} />
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
