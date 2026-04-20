/**
 * @file ImportPreviewModal.jsx
 * @description Modal de preview antes de confirmar un import.
 * Muestra conteos por entidad, items inválidos, y permite elegir estrategia de conflicto.
 */
import { useState } from 'react';
import { X, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import { useStore } from '../store/useStore';
import { commitImport, ENTITY_REGISTRY, CONFLICT_STRATEGIES } from '../lib/io';

export default function ImportPreviewModal({ preview, meta, onClose }) {
  const [strategy, setStrategy] = useState('skip');
  const [isImporting, setIsImporting] = useState(false);
  const [expandedEntity, setExpandedEntity] = useState(null);
  const [result, setResult] = useState(null);

  const addToast = useStore(s => s.addToast);

  // Calcular totales
  const entityKeys = Object.keys(preview).filter(k => ENTITY_REGISTRY[k]);
  let totalToImport = 0;
  let totalInvalid = 0;
  let totalDuplicates = 0;

  for (const key of entityKeys) {
    const p = preview[key];
    if (p.isCalendar) {
      totalToImport += p.newCount;
    } else {
      totalToImport += p.valid?.length ?? 0;
      totalInvalid += p.invalid?.length ?? 0;
      totalDuplicates += p.duplicateCount ?? 0;
    }
  }

  // ── Import handler ──
  const handleImport = async () => {
    setIsImporting(true);
    try {
      const storeSnapshot = useStore.getState();
      const storeActions = {
        addSupplier:       useStore.getState().addSupplier,
        updateSupplier:    useStore.getState().updateSupplier,
        addIngredient:     useStore.getState().addIngredient,
        updateIngredient:  useStore.getState().updateIngredient,
        addRecipe:         useStore.getState().addRecipe,
        updateRecipe:      useStore.getState().updateRecipe,
        addMenu:           useStore.getState().addMenu,
        updateMenu:        useStore.getState().updateMenu,
        setCalendarEvents: useStore.getState().setCalendarEvents,
      };

      const stats = await commitImport({ preview, strategy, storeSnapshot, storeActions });

      setResult(stats);

      if (stats.errors.length === 0) {
        addToast({
          type: 'success',
          message: `Imported ${stats.imported} items${stats.updated > 0 ? `, updated ${stats.updated}` : ''}${stats.skipped > 0 ? `, skipped ${stats.skipped} duplicates` : ''}`,
        });
      } else {
        addToast({
          type: 'error',
          message: `Import completed with ${stats.errors.length} error(s). ${stats.imported} items imported.`,
        });
      }
    } catch (err) {
      addToast({ type: 'error', message: `Import failed: ${err.message}` });
    } finally {
      setIsImporting(false);
    }
  };

  const strategyLabels = {
    skip: 'Skip duplicates (Recommended)',
    overwrite: 'Overwrite existing items',
    rename: 'Rename (add " (imported)" suffix)',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(61,26,120,0.5)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease-out',
    }} onClick={onClose}>

      <div className="glass-card" onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 560, maxHeight: '80vh', overflowY: 'auto',
        padding: '28px 32px',
        animation: 'fadeInUp 0.3s ease-out',
      }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#3d1a78' }}>Import Preview</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#9b6dca', padding: 4,
          }}>
            <X size={20} />
          </button>
        </div>

        {/* ── Meta info ── */}
        {meta && (
          <div style={{
            padding: '10px 14px', borderRadius: 10, marginBottom: 20,
            background: 'rgba(78,205,196,0.08)', border: '1px solid rgba(78,205,196,0.15)',
            fontSize: 12, color: '#0f766e',
          }}>
            KitchenCalc backup — exported {meta.exportedAt ? new Date(meta.exportedAt).toLocaleDateString() : 'unknown date'}
            {meta.version && ` — v${meta.version}`}
          </div>
        )}

        {/* ── Entity preview table ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {entityKeys.map(key => {
            const def = ENTITY_REGISTRY[key];
            const p = preview[key];
            const isCalendar = p.isCalendar;
            const validCount = isCalendar ? p.newCount : (p.valid?.length ?? 0);
            const invalidCount = isCalendar ? 0 : (p.invalid?.length ?? 0);
            const dupCount = p.duplicateCount ?? 0;
            const isExpanded = expandedEntity === key;

            return (
              <div key={key} style={{
                padding: '12px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.5)',
                border: `1px solid ${invalidCount > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(155,109,202,0.12)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{def.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#3d1a78' }}>{def.label}</div>
                    <div style={{ fontSize: 11, color: '#9b6dca' }}>
                      {isCalendar
                        ? `${validCount} day(s) of events`
                        : `${validCount} to add${dupCount > 0 ? `, ${dupCount} duplicate(s)` : ''}${invalidCount > 0 ? `, ${invalidCount} invalid` : ''}`
                      }
                    </div>
                  </div>
                  {invalidCount > 0 ? (
                    <AlertTriangle size={16} color="#f59e0b" />
                  ) : (
                    <CheckCircle size={16} color="#10b981" />
                  )}
                  {invalidCount > 0 && (
                    <button
                      onClick={() => setExpandedEntity(isExpanded ? null : key)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9b6dca', padding: 2 }}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>

                {/* Expanded: show invalid items */}
                {isExpanded && !isCalendar && p.invalid?.length > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(155,109,202,0.12)' }}>
                    {p.invalid.map((inv, i) => (
                      <div key={i} style={{ fontSize: 11, color: '#ef4444', marginBottom: 4 }}>
                        <strong>{inv.item?.name || `Item #${i + 1}`}:</strong>{' '}
                        {inv.errors.join('; ')}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Conflict strategy (solo si hay duplicados) ── */}
        {totalDuplicates > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#6b3fa0', marginBottom: 8 }}>
              Conflict strategy ({totalDuplicates} duplicate{totalDuplicates !== 1 && 's'})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {CONFLICT_STRATEGIES.map(s => (
                <label key={s} style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  padding: '8px 12px', borderRadius: 10,
                  background: strategy === s ? 'rgba(78,205,196,0.1)' : 'transparent',
                  border: strategy === s ? '1px solid rgba(78,205,196,0.3)' : '1px solid transparent',
                  transition: 'all 0.15s',
                }}>
                  <input
                    type="radio"
                    name="conflict-strategy"
                    value={s}
                    checked={strategy === s}
                    onChange={() => setStrategy(s)}
                    style={{ accentColor: '#4ecdc4' }}
                  />
                  <span style={{ fontSize: 13, color: '#3d1a78', fontWeight: strategy === s ? 600 : 400 }}>
                    {strategyLabels[s]}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ── Summary warning ── */}
        <div style={{
          padding: '10px 14px', borderRadius: 10, marginBottom: 20,
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)',
          fontSize: 12, color: '#92400e',
        }}>
          This will create up to <strong>{totalToImport}</strong> new item{totalToImport !== 1 && 's'} across <strong>{entityKeys.length}</strong> collection{entityKeys.length !== 1 && 's'}.
          {totalInvalid > 0 && ` ${totalInvalid} invalid item${totalInvalid !== 1 && 's'} will be skipped.`}
        </div>

        {/* ── Result (after import) ── */}
        {result && (
          <div style={{
            padding: '12px 14px', borderRadius: 10, marginBottom: 16,
            background: result.errors.length === 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${result.errors.length === 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: result.errors.length === 0 ? '#10b981' : '#ef4444', marginBottom: 4 }}>
              {result.errors.length === 0 ? '✓ Import complete!' : '⚠ Import completed with errors'}
            </div>
            <div style={{ fontSize: 12, color: '#6b3fa0' }}>
              {result.imported} imported, {result.updated} updated, {result.skipped} skipped
            </div>
            {result.errors.map((err, i) => (
              <div key={i} style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{err}</div>
            ))}
          </div>
        )}

        {/* ── Action buttons ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose}>
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button
              className="btn-primary"
              onClick={handleImport}
              disabled={isImporting || totalToImport === 0}
              style={{
                opacity: totalToImport === 0 ? 0.5 : 1,
                cursor: totalToImport === 0 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {isImporting ? (
                <>
                  <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  Importing...
                </>
              ) : (
                `Import ${totalToImport} item${totalToImport !== 1 ? 's' : ''}`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
