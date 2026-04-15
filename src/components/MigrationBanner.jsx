/**
 * @file MigrationBanner.jsx
 * @description Banner que aparece cuando el usuario tiene datos en localStorage
 * pero su cuenta en Supabase está vacía. Ofrece migrar o empezar desde cero.
 */
import { useState } from 'react';
import { migrateLocalDataToDb } from '../lib/db/migration';
import { fetchAllUserData } from '../lib/db/transform';
import { useStore } from '../store/useStore';
import { Database, ArrowRight, Trash2, Loader2, CheckCircle } from 'lucide-react';

export default function MigrationBanner({ userId, onDismiss }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'migrating' | 'done' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const hydrate = useStore(s => s.hydrate);

  async function handleMigrate() {
    setStatus('migrating');
    const { success, error } = await migrateLocalDataToDb(userId);
    if (!success) {
      setStatus('error');
      setErrorMsg(error);
      return;
    }
    // Re-hidratar el store con los datos recién migrados
    try {
      const data = await fetchAllUserData();
      hydrate(data);
    } catch (e) {
      console.error('[MigrationBanner] Re-hydration failed:', e);
    }
    setStatus('done');
    setTimeout(onDismiss, 2000);
  }

  function handleDiscard() {
    localStorage.removeItem('kitchencalc-store');
    onDismiss();
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000, width: '100%', maxWidth: 520,
      background: 'rgba(61,26,120,0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(78,205,196,0.4)',
      borderRadius: 16, padding: '16px 20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {status === 'done' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#4ecdc4' }}>
          <CheckCircle size={20} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Migration complete! Your data is now in the cloud.</span>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Database size={20} color="#4ecdc4" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0 }}>
                Local data detected
              </p>
              <p style={{ color: 'rgba(212,195,240,0.75)', fontSize: 12, margin: '4px 0 0', lineHeight: 1.5 }}>
                You have existing KitchenCalc data saved locally. Would you like to move it to your account?
              </p>
            </div>
          </div>

          {status === 'error' && (
            <p style={{ color: '#fca5a5', fontSize: 12, margin: 0 }}>
              Migration failed: {errorMsg}. Please try again or start fresh.
            </p>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={handleDiscard}
              disabled={status === 'migrating'}
              style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)',
                background: 'transparent', color: '#fca5a5', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}>
              <Trash2 size={13} /> Start Fresh
            </button>
            <button onClick={handleMigrate}
              disabled={status === 'migrating'}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, #4ecdc4, #38b2ac)',
                color: 'white', fontSize: 12, fontWeight: 700,
                cursor: status === 'migrating' ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                opacity: status === 'migrating' ? 0.7 : 1,
              }}>
              {status === 'migrating'
                ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Migrating...</>
                : <><ArrowRight size={13} /> Move to my account</>
              }
            </button>
          </div>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
