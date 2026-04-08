/**
 * @file SuppliersView.jsx
 * @description Gestión completa de proveedores (CRUD).
 *
 * Sub-componentes internos:
 *  - SupplierModal      : Modal para crear o editar un supplier.
 *  - DeleteConfirmModal : Modal de confirmación antes de eliminar.
 *
 * Funcionalidades:
 *  - Grid de tarjetas con info de contacto y lista de ingredientes vinculados.
 *  - Color picker con paleta preset + selector de color nativo.
 *  - Autocompletar el campo ID a partir del nombre al crear.
 *  - Validación de email y de ID duplicado.
 *  - Advertencia al eliminar un supplier con ingredientes vinculados.
 *
 * Props:
 *  - suppliers        {Supplier[]} - Lista global de suppliers.
 *  - ingredients      {Ingredient[]} - Para calcular ingredientes vinculados.
 *  - onAddSupplier    {Function}   - Agrega supplier al estado global.
 *  - onUpdateSupplier {Function}   - Actualiza supplier en el estado global.
 *  - onDeleteSupplier {Function}   - Elimina supplier del estado global.
 */
import { useState, useMemo } from 'react';
import { ExternalLink, Mail, Plus, Pencil, Trash2, Save, X, Search, Phone, Building2 } from 'lucide-react';
import { INPUT_STYLE, SUPPLIER_COLOR_PALETTE } from '../constants/theme';
import { useStore } from '../store/useStore';

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputSx = INPUT_STYLE;

// Alias for backward compatibility within this file
const COLOR_PALETTE = SUPPLIER_COLOR_PALETTE;

// ── Supplier Modal ─────────────────────────────────────────────────────────────
function SupplierModal({ supplier, existingIds, onSave, onClose }) {
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

// ── Delete confirmation modal ──────────────────────────────────────────────────
function DeleteConfirmModal({ supplier, ingredientCount, onConfirm, onClose }) {
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

export default function SuppliersView() {
    const suppliers = useStore(state => state.suppliers);
    const ingredients = useStore(state => state.ingredients);
    const onAddSupplier = useStore(state => state.addSupplier);
    const onUpdateSupplier = useStore(state => state.updateSupplier);
    const onDeleteSupplier = useStore(state => state.deleteSupplier);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState(null);      // null | {} (new) | supplier (edit)
    const [deleteTarget, setDeleteTarget] = useState(null);

    // How many ingredients each supplier owns
    const ingredientCountFor = (supId) =>
        ingredients.filter(i => i.supplier === supId).length;

    // Which ingredient names a supplier owns
    const ingredientNamesFor = (supId) =>
        ingredients.filter(i => i.supplier === supId).map(i => i.name);

    const filtered = useMemo(() => suppliers.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        (s.email ?? '').toLowerCase().includes(search.toLowerCase())
    ), [suppliers, search]);

    const totalIngredients = ingredients.length;
    const totalSuppliers = suppliers.length;

    const handleSave = (sup) => {
        const exists = suppliers.some(s => s.id === sup.id);
        if (exists) onUpdateSupplier(sup);
        else onAddSupplier(sup);
        setModal(null);
    };

    const handleDeleteConfirm = () => {
        onDeleteSupplier(deleteTarget.id);
        setDeleteTarget(null);
    };

    return (
        <div className="fade-in-up">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: '#3d1a78', margin: 0 }}>
                        🚚 Suppliers
                    </h1>
                    <p style={{ fontSize: 13, color: '#9b6dca', margin: '4px 0 0' }}>
                        {totalSuppliers} supplier{totalSuppliers !== 1 ? 's' : ''} · {totalIngredients} ingredients linked
                    </p>
                </div>
                <button onClick={() => setModal({})} className="btn-primary">
                    <Plus size={16} /> New Supplier
                </button>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
                {[
                    { label: 'Total Suppliers', value: totalSuppliers, color: '#6b3fa0', icon: '🏭' },
                    { label: 'Ingredients Covered', value: totalIngredients, color: '#10b981', icon: '🧂' },
                    { label: 'Avg. Ingredients', value: totalSuppliers ? (totalIngredients / totalSuppliers).toFixed(1) : 0, color: '#f59e0b', icon: '📊' },
                ].map(({ label, value, color, icon }) => (
                    <div key={label} className="glass-card" style={{ padding: 16 }}>
                        <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
                        <div style={{ fontSize: 11, color: '#9b6dca', fontWeight: 500 }}>{label}</div>
                    </div>
                ))}
            </div>

            {/* Search bar */}
            <div className="glass-card" style={{ padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9b6dca' }} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name, ID or email…"
                        style={{ ...inputSx, paddingLeft: 32 }}
                    />
                </div>
            </div>

            {/* Empty state */}
            {filtered.length === 0 && (
                <div className="glass-card" style={{ padding: 56, textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>
                        {search ? '🔍' : '🏭'}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#3d1a78', marginBottom: 6 }}>
                        {search ? 'No suppliers match your search' : 'No suppliers yet'}
                    </div>
                    <div style={{ fontSize: 13, color: '#9b6dca', marginBottom: 20 }}>
                        {search ? 'Try a different term' : 'Add your first supplier to get started'}
                    </div>
                    {!search && (
                        <button onClick={() => setModal({})} className="btn-primary">
                            <Plus size={15} /> Add First Supplier
                        </button>
                    )}
                </div>
            )}

            {/* Supplier cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                {filtered.map(sup => {
                    const color = sup.color ?? '#6b3fa0';
                    const ingNames = ingredientNamesFor(sup.id);
                    const ingCount = ingNames.length;

                    return (
                        <div key={sup.id} className="glass-card" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>

                            {/* Color accent strip */}
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                                background: `linear-gradient(135deg, ${color}, ${color}88)`,
                            }} />

                            {/* Top row: avatar + actions */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                                <div style={{
                                    width: 52, height: 52, borderRadius: 16,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: `${color}18`, fontSize: 24, border: `2px solid ${color}33`,
                                }}>
                                    🏭
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                        onClick={() => setModal(sup)}
                                        title="Edit supplier"
                                        className="hover-action-edit"
                                        style={{
                                            background: 'rgba(107,63,160,0.1)', border: 'none', borderRadius: 9,
                                            width: 32, height: 32, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'background 0.2s',
                                        }}
                                    >
                                        <Pencil size={14} color="#6b3fa0" />
                                    </button>
                                    <button
                                        onClick={() => setDeleteTarget(sup)}
                                        title="Delete supplier"
                                        className="hover-action-delete"
                                        style={{
                                            background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 9,
                                            width: 32, height: 32, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'background 0.2s',
                                        }}
                                    >
                                        <Trash2 size={14} color="#ef4444" />
                                    </button>
                                </div>
                            </div>

                            {/* Name + ID badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <div style={{ fontWeight: 800, fontSize: 17, color: '#3d1a78' }}>{sup.name}</div>
                                <span style={{
                                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                                    background: `${color}18`, color,
                                }}>
                                    {sup.id}
                                </span>
                            </div>

                            {/* Contact info */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
                                {sup.contact && (
                                    <a href={`https://${sup.contact}`} target="_blank" rel="noreferrer"
                                        style={{ fontSize: 12, color, display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontWeight: 500 }}>
                                        <ExternalLink size={12} />{sup.contact}
                                    </a>
                                )}
                                {sup.email && (
                                    <span style={{ fontSize: 12, color: '#9b6dca', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Mail size={12} />{sup.email}
                                    </span>
                                )}
                                {sup.phone && (
                                    <span style={{ fontSize: 12, color: '#9b6dca', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Phone size={12} />{sup.phone}
                                    </span>
                                )}
                                {!sup.contact && !sup.email && !sup.phone && (
                                    <span style={{ fontSize: 12, color: '#c4b5d9', fontStyle: 'italic' }}>No contact info</span>
                                )}
                            </div>

                            {/* Notes */}
                            {sup.notes && (
                                <div style={{
                                    fontSize: 12, color: '#6b7280', background: 'rgba(107,63,160,0.05)',
                                    borderRadius: 8, padding: '6px 10px', marginBottom: 14,
                                    borderLeft: `3px solid ${color}55`,
                                }}>
                                    {sup.notes}
                                </div>
                            )}

                            {/* Separator */}
                            <div style={{ height: 1, background: 'rgba(155,109,202,0.15)', marginBottom: 12 }} />

                            {/* Ingredient chips */}
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#9b6dca', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                                <Building2 size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                Ingredients ({ingCount})
                            </div>
                            {ingCount > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {ingNames.map(n => (
                                        <span key={n} className="chip" style={{ background: `${color}18`, color }}>
                                            {n}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <span style={{ fontSize: 12, color: '#c4b5d9', fontStyle: 'italic' }}>
                                    No ingredients linked
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Supplier Modal */}
            {modal !== null && (
                <SupplierModal
                    supplier={modal}
                    existingIds={suppliers.map(s => s.id)}
                    onSave={handleSave}
                    onClose={() => setModal(null)}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <DeleteConfirmModal
                    supplier={deleteTarget}
                    ingredientCount={ingredientCountFor(deleteTarget.id)}
                    onConfirm={handleDeleteConfirm}
                    onClose={() => setDeleteTarget(null)}
                />
            )}
        </div>
    );
}
