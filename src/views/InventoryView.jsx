/**
 * @file InventoryView.jsx
 * @description Gestión del catálogo global de ingredientes.
 *
 * Sub-componentes internos:
 *  - StockStepper     : Incrementa/decrementa el stock de un pack.
 *  - IngredientModal  : Modal para crear o editar un ingrediente.
 *
 * Funcionalidades:
 *  - Tabla filtrable por nombre, supplier y nivel de stock.
 *  - Indicador visual de stock bajo (barra de progreso + borde rojo).
 *  - CRUD completo: crear, editar, eliminar con doble confirmación.
 *
 * Props:
 *  - ingredients        {Ingredient[]} - Catálogo de ingredientes.
 *  - recipes            {Recipe[]}     - Para mostrar en qué recetas se usa cada ingrediente.
 *  - suppliers          {Supplier[]}   - Para colores y dropdown de selección.
 *  - onUpdateIngredient {Function}     - Actualiza un ingrediente en App.
 *  - onAddIngredient    {Function}     - Agrega un ingrediente al catálogo.
 *  - onDeleteIngredient {Function}     - Elimina un ingrediente del catálogo.
 */
import { useState } from 'react';
import { List } from 'react-window';
import {
    Plus, Pencil, Trash2, Save, X, AlertTriangle,
    CheckCircle2, ChevronUp, ChevronDown, Search
} from 'lucide-react';

const UNITS = ['g', 'ml', 'units', 'kg', 'L', 'oz'];

// ── Shared input styles ───────────────────────────────────────────────────────
const inputSx = {
    padding: '7px 10px', borderRadius: 8, fontSize: 13,
    border: '1.5px solid rgba(155,109,202,0.3)', outline: 'none',
    background: 'rgba(255,255,255,0.85)', color: '#1f2937', width: '100%',
};

// ── Stock stepper ─────────────────────────────────────────────────────────────
function StockStepper({ value, onChange }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => onChange(Math.max(0, value - 1))}
                style={{ background: 'rgba(107,63,160,0.1)', border: 'none', borderRadius: 6, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronDown size={14} color="#6b3fa0" />
            </button>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#3d1a78', minWidth: 28, textAlign: 'center' }}>{value}</span>
            <button onClick={() => onChange(value + 1)}
                style={{ background: 'rgba(107,63,160,0.1)', border: 'none', borderRadius: 6, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronUp size={14} color="#6b3fa0" />
            </button>
        </div>
    );
}

// ── Add / Edit ingredient modal ───────────────────────────────────────────────
function IngredientModal({ ingredient, supplierIds = [], onSave, onClose }) {
    const isNew = !ingredient.id;
    const [form, setForm] = useState({
        name: ingredient.name ?? '',
        unit: ingredient.unit ?? 'g',
        packSize: ingredient.packSize ?? '',
        currentStock: ingredient.currentStock ?? 0,
        minOrder: ingredient.minOrder ?? 1,
        supplier: ingredient.supplier ?? 'SISCO',
        pricePerPack: ingredient.pricePerPack ?? '',
        substitutable: ingredient.substitutable ?? false,
        substitute: ingredient.substitute ?? '',
    });
    const [errors, setErrors] = useState({});

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = 'Required';
        if (!form.packSize || Number(form.packSize) <= 0) e.packSize = 'Must be > 0';
        if (!form.pricePerPack || Number(form.pricePerPack) < 0) e.pricePerPack = 'Required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        onSave({
            ...ingredient,
            id: ingredient.id ?? `ing-${Date.now()}`,
            name: form.name.trim(),
            unit: form.unit,
            packSize: Number(form.packSize),
            currentStock: Number(form.currentStock),
            minOrder: Number(form.minOrder) || 1,
            supplier: form.supplier,
            pricePerPack: Number(form.pricePerPack),
            substitutable: form.substitutable,
            substitute: form.substitutable ? form.substitute : null,
        });
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(61,26,120,0.35)',
            backdropFilter: 'blur(6px)', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
            <div className="glass-card fade-in-up" style={{ width: '100%', maxWidth: 560, padding: 28, position: 'relative' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#3d1a78' }}>
                            {isNew ? '➕ New Ingredient' : '✏️ Edit Ingredient'}
                        </h2>
                        <p style={{ margin: 0, fontSize: 12, color: '#9b6dca' }}>
                            {isNew ? 'Add to the global ingredient catalog' : `Editing: ${ingredient.name}`}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(107,63,160,0.1)', border: 'none', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={16} color="#6b3fa0" />
                    </button>
                </div>

                {/* Name + Unit */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Name *</label>
                        <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Chicken Breast" style={inputSx} />
                        {errors.name && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.name}</span>}
                    </div>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Unit</label>
                        <select value={form.unit} onChange={e => set('unit', e.target.value)} style={inputSx}>
                            {UNITS.map(u => <option key={u}>{u}</option>)}
                        </select>
                    </div>
                </div>

                {/* Pack, Stock, Min, Price */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
                    {[
                        { key: 'packSize', label: `Pack (${form.unit}) *`, ph: '2000' },
                        { key: 'currentStock', label: 'Stock (packs)', ph: '0' },
                        { key: 'minOrder', label: 'Min. Order', ph: '1' },
                        { key: 'pricePerPack', label: 'Price/pack ($) *', ph: '0.00' },
                    ].map(({ key, label, ph }) => (
                        <div key={key}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{label}</label>
                            <input type="number" min={0} value={form[key]} onChange={e => set(key, e.target.value)} placeholder={ph} style={inputSx} />
                            {errors[key] && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors[key]}</span>}
                        </div>
                    ))}
                </div>

                {/* Supplier */}
                <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Supplier</label>
                    <select value={form.supplier} onChange={e => set('supplier', e.target.value)} style={inputSx}>
                        {supplierIds.map(s => <option key={s}>{s}</option>)}
                    </select>
                </div>

                {/* Substitute */}
                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#6b3fa0', fontWeight: 500, marginBottom: 6 }}>
                        <input type="checkbox" checked={form.substitutable} onChange={e => set('substitutable', e.target.checked)} style={{ accentColor: '#4ecdc4', width: 15, height: 15 }} />
                        Has a substitute
                    </label>
                    {form.substitutable && (
                        <input value={form.substitute} onChange={e => set('substitute', e.target.value)} placeholder="Substitute name…" style={inputSx} />
                    )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} className="btn-ghost">Cancel</button>
                    <button onClick={handleSave} className="btn-primary">
                        <Save size={15} /> {isNew ? 'Add to Catalog' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

import { useKitchen } from '../context/KitchenContext';

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function InventoryView() {
    const {
        ingredients,
        recipes,
        suppliers = [],
        updateIngredient: onUpdateIngredient,
        addIngredient: onAddIngredient,
        deleteIngredient: onDeleteIngredient
    } = useKitchen();
    const SUPPLIER_IDS = suppliers.map(s => s.id);
    const [search, setSearch] = useState('');
    const [filterSupplier, setFilterSupplier] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [modal, setModal] = useState(null); // null | {} (new) | ingredient (edit)
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // Which recipes use a given ingredient
    const usedInRecipes = (ingId) =>
        recipes.filter(r => r.ingredients.some(ref => ref.ingredientId === ingId)).map(r => r.name);

    const filtered = ingredients.filter(ing => {
        const matchSearch = ing.name.toLowerCase().includes(search.toLowerCase()) ||
            ing.supplier.toLowerCase().includes(search.toLowerCase());
        const matchSupplier = filterSupplier === 'all' || ing.supplier === filterSupplier;
        const isLow = ing.currentStock <= ing.minOrder;
        const matchStatus = filterStatus === 'all' || (filterStatus === 'low' ? isLow : !isLow);
        return matchSearch && matchSupplier && matchStatus;
    });

    const lowCount = ingredients.filter(i => i.currentStock <= i.minOrder).length;

    const handleDelete = (ing) => {
        if (deleteConfirm === ing.id) {
            onDeleteIngredient(ing.id);
            setDeleteConfirm(null);
        } else {
            setDeleteConfirm(ing.id);
            setTimeout(() => setDeleteConfirm(null), 3000);
        }
    };

    const supColor = (supId) => suppliers.find(s => s.id === supId)?.color ?? '#6b3fa0';

    return (
        <div className="fade-in-up">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: '#3d1a78', margin: 0 }}>
                        📦 Inventory Management
                    </h1>
                    <p style={{ fontSize: 13, color: '#9b6dca', margin: '4px 0 0' }}>
                        Global ingredient catalog · {ingredients.length} items
                        {lowCount > 0 && <span style={{ color: '#ef4444', fontWeight: 700, marginLeft: 8 }}>⚠ {lowCount} low stock</span>}
                    </p>
                </div>
                <button onClick={() => setModal({})} className="btn-primary">
                    <Plus size={16} /> New Ingredient
                </button>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
                {[
                    { label: 'Total Items', value: ingredients.length, color: '#6b3fa0', icon: '🧂' },
                    { label: 'Low Stock', value: lowCount, color: '#ef4444', icon: '⚠️' },
                    { label: 'In Stock', value: ingredients.length - lowCount, color: '#10b981', icon: '✅' },
                    { label: 'Suppliers', value: new Set(ingredients.map(i => i.supplier)).size, color: '#f59e0b', icon: '🏭' },
                ].map(({ label, value, color, icon }) => (
                    <div key={label} className="glass-card" style={{ padding: 16 }}>
                        <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
                        <div style={{ fontSize: 11, color: '#9b6dca', fontWeight: 500 }}>{label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="glass-card" style={{ padding: 16, marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9b6dca' }} />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ingredients or supplier…"
                            style={{ ...inputSx, paddingLeft: 32 }} />
                    </div>
                    {/* Supplier filter */}
                    <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)} style={{ ...inputSx, width: 'auto' }}>
                        <option value="all">All Suppliers</option>
                        {SUPPLIER_IDS.map(s => <option key={s}>{s}</option>)}
                    </select>
                    {/* Status filter */}
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputSx, width: 'auto' }}>
                        <option value="all">All Stock</option>
                        <option value="low">Low Stock</option>
                        <option value="ok">In Stock</option>
                    </select>
                    {/* Reset */}
                    {(search || filterSupplier !== 'all' || filterStatus !== 'all') && (
                        <button onClick={() => { setSearch(''); setFilterSupplier('all'); setFilterStatus('all'); }} className="btn-ghost" style={{ fontSize: 12 }}>
                            Clear filters
                        </button>
                    )}
                </div>
            </div>

            {/* Table header */}
            <div style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 90px',
                padding: '8px 16px', marginBottom: 8,
            }}>
                {['Ingredient', 'Supplier', 'Pack Size', 'Stock', 'Min. Order', 'Price/Pack', 'Actions'].map(h => (
                    <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</div>
                ))}
            </div>

            {/* Rows */}
            {filtered.length === 0 ? (
                <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                    <div style={{ fontWeight: 600, color: '#9b6dca' }}>No ingredients match the filters</div>
                </div>
            ) : (
                <List
                    height={600}
                    itemCount={filtered.length}
                    itemSize={90}
                    width={'100%'}
                >
                    {({ index, style }) => {
                        const ing = filtered[index];
                        const isLow = ing.currentStock <= ing.minOrder;
                        const pct = Math.min((ing.currentStock / Math.max(ing.minOrder * 3, 1)) * 100, 100);
                        const usedIn = usedInRecipes(ing.id);
                        const color = supColor(ing.supplier);

                        return (
                            <div style={{ ...style, paddingBottom: 8 }}>
                                <div className="glass-card" style={{
                                    height: '100%', padding: '14px 16px',
                                    borderLeft: isLow ? '3px solid #ef4444' : '3px solid #4ecdc4',
                                }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 90px', alignItems: 'center', gap: 8 }}>

                                        {/* Name + recipes + sub */}
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                                {isLow
                                                    ? <AlertTriangle size={14} color="#ef4444" />
                                                    : <CheckCircle2 size={14} color="#4ecdc4" />}
                                                <span style={{ fontWeight: 700, fontSize: 14, color: '#3d1a78' }}>{ing.name}</span>
                                                <span style={{ fontSize: 10, color: '#9b6dca' }}>({ing.unit})</span>
                                                {ing.substitutable && (
                                                    <span className="chip chip-teal" style={{ fontSize: 10 }}>sub: {ing.substitute}</span>
                                                )}
                                            </div>
                                            {usedIn.length > 0 && (
                                                <div style={{ fontSize: 10, color: '#9b6dca', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    Used in: {usedIn.join(', ')}
                                                </div>
                                            )}
                                            {/* Stock bar */}
                                            <div style={{ height: 4, background: '#e5e7eb', borderRadius: 99, marginTop: 6, width: '80%' }}>
                                                <div style={{
                                                    height: '100%', borderRadius: 99, width: `${pct}%`,
                                                    background: isLow ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'linear-gradient(135deg,#4ecdc4,#10b981)',
                                                    transition: 'width 0.5s',
                                                }} />
                                            </div>
                                        </div>

                                        {/* Supplier */}
                                        <div>
                                            <span className="chip" style={{ background: `${color}18`, color }}>
                                                {ing.supplier}
                                            </span>
                                        </div>

                                        {/* Pack Size */}
                                        <div style={{ fontSize: 13, color: '#374151' }}>
                                            {ing.packSize.toLocaleString()} {ing.unit}
                                        </div>

                                        {/* Stock (with stepper) */}
                                        <div>
                                            <StockStepper
                                                value={ing.currentStock}
                                                onChange={v => onUpdateIngredient({ ...ing, currentStock: v })}
                                            />
                                            <div style={{ fontSize: 10, color: isLow ? '#ef4444' : '#9b6dca', fontWeight: isLow ? 700 : 400, marginTop: 2 }}>
                                                {isLow ? 'Low stock!' : 'OK'}
                                            </div>
                                        </div>

                                        {/* Min Order */}
                                        <div style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>
                                            {ing.minOrder} packs
                                        </div>

                                        {/* Price */}
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#3d1a78' }}>
                                            ${ing.pricePerPack}
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button
                                                onClick={() => setModal(ing)}
                                                title="Edit"
                                                style={{ background: 'rgba(107,63,160,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b3fa0' }}>
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(ing)}
                                                title={deleteConfirm === ing.id ? 'Confirm delete' : 'Delete'}
                                                style={{
                                                    background: deleteConfirm === ing.id ? '#fef2f2' : 'rgba(239,68,68,0.1)',
                                                    border: deleteConfirm === ing.id ? '1px solid #fca5a5' : 'none',
                                                    borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444',
                                                }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }}
                </List>
            )}

            {/* Modal */}
            {modal !== null && (
                <IngredientModal
                    ingredient={modal}
                    supplierIds={SUPPLIER_IDS}
                    onSave={(ing) => {
                        if (!ing.id || modal.id === undefined) {
                            onAddIngredient(ing);
                        } else {
                            onUpdateIngredient(ing);
                        }
                        setModal(null);
                    }}
                    onClose={() => setModal(null)}
                />
            )}
        </div>
    );
}
