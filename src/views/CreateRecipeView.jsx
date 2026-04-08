import { useState } from 'react';
import {
    ChevronLeft, Plus, Trash2, Save, AlertCircle,
    CheckCircle2, Package, Smile, Link, PlusCircle
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
    mode: 'existing',      // 'existing' | 'new'
    ingredientId: '',      // for mode=existing
    portionByGroup: { A: '', B: '', C: '' },
    // below only for mode=new
    name: '', unit: 'g', packSize: '', currentStock: '', minOrder: '',
    supplier: 'SISCO', pricePerPack: '', substitutable: false, substitute: '',
});

// Rebuild slots from an existing recipe's ingredients (for edit mode)
function slotsFromRecipe(recipe, catalog) {
    return recipe.ingredients.map((ref, i) => {
        const cat = catalog.find(c => c.id === ref.ingredientId);
        return {
            _key: Date.now() + i,
            mode: 'existing',
            ingredientId: ref.ingredientId,
            portionByGroup: { A: ref.portionByGroup.A ?? '', B: ref.portionByGroup.B ?? '', C: ref.portionByGroup.C ?? '' },
            // populated from catalog for display only:
            name: cat?.name ?? '', unit: cat?.unit ?? 'g', packSize: cat?.packSize ?? '',
            currentStock: cat?.currentStock ?? '', minOrder: cat?.minOrder ?? '',
            supplier: cat?.supplier ?? 'SISCO', pricePerPack: cat?.pricePerPack ?? '',
            substitutable: cat?.substitutable ?? false, substitute: cat?.substitute ?? '',
        };
    });
}

// ── Ingredient slot editor ────────────────────────────────────────────────────
function IngredientSlot({ slot, index, catalog, onChange, onRemove, errors }) {
    const update = (field, val) => onChange(index, field, val);
    const updateGroup = (gId, val) => onChange(index, 'portionByGroup', { ...slot.portionByGroup, [gId]: val });

    const selectedIng = catalog.find(c => c.id === slot.ingredientId);

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
                            <SInput value={slot.supplier} onChange={e => update('supplier', e.target.value)} options={SUPPLIER_IDS} />
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, color: '#6b3fa0', fontWeight: 500 }}>
                            <input type="checkbox" checked={slot.substitutable} onChange={e => update('substitutable', e.target.checked)} style={{ accentColor: '#4ecdc4', width: 14, height: 14 }} />
                            Has substitute
                        </label>
                        {slot.substitutable && (
                            <TInput value={slot.substitute} onChange={e => update('substitute', e.target.value)} placeholder="Substitute name…" style={{ maxWidth: 220 }} />
                        )}
                    </div>
                    <div style={{ marginTop: 10, padding: '6px 10px', background: 'rgba(107,63,160,0.07)', borderRadius: 8, fontSize: 11, color: '#9b6dca' }}>
                        💡 This ingredient will be added to the catalog so other recipes can use it too.
                    </div>
                </div>
            )}

            {/* Portions — always visible */}
            <div style={{
                marginTop: 14, background: 'linear-gradient(135deg,rgba(107,63,160,0.06),rgba(78,205,196,0.06))',
                borderRadius: 11, padding: 12,
            }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    👥 Portion per person ({slot.mode === 'existing' && selectedIng ? selectedIng.unit : slot.unit || 'unit'})
                    <span style={{ color: '#9b6dca', fontWeight: 400, marginLeft: 6 }}>— specific to this recipe</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                    {[
                        { id: 'A', label: 'Group A — Kids', color: '#4ecdc4' },
                        { id: 'B', label: 'Group B — Adults', color: '#6b3fa0' },
                        { id: 'C', label: 'Group C — Seniors', color: '#f59e0b' },
                    ].map(g => (
                        <div key={g.id}>
                            <label style={{ fontSize: 11, fontWeight: 600, color: g.color, display: 'block', marginBottom: 4 }}>{g.label}</label>
                            <TInput type="number" min={0} value={slot.portionByGroup[g.id]} onChange={e => updateGroup(g.id, e.target.value)} placeholder="0" />
                        </div>
                    ))}
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
    const SUPPLIER_IDS = suppliers.map(s => s.id);

    const [form, setForm] = useState(() => ({
        name: editingRecipe?.name ?? '',
        category: editingRecipe?.category ?? 'Main Course',
        description: editingRecipe?.description ?? '',
        image: editingRecipe?.image ?? '🍗',
        rating: editingRecipe?.rating ?? 4,
    }));

    const [slots, setSlots] = useState(() =>
        editingRecipe
            ? slotsFromRecipe(editingRecipe, ingredientsCatalog)
            : [blankSlot(0)]
    );

    const [showEmoji, setShowEmoji] = useState(false);
    const [errors, setErrors] = useState({});
    const [saved, setSaved] = useState(false);

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
        slots.forEach((s, i) => {
            if (s.mode === 'existing') {
                if (!s.ingredientId) e[`slot_${i}_id`] = 'Please select an ingredient';
            } else {
                if (!s.name.trim()) e[`slot_${i}_name`] = 'Name required';
                if (!s.packSize || Number(s.packSize) <= 0) e[`slot_${i}_pack`] = 'Pack size > 0';
            }
            if (!s.portionByGroup.A && !s.portionByGroup.B && !s.portionByGroup.C)
                e[`slot_${i}_portions`] = 'At least one group portion required';
        });
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // ── Save ────────────────────────────────────────────────────────────────────
    const handleSave = () => {
        if (!validate()) return;

        // Separate new ingredients (to be added to catalog)
        const newIngredients = [];
        const recipeIngredients = slots.map((s, i) => {
            const portions = {
                A: Number(s.portionByGroup.A) || 0,
                B: Number(s.portionByGroup.B) || 0,
                C: Number(s.portionByGroup.C) || 0,
            };

            if (s.mode === 'existing') {
                return { ingredientId: s.ingredientId, portionByGroup: portions };
            } else {
                // Create new catalog entry
                const newId = `ing-custom-${Date.now()}-${i}`;
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
                return { ingredientId: newId, portionByGroup: portions };
            }
        });

        const recipe = {
            id: editingRecipe?.id ?? `custom-${Date.now()}`,
            name: form.name.trim(),
            category: form.category,
            description: form.description.trim(),
            image: form.image,
            rating: form.rating,
            isNew: !isEditing,
            isCustom: true,
            ingredients: recipeIngredients,
        };

        newIngredients.forEach(ing => addIngredient(ing));
        if (isEditing) {
            updateRecipe(recipe);
        } else {
            addRecipe(recipe);
        }

        setSaved(true);
        setTimeout(() => navigate('/recipes'), 400);
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
