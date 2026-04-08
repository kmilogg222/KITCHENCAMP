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
import { useState } from 'react';
import { ExternalLink, Mail, Plus, Pencil, Trash2, Search, Phone, Building2 } from 'lucide-react';
import { SupplierModal, DeleteConfirmModal } from '../components/suppliers/SupplierModals';

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputSx = {
    padding: '8px 11px', borderRadius: 9, fontSize: 13,
    border: '1.5px solid rgba(155,109,202,0.3)', outline: 'none',
    background: 'rgba(255,255,255,0.85)', color: '#1f2937', width: '100%',
};

import { useKitchen } from '../context/KitchenContext';

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function SuppliersView() {
    const {
        suppliers = [],
        ingredients = [],
        addSupplier: onAddSupplier,
        updateSupplier: onUpdateSupplier,
        deleteSupplier: onDeleteSupplier
    } = useKitchen();
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState(null);      // null | {} (new) | supplier (edit)
    const [deleteTarget, setDeleteTarget] = useState(null);

    // How many ingredients each supplier owns
    const ingredientCountFor = (supId) =>
        ingredients.filter(i => i.supplier === supId).length;

    // Which ingredient names a supplier owns
    const ingredientNamesFor = (supId) =>
        ingredients.filter(i => i.supplier === supId).map(i => i.name);

    const filtered = suppliers.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        (s.email ?? '').toLowerCase().includes(search.toLowerCase())
    );

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
                                        style={{
                                            background: 'rgba(107,63,160,0.1)', border: 'none', borderRadius: 9,
                                            width: 32, height: 32, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'background 0.2s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(107,63,160,0.2)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(107,63,160,0.1)'}
                                    >
                                        <Pencil size={14} color="#6b3fa0" />
                                    </button>
                                    <button
                                        onClick={() => setDeleteTarget(sup)}
                                        title="Delete supplier"
                                        style={{
                                            background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 9,
                                            width: 32, height: 32, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'background 0.2s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
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
