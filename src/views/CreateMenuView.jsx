/**
 * @file CreateMenuView.jsx
 * @description Formulario para crear o editar un menú.
 *
 * Un menú agrupa recetas existentes. El formulario permite:
 *  - Nombre, descripción, ícono
 *  - Selección múltiple de recetas del catálogo
 *  - Reordenamiento visual de las recetas
 *  - Preview en tiempo real
 */
import { useState } from 'react';
import {
    ChevronLeft, Plus, Trash2, Save, AlertCircle,
    CheckCircle2, Smile, ChevronUp, ChevronDown, Search,
} from 'lucide-react';

const MENU_EMOJIS = ['🍱', '🎉', '🌟', '🥂', '🍽️', '☀️', '🌙', '🎊',
    '🏖️', '🎄', '🦃', '🥗', '🍕', '🌮', '🍣', '🎂', '🍰', '🧁', '🫕', '🥘'];

import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Label, TInput } from '../components/FormControls';

export default function CreateMenuView() {
    const navigate = useNavigate();
    const location = useLocation();

    const recipes = useStore(state => state.recipes);
    const addMenu = useStore(state => state.addMenu);
    const updateMenu = useStore(state => state.updateMenu);

    const editingMenu = location.state?.menu;
    const isEditing = !!editingMenu;

    const [form, setForm] = useState(() => ({
        name: editingMenu?.name ?? '',
        description: editingMenu?.description ?? '',
        image: editingMenu?.image ?? '🍱',
    }));

    const [selectedRecipeIds, setSelectedRecipeIds] = useState(
        () => editingMenu?.recipeIds ?? []
    );

    const [showEmoji, setShowEmoji] = useState(false);
    const [recipeSearch, setRecipeSearch] = useState('');
    const [errors, setErrors] = useState({});
    const [saved, setSaved] = useState(false);

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

    // ── Recipe management ────────────────────────────────────────────────────
    const addRecipe = (id) => {
        if (!selectedRecipeIds.includes(id)) {
            setSelectedRecipeIds(prev => [...prev, id]);
        }
    };
    const removeRecipe = (id) => setSelectedRecipeIds(prev => prev.filter(rid => rid !== id));
    const moveRecipe = (idx, direction) => {
        setSelectedRecipeIds(prev => {
            const arr = [...prev];
            const newIdx = idx + direction;
            if (newIdx < 0 || newIdx >= arr.length) return arr;
            [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
            return arr;
        });
    };

    const selectedRecipes = selectedRecipeIds.map(id => recipes.find(r => r.id === id)).filter(Boolean);

    // Filtered available recipes (not yet selected)
    const availableRecipes = recipes.filter(r =>
        !selectedRecipeIds.includes(r.id) &&
        (r.name.toLowerCase().includes(recipeSearch.toLowerCase()) ||
         r.category.toLowerCase().includes(recipeSearch.toLowerCase()))
    );

    // ── Validation ───────────────────────────────────────────────────────────
    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = 'Menu name is required';
        if (!form.description.trim()) e.description = 'Description is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // ── Save ─────────────────────────────────────────────────────────────────
    const handleSave = () => {
        if (!validate()) return;

        const menu = {
            id: editingMenu?.id ?? crypto.randomUUID(),
            name: form.name.trim(),
            description: form.description.trim(),
            image: form.image,
            recipeIds: selectedRecipeIds,
            createdAt: editingMenu?.createdAt ?? new Date().toISOString().slice(0, 10),
        };

        if (isEditing) {
            updateMenu(menu);
        } else {
            addMenu(menu);
        }

        setSaved(true);
        setTimeout(() => navigate('/menus'), 400);
    };

    const onCancel = () => navigate('/menus');

    // Count total unique ingredients across selected recipes
    const totalIngredients = new Set(
        selectedRecipes.flatMap(r => r.ingredients.map(i => i.ingredientId))
    ).size;

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
                        {isEditing ? '✏️ Edit Menu' : '✨ Create Menu'}
                    </h1>
                    <p style={{ fontSize: 13, color: '#9b6dca', margin: 0 }}>
                        Combine multiple recipes into a menu and calculate consolidated requisitions
                    </p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                    <button onClick={onCancel} className="btn-ghost">Cancel</button>
                    <button onClick={handleSave} className="btn-primary" style={{ minWidth: 120, justifyContent: 'center' }}>
                        {saved ? <><CheckCircle2 size={16} /> Saved!</> : <><Save size={16} /> {isEditing ? 'Update' : 'Save Menu'}</>}
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
                {/* LEFT — menu meta + preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="glass-card" style={{ padding: 22 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#3d1a78', marginBottom: 14 }}>📋 Menu Details</div>

                        {/* Emoji picker */}
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
                                    {MENU_EMOJIS.map(e => (
                                        <button key={e} onClick={() => { setField('image', e); setShowEmoji(false); }}
                                            style={{ fontSize: 22, background: form.image === e ? 'rgba(107,63,160,0.15)' : 'transparent', border: form.image === e ? '2px solid #6b3fa0' : '2px solid transparent', borderRadius: 7, cursor: 'pointer', padding: 3 }}>
                                            {e}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <Label>Menu Name{errors.name && <span style={{ color: '#ef4444', marginLeft: 6 }}>*</span>}</Label>
                            <TInput value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Executive Lunch" />
                            {errors.name && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.name}</span>}
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <Label>Description{errors.description && <span style={{ color: '#ef4444', marginLeft: 6 }}>*</span>}</Label>
                            <textarea value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Brief description…" rows={3}
                                style={{ padding: '8px 11px', borderRadius: 9, fontSize: 13, border: '1.5px solid rgba(155,109,202,0.3)', outline: 'none', background: 'rgba(255,255,255,0.85)', width: '100%', resize: 'vertical', fontFamily: 'inherit' }} />
                            {errors.description && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.description}</span>}
                        </div>
                    </div>

                    {/* Preview card */}
                    <div className="glass-card" style={{ padding: 18 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#9b6dca', textTransform: 'uppercase', marginBottom: 10 }}>Preview</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 34 }}>{form.image}</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: '#3d1a78' }}>
                                    {form.name || 'Menu Name'}
                                </div>
                                <div style={{ fontSize: 11, color: '#9b6dca', marginBottom: 4 }}>{form.description || '—'}</div>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {selectedRecipes.map(r => (
                                        <span key={r.id} style={{ fontSize: 16 }} title={r.name}>{r.image}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div style={{ marginTop: 10, fontSize: 11, color: '#9b6dca' }}>
                            {selectedRecipes.length} recipe{selectedRecipes.length !== 1 ? 's' : ''} ·
                            {' '}{totalIngredients} unique ingredient{totalIngredients !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>

                {/* RIGHT — Recipe selector */}
                <div>
                    {/* Selected recipes */}
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#3d1a78' }}>🍽️ Selected Recipes ({selectedRecipes.length})</div>
                                <div style={{ fontSize: 12, color: '#9b6dca' }}>
                                    Recipes in this menu, served in order
                                </div>
                            </div>
                        </div>

                        {selectedRecipes.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {selectedRecipes.map((r, idx) => (
                                    <div key={r.id} style={{
                                        background: 'rgba(255,255,255,0.7)', borderRadius: 14, padding: '12px 16px',
                                        border: '1.5px solid rgba(78,205,196,0.25)',
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        transition: 'all 0.2s',
                                    }}>
                                        <span style={{
                                            background: 'linear-gradient(135deg,#6b3fa0,#4ecdc4)',
                                            color: 'white', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700,
                                            minWidth: 24, textAlign: 'center',
                                        }}>#{idx + 1}</span>
                                        <span style={{ fontSize: 24 }}>{r.image}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 13, color: '#3d1a78' }}>{r.name}</div>
                                            <div style={{ fontSize: 10, color: '#9b6dca' }}>
                                                {r.category} · {r.ingredients.length} ingredient{r.ingredients.length !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button onClick={() => moveRecipe(idx, -1)} disabled={idx === 0}
                                                style={{ background: 'rgba(107,63,160,0.1)', border: 'none', borderRadius: 7, width: 26, height: 26, cursor: idx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b3fa0', opacity: idx === 0 ? 0.3 : 1 }}>
                                                <ChevronUp size={14} />
                                            </button>
                                            <button onClick={() => moveRecipe(idx, 1)} disabled={idx === selectedRecipes.length - 1}
                                                style={{ background: 'rgba(107,63,160,0.1)', border: 'none', borderRadius: 7, width: 26, height: 26, cursor: idx === selectedRecipes.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b3fa0', opacity: idx === selectedRecipes.length - 1 ? 0.3 : 1 }}>
                                                <ChevronDown size={14} />
                                            </button>
                                            <button onClick={() => removeRecipe(r.id)}
                                                style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{
                                background: 'rgba(255,255,255,0.5)', borderRadius: 14, padding: 24,
                                border: '1.5px dashed rgba(107,63,160,0.25)', textAlign: 'center',
                            }}>
                                <div style={{ fontSize: 28, marginBottom: 8 }}>🍽️</div>
                                <div style={{ fontSize: 13, color: '#9b6dca', fontWeight: 500 }}>No recipes added yet</div>
                                <div style={{ fontSize: 11, color: '#9b6dca', marginTop: 4 }}>Add recipes from the catalog below</div>
                            </div>
                        )}
                    </div>

                    {/* Available recipes to add */}
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#3d1a78', marginBottom: 10 }}>
                            📂 Available Recipes ({availableRecipes.length + (recipeSearch ? 0 : selectedRecipeIds.length)})
                        </div>

                        <div style={{ position: 'relative', marginBottom: 12 }}>
                            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9b6dca' }} />
                            <input value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)}
                                placeholder="Filter recipes…"
                                style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, borderRadius: 10, border: '1.5px solid rgba(155,109,202,0.3)', fontSize: 13, background: 'rgba(255,255,255,0.7)', outline: 'none' }} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                            {availableRecipes.map(r => (
                                <button key={r.id} className="hover-border-teal" onClick={() => addRecipe(r.id)} style={{
                                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12,
                                    border: '1.5px solid rgba(155,109,202,0.2)', cursor: 'pointer', textAlign: 'left',
                                    background: 'rgba(255,255,255,0.6)', transition: 'all 0.2s',
                                }}>
                                    <span style={{ fontSize: 22 }}>{r.image}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: 12, color: '#3d1a78' }}>{r.name}</div>
                                        <div style={{ fontSize: 10, color: '#9b6dca' }}>{r.category}</div>
                                    </div>
                                    <Plus size={16} color="#4ecdc4" />
                                </button>
                            ))}
                            {availableRecipes.length === 0 && (
                                <div style={{ padding: 16, fontSize: 12, color: '#9b6dca', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center' }}>
                                    {recipes.length === selectedRecipeIds.length
                                        ? 'All recipes have been added to this menu'
                                        : 'No recipes match your search'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Errors summary */}
                    {Object.keys(errors).length > 0 && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 14, display: 'flex', gap: 10, marginTop: 14 }}>
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
                            {saved ? <><CheckCircle2 size={18} /> Saved!</> : <><Save size={18} /> {isEditing ? 'Update Menu' : 'Save Menu'}</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
