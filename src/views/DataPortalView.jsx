/**
 * @file DataPortalView.jsx
 * @description Vista principal del portal de datos (Import/Export).
 * Accesible desde /data en la sidebar.
 *
 * Secciones:
 * 1. EXPORT — seleccionar entidades + formato → descargar archivo
 * 2. IMPORT — drop zone + preview modal → importar datos
 */
import { useState, useRef, useCallback } from 'react';
import { Download, Upload, FileJson, Check, Database, ArrowUpDown, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { exportData, previewImport, ENTITY_REGISTRY, FORMAT_REGISTRY } from '../lib/io';
import ImportPreviewModal from '../components/ImportPreviewModal';

const ENTITY_KEYS = Object.keys(ENTITY_REGISTRY);

export default function DataPortalView() {
  // ── State ──
  const [selectedEntities, setSelectedEntities] = useState(
    ENTITY_KEYS.reduce((acc, k) => ({ ...acc, [k]: k !== 'calendar' }), {})
  );
  const [format] = useState('json');  // Solo JSON por ahora
  const [isExporting, setIsExporting] = useState(false);
  const [exportedFile, setExportedFile] = useState(null);

  // Import state
  const [importPreview, setImportPreview] = useState(null);
  const [importMeta, setImportMeta] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const fileInputRef = useRef(null);

  // Store
  const addToast = useStore(s => s.addToast);

  // ── Entity counts from store ──
  const counts = {};
  for (const key of ENTITY_KEYS) {
    const storeKey = ENTITY_REGISTRY[key].storeKey;
    const data = useStore(s => s[storeKey]);
    counts[key] = Array.isArray(data) ? data.length : Object.keys(data ?? {}).length;
  }

  // ── Export handler ──
  const handleExport = () => {
    const selected = ENTITY_KEYS.filter(k => selectedEntities[k]);
    if (selected.length === 0) {
      addToast({ type: 'error', message: 'Select at least one entity to export' });
      return;
    }

    setIsExporting(true);
    try {
      const storeData = useStore.getState();
      const fileName = exportData({ entityKeys: selected, format, storeData });
      setExportedFile(fileName);
      addToast({ type: 'success', message: `Exported: ${fileName}` });
    } catch (err) {
      addToast({ type: 'error', message: `Export failed: ${err.message}` });
    } finally {
      setIsExporting(false);
    }
  };

  // ── Toggle entity selection ──
  const toggleEntity = (key) => {
    setSelectedEntities(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = () => {
    setSelectedEntities(ENTITY_KEYS.reduce((acc, k) => ({ ...acc, [k]: true }), {}));
  };

  const selectNone = () => {
    setSelectedEntities(ENTITY_KEYS.reduce((acc, k) => ({ ...acc, [k]: false }), {}));
  };

  // ── File reading (for import) ──
  const readFile = useCallback((file) => {
    if (!file) return;
    setIsReading(true);
    setImportErrors([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const storeSnapshot = useStore.getState();
        const result = previewImport({
          fileContent: e.target.result,
          fileName: file.name,
          storeSnapshot,
        });

        if (!result.ok) {
          setImportErrors(result.errors);
        } else {
          setImportPreview(result.preview);
          setImportMeta(result.meta);
        }
      } catch (err) {
        setImportErrors([err.message]);
      } finally {
        setIsReading(false);
      }
    };
    reader.onerror = () => {
      setImportErrors(['Could not read file']);
      setIsReading(false);
    };
    reader.readAsText(file);
  }, []);

  // ── Drag & drop handlers ──
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) readFile(file);
  };
  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
    e.target.value = '';  // Reset para permitir reimport del mismo archivo
  };

  // ── Close import modal ──
  const closeImportModal = () => {
    setImportPreview(null);
    setImportMeta(null);
    setImportErrors([]);
  };

  // ── Derived ──
  const selectedCount = ENTITY_KEYS.filter(k => selectedEntities[k]).length;
  const totalItems = ENTITY_KEYS.filter(k => selectedEntities[k]).reduce((sum, k) => sum + counts[k], 0);

  return (
    <div className="fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ── Header ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, #6b3fa0, #4ecdc4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Database size={22} color="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#3d1a78' }}>Data Portal</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#9b6dca' }}>Export backups and import data</p>
          </div>
        </div>
      </div>

      {/* ── EXPORT Section ── */}
      <div className="glass-card" style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Download size={20} color="#4ecdc4" />
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#3d1a78' }}>Export your data</h2>
        </div>

        {/* Entity selector grid */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#6b3fa0' }}>Select entities:</span>
            <button onClick={selectAll} style={linkBtnStyle}>Select all</button>
            <button onClick={selectNone} style={linkBtnStyle}>Clear</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
            {ENTITY_KEYS.map(key => {
              const def = ENTITY_REGISTRY[key];
              const selected = selectedEntities[key];
              return (
                <button
                  key={key}
                  onClick={() => toggleEntity(key)}
                  className="hover-lift"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
                    background: selected ? 'rgba(78, 205, 196, 0.12)' : 'rgba(255,255,255,0.5)',
                    border: selected ? '1.5px solid rgba(78,205,196,0.5)' : '1.5px solid rgba(155,109,202,0.15)',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{def.icon}</span>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: selected ? '#0f766e' : '#6b3fa0' }}>
                      {def.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#9b6dca' }}>
                      {counts[key]} {counts[key] === 1 ? 'item' : 'items'}
                    </div>
                  </div>
                  {selected && (
                    <div style={{
                      width: 22, height: 22, borderRadius: 7,
                      background: 'linear-gradient(135deg, #4ecdc4, #38b2ac)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Check size={14} color="white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Format info */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 10,
          background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)',
          marginBottom: 20,
        }}>
          <FileJson size={16} color="#3b82f6" />
          <span style={{ fontSize: 12, color: '#3b82f6', fontWeight: 500 }}>
            JSON format — complete backup, lossless. Includes all nested data.
          </span>
        </div>

        {/* Export button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            className="btn-primary"
            onClick={handleExport}
            disabled={selectedCount === 0 || isExporting}
            style={{
              opacity: selectedCount === 0 ? 0.5 : 1,
              cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
              padding: '12px 24px', fontSize: 14,
            }}
          >
            <Download size={16} />
            {isExporting ? 'Exporting...' : `Export ${selectedCount} ${selectedCount === 1 ? 'entity' : 'entities'} (${totalItems} items)`}
          </button>

          {exportedFile && (
            <span style={{ fontSize: 12, color: '#10b981', fontWeight: 500 }}>
              ✓ {exportedFile}
            </span>
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(155,109,202,0.3), transparent)' }} />

      {/* ── IMPORT Section ── */}
      <div className="glass-card" style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Upload size={20} color="#6b3fa0" />
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#3d1a78' }}>Import data</h2>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? '#4ecdc4' : 'rgba(155,109,202,0.3)'}`,
            borderRadius: 16, padding: '40px 20px',
            textAlign: 'center', cursor: 'pointer',
            background: isDragging ? 'rgba(78,205,196,0.08)' : 'rgba(255,255,255,0.3)',
            transition: 'all 0.25s',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />

          {isReading ? (
            <div style={{ color: '#9b6dca' }}>
              <div style={{
                width: 36, height: 36, border: '3px solid rgba(155,109,202,0.2)',
                borderTopColor: '#4ecdc4', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 12px',
              }} />
              <p style={{ fontSize: 13 }}>Reading file...</p>
            </div>
          ) : (
            <>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(107,63,160,0.12), rgba(78,205,196,0.12))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <Upload size={24} color="#6b3fa0" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#3d1a78', margin: '0 0 4px' }}>
                Drop a backup file here, or click to browse
              </p>
              <p style={{ fontSize: 12, color: '#9b6dca', margin: 0 }}>
                Supports .json files exported from KitchenCalc
              </p>
            </>
          )}
        </div>

        {/* Import errors */}
        {importErrors.length > 0 && (
          <div style={{
            marginTop: 16, padding: '12px 16px', borderRadius: 12,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          }}>
            {importErrors.map((err, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#ef4444' }}>
                <AlertCircle size={14} />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}

        {/* Info note */}
        <p style={{ marginTop: 16, fontSize: 12, color: '#9b6dca', fontStyle: 'italic' }}>
          Importing adds new items to your data. You can choose how to handle duplicates in the next step.
        </p>
      </div>

      {/* ── Import Preview Modal ── */}
      {importPreview && (
        <ImportPreviewModal
          preview={importPreview}
          meta={importMeta}
          onClose={closeImportModal}
        />
      )}
    </div>
  );
}

// ── Style helpers ──
const linkBtnStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#4ecdc4', fontSize: 12, fontWeight: 600,
  textDecoration: 'underline', padding: 0,
};
