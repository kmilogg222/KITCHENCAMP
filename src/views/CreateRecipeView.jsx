import { useState } from 'react';
import {
    ChevronLeft, Plus, Trash2, Save, ChefHat,
    AlertCircle, CheckCircle2, Package, Smile
} from 'lucide-react';
import { suppliers } from '../data/mockData';

// ── Emoji quick-pick ─────────────────────────────────────────────────────────
const EMOJIS = ['🍗', '🍟', '🥗', '🍝', '🍣', '🥩', '🍲', '🥘', '🌮', '🍕',
    '🥪', '🍜', '🥚', '🫕', '🥦', '🍖', '🧆', '🫔', '🥙', '🍱'];

const CATEGORIES = ['Main Course', 'Starter', 'Kids Favorite', 'Dessert', 'Vegan', 'Soup', 'Salad', 'Snack'];
const UNITS = ['g', 'ml', 'units', 'kg', 'L', 'oz'];
const SUPPLIER_IDS = suppliers.map(s => s.id);

// ── Empty ingredient template ────────────────────────────────────────────────
const newIngredient = (idx) => ({
    _key: Date.now() + idx,
    name: '',
    unit: 'g',
    portionByGroup: { A: '', B: '', C: '' },
    packSize: '',
    currentStock: '',
    minOrder: '',
    supplier: 'SISCO',
    pricePerPack: '',
    substitutable: false,
    substitute: '',
});

// ── Field component ──────────────────────────────────────────────────────────
function Field({ label, children, error }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {label}
            </label>
            {children}
            {error && (
                <span style={{ fontSize: 11, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertCircle size={11} /> {error}
                </span>
            )}
        </div>
    );
}

function TextInput({ value, onChange, placeholder, type = 'text', min, style = {} }) {
    return (
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            min={min}
            style={{
                padding: '9px 12px', borderRadius: 10, fontSize: 13,
                border: '1.5px solid rgba(155,109,202,0.3)', outline: 'none',
                background: 'rgba(255,255,255,0.8)', color: '#1f2937',
                transition: 'border-color 0.2s', ...style,
            }}
            onFocus={e => e.target.style.borderColor = '#6b3fa0'}
            onBlur={e => e.target.style.borderColor = 'rgba(155,109,202,0.3)'}
        />
    );
}

function SelectInput({ value, onChange, options }) {
    return (
        <select
            value={value}
            onChange={onChange}
            style={{
                padding: '9px 12px', borderRadius: 10, fontSize: 13,
                border: '1.5px solid rgba(155,109,202,0.3)', outline: 'none',
                background: 'rgba(255,255,255,0.8)', color: '#1f2937', cursor: 'pointer',
            }}
        >
            {options.map(o => (
                <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
                    {typeof o === 'string' ? o : o.label}
                </option>
            ))}
        </select>
    );
}

// ── Ingredient row in the form ───────────────────────────────────────────────
function IngredientFormRow({ ing, index, onChange, onRemove }) {
    const update = (field, val) => onChange(index, field, val);
    const updateGroup = (gId, val) => onChange(index, 'portionByGroup', { ...ing.portionByGroup, [gId]: val });

    return (
        <div style={{
            background: 'rgba(255,255,255,0.6)', borderRadius: 16,
            padding: 20, border: '1.5px solid rgba(155,109,202,0.2)',
            position: 'relative', marginBottom: 12,
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{
                    background: 'linear-gradient(135deg,#6b3fa0,#4ecdc4)',
                    color: 'white', borderRadius: 8, padding: '3px 10px',
                    fontSize: 11, fontWeight: 700,
                }}>
                    Ingredient #{index + 1}
                </div>
                {index > 0 && (
                    <button onClick={() => onRemove(index)} style={{
                        background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
                        padding: '4px 10px', cursor: 'pointer', color: '#ef4444',
                        display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                    }}>
                        <Trash2 size={13} /> Remove
                    </button>
                )}
            </div>

            {/* Row 1: Name + Unit + Supplier */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Field label="Ingredient Name">
                    <TextInput value={ing.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Chicken Breast" />
                </Field>
                <Field label="Unit">
                    <SelectInput value={ing.unit} onChange={e => update('unit', e.target.value)} options={UNITS} />
                </Field>
                <Field label="Supplier">
                    <SelectInput value={ing.supplier} onChange={e => update('supplier', e.target.value)} options={SUPPLIER_IDS} />
                </Field>
            </div>

            {/* Row 2: Portions per group */}
            <div style={{
                background: 'linear-gradient(135deg,rgba(107,63,160,0.06),rgba(78,205,196,0.06))',
                borderRadius: 12, padding: 14, marginBottom: 12,
            }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    👥 Portion per person (in {ing.unit})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                    {[
                        { id: 'A', label: 'Group A — Kids', color: '#4ecdc4' },
                        { id: 'B', label: 'Group B — Adults', color: '#6b3fa0' },
                        { id: 'C', label: 'Group C — Seniors', color: '#f59e0b' },
                    ].map(g => (
                        <div key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <label style={{ fontSize: 11, fontWeight: 600, color: g.color }}>{g.label}</label>
                            <TextInput
                                type="number" min={0}
                                value={ing.portionByGroup[g.id]}
                                onChange={e => updateGroup(g.id, e.target.value)}
                                placeholder="0"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Row 3: Pack size, Stock, Min order, Price */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
                <Field label={`Pack Size (${ing.unit})`}>
                    <TextInput type="number" min={1} value={ing.packSize} onChange={e => update('packSize', e.target.value)} placeholder="e.g. 2000" />
                </Field>
                <Field label="Current Stock (packs)">
                    <TextInput type="number" min={0} value={ing.currentStock} onChange={e => update('currentStock', e.target.value)} placeholder="0" />
                </Field>
                <Field label="Min. Order (packs)">
                    <TextInput type="number" min={1} value={ing.minOrder} onChange={e => update('minOrder', e.target.value)} placeholder="1" />
                </Field>
                <Field label="Price / Pack ($)">
                    <TextInput type="number" min={0} value={ing.pricePerPack} onChange={e => update('pricePerPack', e.target.value)} placeholder="0.00" />
                </Field>
            </div>

            {/* Row 4: Substitute toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#6b3fa0', fontWeight: 500 }}>
                    <input
                        type="checkbox"
                        checked={ing.substitutable}
                        onChange={e => update('substitutable', e.target.checked)}
                        style={{ accentColor: '#4ecdc4', width: 15, height: 15 }}
                    />
                    Has substitute
                </label>
                {ing.substitutable && (
                    <div style={{ flex: 1 }}>
                        <TextInput
                            value={ing.substitute}
                            onChange={e => update('substitute', e.target.value)}
                            placeholder="Substitute name…"
                            style={{ width: '100%' }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function CreateRecipeView({ onSave, onCancel, editingRecipe }) {
    const isEditing = !!editingRecipe;

    const [form, setForm] = useState(() => editingRecipe
        ? { ...editingRecipe }
        : {
            name: '',
            category: 'Main Course',
            description: '',
            image: '🍗',
            rating: 4,
            isNew: true,
            ingredients: [newIngredient(0)],
        }
    );

    const [showEmoji, setShowEmoji] = useState(false);
    const [errors, setErrors] = useState({});
    const [saved, setSaved] = useState(false);

    // ── Form field updaters ────────────────────────────────────────────────────
    const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const updateIngredient = (idx, field, val) => {
        setForm(f => ({
            ...f,
            ingredients: f.ingredients.map((ing, i) =>
                i === idx ? { ...ing, [field]: val } : ing
            ),
        }));
    };

    const addIngredient = () => {
        setForm(f => ({ ...f, ingredients: [...f.ingredients, newIngredient(f.ingredients.length)] }));
    };

    const removeIngredient = (idx) => {
        setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }));
    };

    // ── Validation ────────────────────────────────────────────────────────────
    const validate = () => {
        const errs = {};
        if (!form.name.trim()) errs.name = 'Name is required';
        if (!form.description.trim()) errs.description = 'Description is required';
        form.ingredients.forEach((ing, i) => {
            if (!ing.name.trim()) errs[`ing_${i}_name`] = 'Name required';
            if (!ing.packSize || Number(ing.packSize) <= 0) errs[`ing_${i}_pack`] = 'Pack size > 0';
            if (!ing.portionByGroup.A && !ing.portionByGroup.B && !ing.portionByGroup.C)
                errs[`ing_${i}_portions`] = 'At least one portion';
        });
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = () => {
        if (!validate()) return;

        const recipe = {
            id: editingRecipe?.id ?? `custom-${Date.now()}`,
            name: form.name.trim(),
            category: form.category,
            description: form.description.trim(),
            image: form.image,
            rating: form.rating,
            isNew: !isEditing,
            isCustom: true,
            ingredients: form.ingredients.map((ing, i) => ({
                id: ing.id ?? `${Date.now()}-ing-${i}`,
                name: ing.name.trim(),
                unit: ing.unit,
                portionByGroup: {
                    A: Number(ing.portionByGroup.A) || 0,
                    B: Number(ing.portionByGroup.B) || 0,
                    C: Number(ing.portionByGroup.C) || 0,
                },
                packSize: Number(ing.packSize),
                currentStock: Number(ing.currentStock) || 0,
                minOrder: Number(ing.minOrder) || 1,
                supplier: ing.supplier,
                pricePerPack: Number(ing.pricePerPack) || 0,
                substitutable: ing.substitutable,
                substitute: ing.substitute || null,
            })),
        };

        setSaved(true);
        setTimeout(() => { onSave(recipe); }, 500);
    };

    return (
        <div className="fade-in-up">
            {/* ── Top bar ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
                <button onClick={onCancel} style={{
                    background: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(155,109,202,0.3)',
                    borderRadius: 12, padding: '8px 14px', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#6b3fa0',
                }}>
                    <ChevronLeft size={16} /> Back
                </button>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: '#3d1a78', margin: 0 }}>
                        {isEditing ? '✏️ Edit Recipe' : '✨ Create New Recipe'}
                    </h1>
                    <p style={{ fontSize: 13, color: '#9b6dca', margin: 0 }}>
                        {isEditing ? 'Modify your custom recipe' : 'Build your own recipe from scratch'}
                    </p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                    <button onClick={onCancel} className="btn-ghost">Cancel</button>
                    <button
                        onClick={handleSave}
                        className="btn-primary"
                        style={{ minWidth: 120, justifyContent: 'center' }}
                    >
                        {saved
                            ? <><CheckCircle2 size={16} /> Saved!</>
                            : <><Save size={16} /> {isEditing ? 'Update Recipe' : 'Save Recipe'}</>
                        }
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>
                {/* ── LEFT: Recipe meta ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="glass-card" style={{ padding: 24 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#3d1a78', marginBottom: 16 }}>
                            🍽️ Recipe Details
                        </div>

                        {/* Emoji picker */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                                Icon / Emoji
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <button
                                    onClick={() => setShowEmoji(v => !v)}
                                    style={{
                                        fontSize: 36, background: 'rgba(107,63,160,0.1)', border: '2px solid rgba(107,63,160,0.2)',
                                        borderRadius: 14, width: 64, height: 64, cursor: 'pointer', transition: 'all 0.2s',
                                    }}
                                    title="Pick emoji"
                                >
                                    {form.image}
                                </button>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ fontSize: 12, color: '#9b6dca' }}>Click to change</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#4ecdc4' }}>
                                        <Smile size={12} /> Pick an emoji
                                    </div>
                                </div>
                            </div>
                            {showEmoji && (
                                <div style={{
                                    display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginTop: 10,
                                    background: 'rgba(255,255,255,0.9)', borderRadius: 12, padding: 12,
                                    border: '1px solid rgba(155,109,202,0.25)',
                                }}>
                                    {EMOJIS.map(e => (
                                        <button key={e} onClick={() => { setField('image', e); setShowEmoji(false); }}
                                            style={{
                                                fontSize: 24, background: form.image === e ? 'rgba(107,63,160,0.15)' : 'transparent',
                                                border: form.image === e ? '2px solid #6b3fa0' : '2px solid transparent',
                                                borderRadius: 8, cursor: 'pointer', padding: 4, transition: 'all 0.15s',
                                            }}>
                                            {e}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Name */}
                        <div style={{ marginBottom: 12 }}>
                            <Field label="Recipe Name" error={errors.name}>
                                <TextInput
                                    value={form.name}
                                    onChange={e => setField('name', e.target.value)}
                                    placeholder="e.g. Crispy Nuggets Deluxe"
                                />
                            </Field>
                        </div>

                        {/* Description */}
                        <div style={{ marginBottom: 12 }}>
                            <Field label="Description" error={errors.description}>
                                <textarea
                                    value={form.description}
                                    onChange={e => setField('description', e.target.value)}
                                    placeholder="Brief description of the dish…"
                                    rows={3}
                                    style={{
                                        padding: '9px 12px', borderRadius: 10, fontSize: 13, resize: 'vertical',
                                        border: '1.5px solid rgba(155,109,202,0.3)', outline: 'none',
                                        background: 'rgba(255,255,255,0.8)', color: '#1f2937', fontFamily: 'inherit',
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#6b3fa0'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(155,109,202,0.3)'}
                                />
                            </Field>
                        </div>

                        {/* Category */}
                        <div style={{ marginBottom: 12 }}>
                            <Field label="Category">
                                <SelectInput value={form.category} onChange={e => setField('category', e.target.value)} options={CATEGORIES} />
                            </Field>
                        </div>

                        {/* Rating */}
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>
                                Rating
                            </label>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {[1, 2, 3, 4, 5].map(n => (
                                    <button key={n} onClick={() => setField('rating', n)} style={{
                                        fontSize: 22, background: 'none', border: 'none', cursor: 'pointer',
                                        filter: n <= form.rating ? 'none' : 'grayscale(1) opacity(0.4)',
                                        transform: n <= form.rating ? 'scale(1.1)' : 'scale(1)',
                                        transition: 'all 0.15s',
                                    }}>⭐</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Preview card */}
                    <div className="glass-card" style={{ padding: 20 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#9b6dca', marginBottom: 12, textTransform: 'uppercase' }}>
                            Preview
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <span style={{ fontSize: 38 }}>{form.image}</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: '#3d1a78' }}>
                                    {form.name || 'Recipe Name'}
                                    <span className="tag-new" style={{ marginLeft: 8 }}>NEW</span>
                                </div>
                                <div style={{ fontSize: 11, color: '#9b6dca', marginTop: 2, marginBottom: 6 }}>
                                    {form.description || 'No description yet'}
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span>{'⭐'.repeat(form.rating)}</span>
                                    <span className="chip chip-purple">{form.category}</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ marginTop: 12, fontSize: 11, color: '#9b6dca' }}>
                            <Package size={11} style={{ display: 'inline', marginRight: 4 }} />
                            {form.ingredients.length} ingredient{form.ingredients.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>

                {/* ── RIGHT: Ingredients ── */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#3d1a78' }}>
                                🧂 Ingredients
                            </div>
                            <div style={{ fontSize: 12, color: '#9b6dca', marginTop: 2 }}>
                                Define portions per diner group and supplier info
                            </div>
                        </div>
                        <button onClick={addIngredient} className="btn-teal">
                            <Plus size={15} /> Add Ingredient
                        </button>
                    </div>

                    {form.ingredients.map((ing, i) => (
                        <IngredientFormRow
                            key={ing._key ?? i}
                            ing={ing}
                            index={i}
                            onChange={updateIngredient}
                            onRemove={removeIngredient}
                        />
                    ))}

                    {/* Validation errors summary */}
                    {Object.keys(errors).length > 0 && (
                        <div style={{
                            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 14,
                            display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 8,
                        }}>
                            <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                            <div>
                                <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 13, marginBottom: 4 }}>
                                    Please fix these errors before saving:
                                </div>
                                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#7f1d1d' }}>
                                    {Object.values(errors).map((e, i) => <li key={i}>{e}</li>)}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Bottom save button (convenience) */}
                    <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={handleSave} className="btn-primary" style={{ padding: '13px 28px', fontSize: 15 }}>
                            {saved
                                ? <><CheckCircle2 size={18} /> Saved!</>
                                : <><Save size={18} /> {isEditing ? 'Update Recipe' : 'Save Recipe'}</>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
