import { useState } from 'react';
import {
    ChevronLeft, Plus, Trash2, Save, AlertCircle,
    CheckCircle2, Package, Smile, Link, PlusCircle,
    Users, Layers
} from 'lucide-react';

const EMOJIS = ['🍗', '🍟', '🥗', '🍝', '🍣', '🥩', '🍲', '🥘', '🌮', '🍕',
    '🥪', '🍜', '🥚', '🫕', '🥦', '🍖', '🧆', '🫔', '🥙', '🍱'];
const CATEGORIES = ['Main Course', 'Starter', 'Kids Favorite', 'Dessert', 'Vegan', 'Soup', 'Salad', 'Snack'];
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { INGREDIENT_UNITS } from '../constants/theme';
import { Label, TInput, SInput } from '../components/FormControls';


// ── Empty ingredient slot ─────────────────────────────────────────────────────
// mode: 'existing' → pick from catalog | 'new' → create inline
const blankSlot = (idx) => ({
    _key: Date.now() + idx,
    mode: 'existing',        // 'existing' | 'new'
    ingredientId: '',        // for mode=existing
    portionByGroup: { A: '', B: '', C: '' },
    inputMode: 'per-person', // 'per-person' | 'yield'
    quantityForBase: '',     // used when inputMode === 'yield'
    // below only for mode=new
    name: '', unit: 'g', packSize: '', currentStock: '', minOrder: '',
    supplier: 'SISCO', pricePerPack: '', substitutable: false, substitute: '',
    wastePct: '',
});

// Rebuild slots from an existing recipe's ingredients (for edit mode)
function slotsFromRecipe(recipe, catalog) {
    return recipe.ingredients.map((ref, i) => {
        const cat = catalog.find(c => c.id === ref.ingredientId);
        return {
            _key: Date.now() + i,
            mode: 'existing',
            ingredientId: ref.ingredientId,
            // Optional chaining guards yield-mode refs that have no portionByGroup
            portionByGroup: { A: ref.portionByGroup?.A ?? '', B: ref.portionByGroup?.B ?? '', C: ref.portionByGroup?.C ?? '' },
            inputMode: ref.inputMode ?? 'per-person',
            quantityForBase: ref.quantityForBase ?? '',
            // populated from catalog for display only:
            name: cat?.name ?? '', unit: cat?.unit ?? 'g', packSize: cat?.packSize ?? '',
            currentStock: cat?.currentStock ?? '', minOrder: cat?.minOrder ?? '',
            supplier: cat?.supplier ?? 'SISCO', pricePerPack: cat?.pricePerPack ?? '',
            substitutable: cat?.substitutable ?? false, substitute: cat?.substitute ?? '',
            wastePct: ref.wastePct ?? '',
        };
    });
}

// ── Ingredient slot editor ────────────────────────────────────────────────────
function IngredientSlot({ slot, index, catalog, onChange, onRemove, errors, baseServings, supplierIds }) {
    const update = (field, val) => onChange(index, field, val);
    const updateGroup = (gId, val) => onChange(index, 'portionByGroup', { ...slot.portionByGroup, [gId]: val });

    const selectedIng = catalog.find(c => c.id === slot.ingredientId);
    const isYield = slot.inputMode === 'yield';

    const initSubMode = () => {
        if (!slot.substitute) return 'catalog';
        return catalog.some(c => c.name === slot.substitute) ? 'catalog' : 'manual';
    };
    const [subMode, setSubMode] = useState(initSubMode);
    const [hasWaste, setHasWaste] = useState(() => slot.wastePct !== '' && slot.wastePct != null);

    return (
        <div style={{
            background: 'rgba(255,255,255,0.6)', borderRadius: 16,
            padding: 18, border: slot.mode === 'existing' ? '1.5px solid rgba(78,205,196,0.3)' : '1.5px solid rgba(107,63,160,0.25)',
            marginBottom: 12,
        }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                    {/* Mode toggle */}
                    <button
                        onClick={() => update('mode', 'existing')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                            borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            background: slot.mode === 'existing' ? 'linear-gradient(135deg,#4ecdc4,#38b2ac)' : 'rgba(78,205,196,0.1)',
                            color: slot.mode === 'existing' ? 'white' : '#4ecdc4',
                        }}>
                        <Link size={12} /> Use existing
                    </button>
                    <button
                        onClick={() => update('mode', 'new')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                            borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            background: slot.mode === 'new' ? 'linear-gradient(135deg,#6b3fa0,#3d1a78)' : 'rgba(107,63,160,0.1)',
                            color: slot.mode === 'new' ? 'white' : '#6b3fa0',
                        }}>
                        <PlusCircle size={12} /> Create new
                    </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                        background: 'linear-gradient(135deg,#6b3fa0,#4ecdc4)',
                        color: 'white', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700,
                    }}>#{index + 1}</span>
                    {index > 0 && (
                        <button onClick={() => onRemove(index)} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '4px 9px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                            <Trash2 size={12} /> Remove
                        </button>
                    )}
                </div>
            </div>

            {/* Input mode toggle — Per person vs Recipe batch */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <button
                    onClick={() => update('inputMode', 'per-person')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                        borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        background: !isYield ? 'linear-gradient(135deg,#4ecdc4,#38b2ac)' : 'rgba(78,205,196,0.1)',
                        color: !isYield ? 'white' : '#4ecdc4',
                    }}>
                    <Users size={12} /> Per person
                </button>
                <button
                    onClick={() => update('inputMode', 'yield')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                        borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        background: isYield ? 'linear-gradient(135deg,#6b3fa0,#3d1a78)' : 'rgba(107,63,160,0.1)',
                        color: isYield ? 'white' : '#6b3fa0',
                    }}>
                    <Layers size={12} /> Recipe batch
                </button>
            </div>

            {/* EXISTING MODE */}
            {slot.mode === 'existing' && (
                <div>
                    <div style={{ marginBottom: 12 }}>
                        <Label>Select ingredient from catalog</Label>
                        <select
                            value={slot.ingredientId}
                            onChange={e => {
                                const ing = catalog.find(c => c.id === e.target.value);
                                onChange(index, 'ingredientId', e.target.value);
                                if (ing) {
                                    onChange(index, 'name', ing.name);
                                    onChange(index, 'unit', ing.unit);
                                }
                            }}
                            style={{
                                padding: '9px 12px', borderRadius: 9, fontSize: 13,
                                border: '1.5px solid rgba(78,205,196,0.4)', outline: 'none',
                                background: 'rgba(255,255,255,0.9)', color: '#1f2937', width: '100%', cursor: 'pointer',
                            }}>
                            <option value="">— Choose from catalog —</option>
                            {catalog.map(ing => (
                                <option key={ing.id} value={ing.id}>
                                    {ing.name} ({ing.unit}) · {ing.supplier} · ${ing.pricePerPack}/pack
                                </option>
                            ))}
                        </select>
                        {errors[`slot_${index}_id`] && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors[`slot_${index}_id`]}</span>}
                    </div>

                    {/* Show selected ingredient info card */}
                    {selectedIng && (
                        <div style={{
                            background: 'linear-gradient(135deg,rgba(78,205,196,0.08),rgba(107,63,160,0.06))',
                            borderRadius: 10, padding: 12, marginBottom: 12,
                            display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: '#374151',
                        }}>
                            <span>📦 Pack: <b>{selectedIng.packSize}{selectedIng.unit}</b></span>
                            <span>📊 Stock: <b style={{ color: selectedIng.currentStock <= selectedIng.minOrder ? '#ef4444' : '#10b981' }}>{selectedIng.currentStock} packs</b></span>
                            <span>🏭 Supplier: <b>{selectedIng.supplier}</b></span>
                            <span>💰 Price: <b>${selectedIng.pricePerPack}/pack</b></span>
                            {selectedIng.substitutable && <span>🔄 Sub: <b>{selectedIng.substitute}</b></span>}
                        </div>
                    )}
                </div>
            )}

            {/* NEW MODE */}
            {slot.mode === 'new' && (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div>
                            <Label>Ingredient Name *</Label>
                            <TInput value={slot.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Mozzarella Cheese" />
                            {errors[`slot_${index}_name`] && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors[`slot_${index}_name`]}</span>}
                        </div>
                        <div>
                            <Label>Unit</Label>
                            <SInput value={slot.unit} onChange={e => update('unit', e.target.value)} options={INGREDIENT_UNITS} />
                        </div>
                        <div>
                            <Label>Supplier</Label>
                            <SInput value={slot.supplier} onChange={e => update('supplier', e.target.value)} options={supplierIds} />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 10 }}>
                        <div>
                            <Label>Pack Size *</Label>
                            <TInput type="number" min={1} value={slot.packSize} onChange={e => update('packSize', e.target.value)} placeholder="e.g. 1000" />
                            {errors[`slot_${index}_pack`] && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors[`slot_${index}_pack`]}</span>}
                        </div>
                        <div><Label>Stock (packs)</Label><TInput type="number" min={0} value={slot.currentStock} onChange={e => update('currentStock', e.target.value)} placeholder="0" /></div>
                        <div><Label>Min. Order</Label><TInput type="number" min={1} value={slot.minOrder} onChange={e => update('minOrder', e.target.value)} placeholder="1" /></div>
                        <div><Label>Price/pack ($)</Label><TInput type="number" min={0} value={slot.pricePerPack} onChange={e => update('pricePerPack', e.target.value)} placeholder="0" /></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, color: '#6b3fa0', fontWeight: 500 }}>
                            <input type="checkbox" checked={slot.substitutable} onChange={e => {
                                update('substitutable', e.target.checked);
                                if (!e.target.checked) update('substitute', '');
                            }} style={{ accentColor: '#4ecdc4', width: 14, height: 14 }} />
                            Has substitute
                        </label>
                        {slot.substitutable && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button onClick={() => { setSubMode('catalog'); update('substitute', ''); }}
                                        style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600,
                                            background: subMode === 'catalog' ? 'linear-gradient(135deg,#6b3fa0,#3d1a78)' : 'rgba(107,63,160,0.1)',
                                            color: subMode === 'catalog' ? 'white' : '#6b3fa0' }}>
                                        From catalog
                                    </button>
                                    <button onClick={() => { setSubMode('manual'); update('substitute', ''); }}
                                        style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600,
                                            background: subMode === 'manual' ? 'linear-gradient(135deg,#4ecdc4,#38b2ac)' : 'rgba(78,205,196,0.1)',
                                            color: subMode === 'manual' ? 'white' : '#4ecdc4' }}>
                                        Type manually
                                    </button>
                                </div>
                                {subMode === 'catalog' ? (
                                    <select value={slot.substitute} onChange={e => update('substitute', e.target.value)}
                                        style={{ padding: '7px 10px', borderRadius: 8, fontSize: 12,
                                            border: '1.5px solid rgba(107,63,160,0.3)',
                                            background: 'rgba(255,255,255,0.9)', color: '#1f2937', cursor: 'pointer' }}>
                                        <option value="">— Select substitute —</option>
                                        {catalog
                                            .filter(c => c.id !== slot.ingredientId)
                                            .map(c => <option key={c.id} value={c.name}>{c.name} ({c.unit})</option>)}
                                    </select>
                                ) : (
                                    <TInput value={slot.substitute}
                                        onChange={e => update('substitute', e.target.value)}
                                        placeholder="Substitute name…" />
                                )}
                            </div>
                        )}
                    </div>
                    <div style={{ marginTop: 10, padding: '6px 10px', background: 'rgba(107,63,160,0.07)', borderRadius: 8, fontSize: 11, color: '#9b6dca' }}>
                        💡 This ingredient will be added to the catalog so other recipes can use it too.
                    </div>
                </div>
            )}

            {/* Portions section — conditional on inputMode */}
            <div style={{
                marginTop: 14, background: 'linear-gradient(135deg,rgba(107,63,160,0.06),rgba(78,205,196,0.06))',
                borderRadius: 11, padding: 12,
            }}>
                {!isYield ? (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                👥 Portion per person
                            </span>
                            {slot.mode === 'existing' && selectedIng ? (
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#4ecdc4', background: 'rgba(78,205,196,0.12)', padding: '1px 7px', borderRadius: 5 }}>
                                    {selectedIng.unit}
                                </span>
                            ) : (
                                <select value={slot.unit} onChange={e => update('unit', e.target.value)}
                                    style={{ fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 6, border: '1.5px solid rgba(78,205,196,0.4)', background: 'rgba(255,255,255,0.9)', color: '#1f2937', cursor: 'pointer' }}>
                                    {INGREDIENT_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            )}
                            <span style={{ fontSize: 11, color: '#9b6dca' }}>— specific to this recipe</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                            {[
                                { id: 'A', label: 'Group A — Kids', color: '#4ecdc4' },
                                { id: 'B', label: 'Group B — Teens', color: '#6b3fa0' },
                                { id: 'C', label: 'Group C — Adults', color: '#f59e0b' },
                            ].map(g => (
                                <div key={g.id}>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: g.color, display: 'block', marginBottom: 4 }}>{g.label}</label>
                                    <TInput type="number" min={0} value={slot.portionByGroup[g.id]} onChange={e => updateGroup(g.id, e.target.value)} placeholder="0" />
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                📦 Batch quantity
                            </span>
                            {slot.mode === 'existing' && selectedIng ? (
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#4ecdc4', background: 'rgba(78,205,196,0.12)', padding: '1px 7px', borderRadius: 5 }}>
                                    {selectedIng.unit}
                                </span>
                            ) : (
                                <select value={slot.unit} onChange={e => update('unit', e.target.value)}
                                    style={{ fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 6, border: '1.5px solid rgba(78,205,196,0.4)', background: 'rgba(255,255,255,0.9)', color: '#1f2937', cursor: 'pointer' }}>
                                    {INGREDIENT_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            )}
                            <span style={{ fontSize: 11, color: '#9b6dca' }}>— total for {baseServings} servings</span>
                        </div>
                        <TInput
                            type="number" min={0}
                            value={slot.quantityForBase}
                            onChange={e => update('quantityForBase', e.target.value)}
                            placeholder="e.g. 1000"
                        />
                        <div style={{ fontSize: 11, color: '#9b6dca', marginTop: 6 }}>
                            Portions per group are auto-calculated using the batch settings below.
                        </div>
                    </>
                )}
                {/* Waste factor (merma) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#6b3fa0', fontWeight: 500 }}>
                        <input
                            type="checkbox"
                            checked={hasWaste}
                            onChange={e => {
                                setHasWaste(e.target.checked);
                                update('wastePct', e.target.checked ? 10 : '');
                            }}
                            style={{ accentColor: '#f59e0b', width: 13, height: 13 }}
                        />
                        Waste factor
                    </label>
                    {hasWaste && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <input
                                    type="number" min={0} max={99} step={1}
                                    value={slot.wastePct}
                                    onChange={e => update('wastePct', e.target.value)}
                                    style={{ width: 54, padding: '4px 7px', borderRadius: 7, fontSize: 12, border: '1.5px solid rgba(245,158,11,0.5)', background: 'rgba(255,255,255,0.9)', color: '#1f2937', outline: 'none' }}
                                />
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b' }}>%</span>
                            </div>
                            <span style={{ fontSize: 11, color: '#9b6dca', background: 'rgba(107,63,160,0.07)', padding: '2px 8px', borderRadius: 5 }}>
                                +{slot.wastePct || 0}% ordered extra
                            </span>
                        </>
                    )}
                </div>

                {errors[`slot_${index}_portions`] && (
                    <div style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>
                        <AlertCircle size={11} style={{ display: 'inline', marginRight: 4 }} />{errors[`slot_${index}_portions`]}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function CreateRecipeView() {
    const navigate = useNavigate();
    const location = useLocation();

    const ingredientsCatalog = useStore(state => state.ingredients);
    const suppliers = useStore(state => state.suppliers);
    const addRecipe = useStore(state => state.addRecipe);
    const updateRecipe = useStore(state => state.updateRecipe);
    const addIngredient = useStore(state => state.addIngredient);

    const editingRecipe = location.state?.recipe;
    const isEditing = !!editingRecipe;
    const SUPPLIER_IDS = suppliers.map(s => s.name);

    const [form, setForm] = useState(() => ({
        name: editingRecipe?.name ?? '',
        category: editingRecipe?.category ?? 'Main Course',
        description: editingRecipe?.description ?? '',
        image: editingRecipe?.image ?? '🍗',
        rating: editingRecipe?.rating ?? 4,
        baseServings: editingRecipe?.baseServings ?? 10,
        portionFactors: editingRecipe?.portionFactors ?? { A: 0.6, B: 1.0, C: 0.75 },
    }));

    const [slots, setSlots] = useState(() =>
        editingRecipe
            ? slotsFromRecipe(editingRecipe, ingredientsCatalog)
            : [blankSlot(0)]
    );

    const [showEmoji, setShowEmoji] = useState(false);
    const [errors, setErrors] = useState({});
    const [saved, setSaved] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const updateSlot = (idx, field, val) => {
        setSlots(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));
    };
    const addSlot = () => setSlots(prev => [...prev, blankSlot(prev.length)]);
    const removeSlot = (idx) => setSlots(prev => prev.filter((_, i) => i !== idx));

    // ── Validation ──────────────────────────────────────────────────────────────
    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = 'Recipe name is required';
        if (!form.description.trim()) e.description = 'Description is required';
        if (slots.length === 0) e.slots = 'A recipe must have at least one ingredient';
        if (slots.some(s => s.inputMode === 'yield')) {
            if (!form.baseServings || Number(form.baseServings) < 1)
                e.baseServings = 'Base servings must be at least 1';
            if (Number(form.portionFactors.A) <= 0)
                e.portionFactorA = 'Kids factor must be greater than 0';
            if (Number(form.portionFactors.C) <= 0)
                e.portionFactorC = 'Adults factor must be greater than 0';
        }
        slots.forEach((s, i) => {
            if (s.mode === 'existing') {
                if (!s.ingredientId) e[`slot_${i}_id`] = 'Please select an ingredient';
            } else {
                if (!s.name.trim()) e[`slot_${i}_name`] = 'Name required';
                if (!s.packSize || Number(s.packSize) <= 0) e[`slot_${i}_pack`] = 'Pack size > 0';
            }
            if (!s.inputMode || s.inputMode === 'per-person') {
                const A = Number(s.portionByGroup.A);
                const B = Number(s.portionByGroup.B);
                const C = Number(s.portionByGroup.C);
                const noneEntered = !s.portionByGroup.A && !s.portionByGroup.B && !s.portionByGroup.C;
                const allZero = A <= 0 && B <= 0 && C <= 0;
                if (noneEntered || allZero)
                    e[`slot_${i}_portions`] = 'At least one group must have a portion greater than 0';
            } else {
                if (!s.quantityForBase || !String(s.quantityForBase).trim() || Number(s.quantityForBase) <= 0)
                    e[`slot_${i}_portions`] = 'Batch quantity must be greater than 0';
            }
        });
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // ── Save ────────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!validate()) return;
        setSubmitting(true);

        try {
            // Separate new ingredients (to be added to catalog)
            const newIngredients = [];
            const recipeIngredients = slots.map((s, i) => {
                // Resolve ingredientId (existing or freshly created)
                let ingredientId;
                if (s.mode === 'existing') {
                    ingredientId = s.ingredientId;
                } else {
                    // Create new catalog entry
                    const newId = crypto.randomUUID();
                    newIngredients.push({
                        id: newId,
                        name: s.name.trim(),
                        unit: s.unit,
                        packSize: Number(s.packSize),
                        currentStock: Number(s.currentStock) || 0,
                        minOrder: Number(s.minOrder) || 1,
                        supplier: s.supplier,
                        pricePerPack: Number(s.pricePerPack) || 0,
                        substitutable: s.substitutable,
                        substitute: s.substitutable ? s.substitute : null,
                    });
                    ingredientId = newId;
                }

                // Build ingredient ref based on inputMode
                const wasteField = s.wastePct !== '' && Number(s.wastePct) > 0
                    ? { wastePct: Number(s.wastePct) }
                    : {};
                if (s.inputMode === 'yield') {
                    return { ingredientId, inputMode: 'yield', quantityForBase: Number(String(s.quantityForBase).trim()), ...wasteField };
                } else {
                    return {
                        ingredientId,
                        inputMode: 'per-person',
                        portionByGroup: {
                            A: Number(s.portionByGroup.A) || 0,
                            B: Number(s.portionByGroup.B) || 0,
                            C: Number(s.portionByGroup.C) || 0,
                        },
                        ...wasteField,
                    };
                }
            });

            const hasYieldIngredients = slots.some(s => s.inputMode === 'yield');

            const recipe = {
                id: editingRecipe?.id ?? crypto.randomUUID(),
                name: form.name.trim(),
                category: form.category,
                description: form.description.trim(),
                image: form.image,
                rating: form.rating,
                isNew: !isEditing,
                isCustom: true,
                ...(hasYieldIngredients && {
                    baseServings: form.baseServings,
                    portionFactors: form.portionFactors,
                }),
                ingredients: recipeIngredients,
            };

            for (const ing of newIngredients) {
                await addIngredient(ing);
            }

            // Es importante hacer await de addRecipe o updateRecipe para capturar fallos 
            if (isEditing) {
                await updateRecipe(recipe);
            } else {
                await addRecipe(recipe);
            }

            setSaved(true);
            setTimeout(() => navigate('/recipes'), 400);

        } catch (err) {
            console.error("Save error:", err);
            alert(`Error saving recipe: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const onCancel = () => navigate('/recipes');

    return (
        <div className="fade-in-up">
            {/* Top bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <button onClick={onCancel} style={{
                    background: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(155,109,202,0.3)',
                    borderRadius: 12, padding: '8px 14px', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#6b3fa0',
                }}>
                    <ChevronLeft size={16} /> Back
                </button>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: '#3d1a78', margin: 0 }}>
                        {isEditing ? '✏️ Edit Recipe' : '✨ Create Recipe'}
                    </h1>
                    <p style={{ fontSize: 13, color: '#9b6dca', margin: 0 }}>
                        Use existing ingredients from the catalog, or create new ones on the fly
                    </p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                    <button onClick={onCancel} className="btn-ghost">Cancel</button>
                    <button onClick={handleSave} className="btn-primary" style={{ minWidth: 120, justifyContent: 'center' }}>
                        {saved ? <><CheckCircle2 size={16} /> Saved!</> : <><Save size={16} /> {isEditing ? 'Update' : 'Save Recipe'}</>}
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
                {/* LEFT — recipe meta */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="glass-card" style={{ padding: 22 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#3d1a78', marginBottom: 14 }}>🍽️ Recipe Details</div>

                        {/* Emoji */}
                        <div style={{ marginBottom: 14 }}>
                            <Label>Icon</Label>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <button onClick={() => setShowEmoji(v => !v)} style={{ fontSize: 34, background: 'rgba(107,63,160,0.1)', border: '2px solid rgba(107,63,160,0.2)', borderRadius: 12, width: 58, height: 58, cursor: 'pointer' }}>
                                    {form.image}
                                </button>
                                <span style={{ fontSize: 12, color: '#9b6dca' }}><Smile size={12} style={{ display: 'inline' }} /> Click to change</span>
                            </div>
                            {showEmoji && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 5, marginTop: 8, background: 'rgba(255,255,255,0.95)', borderRadius: 10, padding: 10, border: '1px solid rgba(155,109,202,0.2)' }}>
                                    {EMOJIS.map(e => (
                                        <button key={e} onClick={() => { setField('image', e); setShowEmoji(false); }}
                                            style={{ fontSize: 22, background: form.image === e ? 'rgba(107,63,160,0.15)' : 'transparent', border: form.image === e ? '2px solid #6b3fa0' : '2px solid transparent', borderRadius: 7, cursor: 'pointer', padding: 3 }}>
                                            {e}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <Label>Recipe Name{errors.name && <span style={{ color: '#ef4444', marginLeft: 6 }}>*</span>}</Label>
                            <TInput value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Crispy Nuggets Deluxe" />
                            {errors.name && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.name}</span>}
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <Label>Description{errors.description && <span style={{ color: '#ef4444', marginLeft: 6 }}>*</span>}</Label>
                            <textarea value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Brief description…" rows={3}
                                style={{ padding: '8px 11px', borderRadius: 9, fontSize: 13, border: '1.5px solid rgba(155,109,202,0.3)', outline: 'none', background: 'rgba(255,255,255,0.85)', width: '100%', resize: 'vertical', fontFamily: 'inherit' }} />
                            {errors.description && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.description}</span>}
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <Label>Category</Label>
                            <SInput value={form.category} onChange={e => setField('category', e.target.value)} options={CATEGORIES} />
                        </div>
                        <div>
                            <Label>Rating</Label>
                            <div style={{ display: 'flex', gap: 4 }}>
                                {[1, 2, 3, 4, 5].map(n => (
                                    <button key={n} onClick={() => setField('rating', n)} style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', filter: n <= form.rating ? 'none' : 'grayscale(1) opacity(0.4)', transform: n <= form.rating ? 'scale(1.05)' : 'scale(1)' }}>⭐</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Batch Settings card — dimmed when no yield ingredients, active otherwise */}
                    {(()=> {
                        const hasYield = slots.some(s => s.inputMode === 'yield');
                        return (
                        <div className="glass-card" style={{ padding: 22, opacity: hasYield ? 1 : 0.4, pointerEvents: hasYield ? 'auto' : 'none', transition: 'opacity 0.25s ease' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#3d1a78', marginBottom: 14 }}>
                                ⚖️ Batch Settings
                                {!hasYield && (
                                    <span style={{ fontSize: 11, fontWeight: 400, color: '#9b6dca', marginLeft: 8 }}>
                                        — set an ingredient to "Recipe batch" to activate
                                    </span>
                                )}
                            </div>
                            <div style={{ marginBottom: 14 }}>
                                <Label>Base Servings</Label>
                                <TInput
                                    type="number" min={1}
                                    value={form.baseServings}
                                    onChange={e => {
                                        const val = Number(e.target.value);
                                        setField('baseServings', isNaN(val) || val < 1 ? 1 : val);
                                    }}
                                    placeholder="10"
                                />
                                <div style={{ fontSize: 11, color: '#9b6dca', marginTop: 4 }}>
                                    Standard batch size used for "Recipe batch" ingredients above
                                </div>
                                {errors.baseServings && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.baseServings}</span>}
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Portion Factors
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: '#4ecdc4', display: 'block', marginBottom: 4 }}>Group A — Kids</label>
                                    <TInput
                                        type="number" min={0.01} step={0.05}
                                        value={form.portionFactors.A}
                                        onChange={e => setField('portionFactors', { ...form.portionFactors, A: Number(e.target.value) })}
                                    />
                                    {errors.portionFactorA && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.portionFactorA}</span>}
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: '#6b3fa0', display: 'block', marginBottom: 4 }}>
                                        Group B — Teens <span style={{ fontSize: 9, background: 'rgba(107,63,160,0.15)', color: '#6b3fa0', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>REFERENCE</span>
                                    </label>
                                    <TInput type="number" value={1.0} disabled />
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b', display: 'block', marginBottom: 4 }}>Group C — Adults</label>
                                    <TInput
                                        type="number" min={0.01} step={0.05}
                                        value={form.portionFactors.C}
                                        onChange={e => setField('portionFactors', { ...form.portionFactors, C: Number(e.target.value) })}
                                    />
                                    {errors.portionFactorC && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.portionFactorC}</span>}
                                </div>
                            </div>
                            <div style={{ fontSize: 11, color: '#9b6dca', marginTop: 8 }}>
                                Group B (Teens) = 1.0 reference. A and C are relative to it.
                            </div>
                        </div>
                        );
                    })()}

                    {/* Preview card */}
                    <div className="glass-card" style={{ padding: 18 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#9b6dca', textTransform: 'uppercase', marginBottom: 10 }}>Preview</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 34 }}>{form.image}</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: '#3d1a78' }}>
                                    {form.name || 'Recipe Name'}
                                    <span className="tag-new" style={{ marginLeft: 8 }}>NEW</span>
                                </div>
                                <div style={{ fontSize: 11, color: '#9b6dca', marginBottom: 4 }}>{form.description || '—'}</div>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <span style={{ fontSize: 13 }}>{'⭐'.repeat(form.rating)}</span>
                                    <span className="chip chip-purple">{form.category}</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ marginTop: 10, fontSize: 11, color: '#9b6dca' }}>
                            <Package size={11} style={{ display: 'inline', marginRight: 4 }} />
                            {slots.length} ingredient{slots.length !== 1 ? 's' : ''}
                            {slots.filter(s => s.mode === 'existing').length > 0 && (
                                <span style={{ color: '#4ecdc4', marginLeft: 8 }}>· {slots.filter(s => s.mode === 'existing').length} from catalog</span>
                            )}
                            {slots.filter(s => s.mode === 'new').length > 0 && (
                                <span style={{ color: '#6b3fa0', marginLeft: 8 }}>· {slots.filter(s => s.mode === 'new').length} new</span>
                            )}
                        </div>
                    </div>

                    {/* Catalog summary */}
                    <div className="glass-card" style={{ padding: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#9b6dca', textTransform: 'uppercase', marginBottom: 10 }}>
                            📋 Catalog ({ingredientsCatalog.length} items)
                        </div>
                        <div style={{ maxHeight: 140, overflowY: 'auto' }}>
                            {ingredientsCatalog.map(ing => (
                                <div key={ing.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: '1px solid rgba(155,109,202,0.1)' }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: ing.currentStock <= ing.minOrder ? '#ef4444' : '#4ecdc4', flexShrink: 0 }} />
                                    <span style={{ fontSize: 12, color: '#374151', flex: 1 }}>{ing.name}</span>
                                    <span style={{ fontSize: 10, color: '#9b6dca' }}>{ing.unit}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT — ingredient slots */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#3d1a78' }}>🧂 Ingredients</div>
                            <div style={{ fontSize: 12, color: '#9b6dca' }}>
                                Select from the catalog or create new ingredients for this recipe
                            </div>
                        </div>
                        <button onClick={addSlot} className="btn-teal">
                            <Plus size={15} /> Add Ingredient
                        </button>
                    </div>

                    {slots.map((s, i) => (
                        <IngredientSlot
                            key={s._key ?? i}
                            slot={s}
                            index={i}
                            catalog={ingredientsCatalog}
                            onChange={updateSlot}
                            onRemove={removeSlot}
                            errors={errors}
                            baseServings={form.baseServings}
                            supplierIds={SUPPLIER_IDS}
                        />
                    ))}

                    {/* Errors summary */}
                    {Object.keys(errors).length > 0 && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 14, display: 'flex', gap: 10, marginTop: 8 }}>
                            <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                            <div>
                                <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 13, marginBottom: 4 }}>Please fix errors:</div>
                                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#7f1d1d' }}>
                                    {Object.values(errors).map((e, i) => <li key={i}>{e}</li>)}
                                </ul>
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={handleSave} className="btn-primary" style={{ padding: '12px 28px', fontSize: 15 }}>
                            {saved ? <><CheckCircle2 size={18} /> Saved!</> : <><Save size={18} /> {isEditing ? 'Update Recipe' : 'Save Recipe'}</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
