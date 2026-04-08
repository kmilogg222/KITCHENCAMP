import React, { useState } from 'react';
import { Save, X, Trash2 } from 'lucide-react';

// Preset palette for the color picker
const COLOR_PALETTE = [
    '#6b3fa0', '#4ecdc4', '#10b981', '#f59e0b', '#ef4444',
    '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
    '#06b6d4', '#84cc16', '#a855f7', '#0ea5e9', '#d97706',
];

const inputSx = {
    padding: '8px 11px', borderRadius: 9, fontSize: 13,
    border: '1.5px solid rgba(155,109,202,0.3)', outline: 'none',
    background: 'rgba(255,255,255,0.85)', color: '#1f2937', width: '100%',
};

export function SupplierModal({ supplier, existingIds, onSave, onClose }) {
    const isNew = !supplier.id;
    const [form, setForm] = useState({
        id: supplier.id ?? '',
        name: supplier.name ?? '',
        contact: supplier.contact ?? '',
        email: supplier.email ?? '',
        phone: supplier.phone ?? '',
        color: supplier.color ?? '#6b3fa0',
        notes: supplier.notes ?? '',
    });
    const [errors, setErrors] = useState({});

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = 'Required';
        if (isNew) {
            const rawId = form.id.trim() || form.name.trim().replace(/\s+/g, '');
            if (!rawId) e.id = 'Required';
            else if (existingIds.includes(rawId)) e.id = 'ID already exists';
        }
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
            e.email = 'Invalid email';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        const id = isNew
            ? (form.id.trim() || form.name.trim().replace(/\s+/g, ''))
            : supplier.id;
        onSave({
            id,
            name: form.name.trim(),
            contact: form.contact.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            color: form.color,
            notes: form.notes.trim(),
        });
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(61,26,120,0.35)',
            backdropFilter: 'blur(6px)', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
            <div className="glass-card fade-in-up" style={{ width: '100%', maxWidth: 540, padding: 28, position: 'relative' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#3d1a78' }}>
                            {isNew ? '➕ New Supplier' : '✏️ Edit Supplier'}
                        </h2>
                        <p style={{ margin: 0, fontSize: 12, color: '#9b6dca' }}>
                            {isNew ? 'Add a new supplier to the catalog' : `Editing: ${supplier.name}`}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(107,63,160,0.1)', border: 'none', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={16} color="#6b3fa0" />
                    </button>
                </div>

                {/* Name + ID */}
                <div style={{ display: 'grid', gridTemplateColumns: isNew ? '2fr 1fr' : '1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Name *</label>
                        <input
                            value={form.name}
                            onChange={e => {
                                set('name', e.target.value);
                                if (isNew && !form.id) set('id', e.target.value.replace(/\s+/g, ''));
                            }}
                            placeholder="e.g. SISCO Foods"
                            style={inputSx}
                        />
                        {errors.name && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.name}</span>}
                    </div>
                    {isNew && (
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>ID (key)</label>
                            <input value={form.id} onChange={e => set('id', e.target.value.trim())} placeholder="SISCO" style={inputSx} />
                            {errors.id && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.id}</span>}
                        </div>
                    )}
                </div>

                {/* Website + Email */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Website</label>
                        <input value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="sisco.com" style={inputSx} />
                    </div>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Email</label>
                        <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="orders@sisco.com" style={inputSx} />
                        {errors.email && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.email}</span>}
                    </div>
                </div>

                {/* Phone + Notes */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Phone</label>
                        <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 555 000 0000" style={inputSx} />
                    </div>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Notes</label>
                        <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes…" style={inputSx} />
                    </div>
                </div>

                {/* Color picker */}
                <div style={{ marginBottom: 22 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                        Brand Color
                    </label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        {COLOR_PALETTE.map(c => (
                            <button key={c} onClick={() => set('color', c)} style={{
                                width: 28, height: 28, borderRadius: 8, background: c, border: 'none', cursor: 'pointer',
                                outline: form.color === c ? `3px solid ${c}` : 'none',
                                outlineOffset: 2,
                                transform: form.color === c ? 'scale(1.2)' : 'scale(1)',
                                transition: 'all 0.15s',
                                boxShadow: form.color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none',
                            }} />
                        ))}
                        {/* Custom hex input */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
                            <input
                                type="color"
                                value={form.color}
                                onChange={e => set('color', e.target.value)}
                                style={{ width: 32, height: 32, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'none', padding: 0 }}
                            />
                            <span style={{ fontSize: 12, color: '#9b6dca', fontFamily: 'monospace' }}>{form.color}</span>
                        </div>
                    </div>
                    {/* Preview strip */}
                    <div style={{
                        marginTop: 10, height: 6, borderRadius: 99,
                        background: `linear-gradient(135deg, ${form.color}, ${form.color}88)`,
                        transition: 'background 0.3s',
                    }} />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} className="btn-ghost">Cancel</button>
                    <button onClick={handleSave} className="btn-primary">
                        <Save size={15} /> {isNew ? 'Add Supplier' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function DeleteConfirmModal({ supplier, ingredientCount, onConfirm, onClose }) {
    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(61,26,120,0.35)',
            backdropFilter: 'blur(6px)', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
            <div className="glass-card fade-in-up" style={{ width: '100%', maxWidth: 420, padding: 28 }}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                    <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#3d1a78' }}>
                        Delete "{supplier.name}"?
                    </h2>
                    {ingredientCount > 0 ? (
                        <p style={{ margin: 0, fontSize: 13, color: '#ef4444', fontWeight: 600 }}>
                            This supplier is linked to <strong>{ingredientCount}</strong> ingredient(s).
                            Those ingredients will keep their supplier label but the supplier profile will be removed.
                        </p>
                    ) : (
                        <p style={{ margin: 0, fontSize: 13, color: '#9b6dca' }}>
                            This action cannot be undone.
                        </p>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button onClick={onClose} className="btn-ghost">Cancel</button>
                    <button onClick={onConfirm} style={{
                        background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: 'white',
                        border: 'none', borderRadius: 12, padding: '10px 20px',
                        fontWeight: 600, fontSize: 14, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}>
                        <Trash2 size={15} /> Yes, Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
