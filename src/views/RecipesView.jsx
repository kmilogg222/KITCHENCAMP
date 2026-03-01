import { useState } from 'react';
import { useState as useStateAlias } from 'react';
import { Search, Zap, RefreshCw, ShoppingBasket, Plus, Pencil, Trash2 } from 'lucide-react';
import { defaultGroups, calcRequisition, resolveIngredients } from '../data/mockData';
import StarRating from '../components/StarRating';
import Toggle from '../components/Toggle';

function GroupInput({ group, value, onChange }) {
    const colors = { A: '#4ecdc4', B: '#6b3fa0', C: '#f59e0b' };
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div className="group-badge" style={{ background: colors[group.id] ?? '#6b3fa0' }}>{group.id}</div>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#6b3fa0' }}>{group.label}</span>
            <span style={{ fontSize: 10, color: '#9b6dca' }}>{group.sublabel}</span>
            <input type="number" min={0} value={value}
                onChange={e => onChange(group.id, Math.max(0, parseInt(e.target.value) || 0))}
                className="qty-input" placeholder="0" />
        </div>
    );
}

function IngredientRow({ ingredient, groups, useSubstitutions, onAddToCart, alreadyInCart }) {
    const [checked, setChecked] = useState(false);
    const result = calcRequisition(ingredient, groups);
    const total = groups.reduce((s, g) => s + g.count, 0);
    if (total === 0) return null;

    const displayName = useSubstitutions && ingredient.substitutable && ingredient.substitute
        ? ingredient.substitute : ingredient.name;

    return (
        <div className={`ingredient-row ${checked ? 'checked' : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)}
                    style={{ accentColor: '#4ecdc4', width: 16, height: 16, cursor: 'pointer' }} />
                <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#3d1a78' }}>{displayName}</div>
                    {useSubstitutions && ingredient.substitutable && ingredient.substitute && (
                        <div style={{ fontSize: 10, color: '#9b6dca' }}>↩ orig: {ingredient.name}</div>
                    )}
                </div>
            </div>

            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#9b6dca', fontWeight: 500 }}>Stock</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: ingredient.currentStock >= result.R ? '#10b981' : '#ef4444' }}>
                    {ingredient.currentStock}
                </div>
            </div>

            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#9b6dca', fontWeight: 500 }}>Min.</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#6b3fa0' }}>{ingredient.minOrder}</div>
            </div>

            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#9b6dca', fontWeight: 500 }}>Order</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: result.R > ingredient.currentStock ? '#ef4444' : '#4ecdc4' }}>
                    {result.R}<span style={{ fontSize: 10, fontWeight: 400, color: '#9b6dca', marginLeft: 2 }}>packs</span>
                </div>
                <div style={{ fontSize: 9, color: '#9b6dca' }}>{result.D_safe.toLocaleString()}{ingredient.unit}</div>
            </div>

            <div style={{ textAlign: 'center' }}>
                <button onClick={() => onAddToCart(ingredient, result)} className="btn-teal"
                    style={{ fontSize: 11, padding: '6px 10px', opacity: alreadyInCart ? 0.55 : 1 }}>
                    {alreadyInCart ? '✓ Added' : '+ Cart'}
                </button>
            </div>
        </div>
    );
}

export default function RecipesView({
    recipes, ingredientsCatalog,
    selectedRecipe, setSelectedRecipe,
    cart, onAddToCart,
    onCreateNew, onEditRecipe, onDeleteRecipe,
}) {
    const [search, setSearch] = useState('');
    const [groups, setGroups] = useState(defaultGroups);
    const [useSubstitutions, setUseSubstitutions] = useState(false);
    const [generated, setGenerated] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const filtered = recipes.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.category.toLowerCase().includes(search.toLowerCase())
    );

    const updateCount = (id, val) => {
        setGroups(prev => prev.map(g => g.id === id ? { ...g, count: val } : g));
        setGenerated(false);
    };

    const totalPeople = groups.reduce((s, g) => s + g.count, 0);

    const handleSelectRecipe = (r) => { setSelectedRecipe(r); setGenerated(false); setGroups(defaultGroups); };

    const handleDelete = (id) => {
        if (deleteConfirm === id) { onDeleteRecipe(id); if (selectedRecipe?.id === id) setSelectedRecipe(null); setDeleteConfirm(null); }
        else { setDeleteConfirm(id); setTimeout(() => setDeleteConfirm(null), 3000); }
    };

    // Resolve recipe ingredients → full objects (catalog data + recipe portions)
    const resolvedIngredients = selectedRecipe
        ? resolveIngredients(selectedRecipe, ingredientsCatalog)
        : [];

    const firstIng = resolvedIngredients[0];

    return (
        <div className="fade-in-up">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#3d1a78', margin: 0 }}>🍽️ Recipe Calculator</h1>
                <button onClick={onCreateNew} className="btn-primary"><Plus size={16} /> New Recipe</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24 }}>
                {/* Left: recipe list */}
                <div>
                    <div style={{ position: 'relative', marginBottom: 14 }}>
                        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9b6dca' }} />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search recipes…"
                            style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, borderRadius: 12, border: '1.5px solid rgba(155,109,202,0.3)', fontSize: 13, background: 'rgba(255,255,255,0.7)', outline: 'none' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#9b6dca', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                            Recipes ({filtered.length})
                        </div>
                        {filtered.map(r => (
                            <div key={r.id} style={{ position: 'relative' }}>
                                <button onClick={() => handleSelectRecipe(r)} style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 14,
                                    border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                                    background: selectedRecipe?.id === r.id ? 'linear-gradient(135deg,rgba(107,63,160,0.15),rgba(78,205,196,0.15))' : 'rgba(255,255,255,0.5)',
                                    borderLeft: selectedRecipe?.id === r.id ? '3px solid #6b3fa0' : '3px solid transparent',
                                    transition: 'all 0.2s', paddingRight: r.isCustom ? 70 : 14,
                                }}>
                                    <span style={{ fontSize: 24, flexShrink: 0 }}>{r.image}</span>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, color: '#3d1a78', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                            {r.name}
                                            {r.isNew && !r.isCustom && <span className="tag-new">NEW</span>}
                                            {r.isCustom && <span style={{ fontSize: 9, background: '#e8d5f5', color: '#6b3fa0', borderRadius: 10, padding: '1px 6px', fontWeight: 700 }}>CUSTOM</span>}
                                        </div>
                                        <StarRating rating={r.rating} />
                                        <div style={{ fontSize: 10, color: '#9b6dca', marginTop: 2 }}>
                                            {r.ingredients.length} ingredient{r.ingredients.length !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </button>
                                {r.isCustom && (
                                    <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
                                        <button onClick={e => { e.stopPropagation(); onEditRecipe(r); }} title="Edit"
                                            style={{ background: 'rgba(107,63,160,0.1)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b3fa0' }}>
                                            <Pencil size={13} />
                                        </button>
                                        <button onClick={e => { e.stopPropagation(); handleDelete(r.id); }} title={deleteConfirm === r.id ? 'Confirm' : 'Delete'}
                                            style={{ background: deleteConfirm === r.id ? '#fef2f2' : 'rgba(239,68,68,0.1)', border: deleteConfirm === r.id ? '1px solid #fca5a5' : 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        <button onClick={onCreateNew} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 14px',
                            borderRadius: 14, cursor: 'pointer', marginTop: 4, background: 'transparent',
                            border: '1.5px dashed rgba(107,63,160,0.35)', color: '#9b6dca', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                        }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#6b3fa0'; e.currentTarget.style.color = '#6b3fa0'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(107,63,160,0.35)'; e.currentTarget.style.color = '#9b6dca'; }}>
                            <Plus size={15} /> Create new recipe
                        </button>
                    </div>
                </div>

                {/* Right panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {selectedRecipe ? (
                        <div className="glass-card" style={{ padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: '#3d1a78' }}>{selectedRecipe.image} {selectedRecipe.name}</div>
                                    <div style={{ fontSize: 12, color: '#9b6dca', marginTop: 4 }}>{selectedRecipe.description}</div>
                                    <StarRating rating={selectedRecipe.rating} />
                                </div>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    {selectedRecipe.isCustom && (
                                        <button onClick={() => onEditRecipe(selectedRecipe)} className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>
                                            <Pencil size={13} style={{ marginRight: 4 }} /> Edit
                                        </button>
                                    )}
                                    <Toggle on={useSubstitutions} onToggle={() => setUseSubstitutions(v => !v)} label="Substitutions" />
                                </div>
                            </div>

                            <div style={{ background: 'linear-gradient(135deg,rgba(107,63,160,0.08),rgba(78,205,196,0.08))', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#6b3fa0', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>👥 Diners by Group</div>
                                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                                    {groups.map(g => <GroupInput key={g.id} group={g} value={g.count} onChange={updateCount} />)}
                                </div>
                                {totalPeople > 0 && (
                                    <div style={{ marginTop: 12, fontSize: 12, color: '#4ecdc4', fontWeight: 600 }}>
                                        Total: {totalPeople} person{totalPeople !== 1 ? 's' : ''} → margin applied: 10%
                                    </div>
                                )}
                            </div>

                            <button onClick={() => setGenerated(true)} className="btn-primary"
                                style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15 }} disabled={totalPeople === 0}>
                                <Zap size={18} /> Generate Requisition
                            </button>
                        </div>
                    ) : (
                        <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>👈</div>
                            <div style={{ fontWeight: 600, color: '#9b6dca', marginBottom: 12 }}>Select a recipe to get started</div>
                            <button onClick={onCreateNew} className="btn-primary" style={{ margin: '0 auto' }}><Plus size={16} /> Or create your own</button>
                        </div>
                    )}

                    {/* Results */}
                    {generated && selectedRecipe && totalPeople > 0 && (
                        <div className="glass-card slide-in-right" style={{ padding: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, background: 'linear-gradient(135deg,#6b3fa0,#4ecdc4)', borderRadius: 12, padding: '12px 16px' }}>
                                <div style={{ color: 'white', fontWeight: 700 }}>
                                    <ShoppingBasket size={16} style={{ display: 'inline', marginRight: 6 }} />
                                    {selectedRecipe.name} — {totalPeople} diners
                                </div>
                                <button onClick={() => setGenerated(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '4px 10px', color: 'white', cursor: 'pointer', fontSize: 12 }}>
                                    <RefreshCw size={12} style={{ display: 'inline', marginRight: 4 }} /> Reset
                                </button>
                            </div>

                            <div className="ingredient-row" style={{ background: 'rgba(107,63,160,0.08)', marginBottom: 8 }}>
                                {['Ingredient', 'Stock', 'Min.', 'Order', 'Action'].map((h, i) => (
                                    <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase', textAlign: i === 0 ? 'left' : 'center' }}>{h}</div>
                                ))}
                            </div>

                            {resolvedIngredients
                                .filter(ing => !useSubstitutions || !(ing.name ?? '').toLowerCase().includes('sub'))
                                .map(ing => (
                                    <IngredientRow key={ing.id} ingredient={ing} groups={groups}
                                        useSubstitutions={useSubstitutions} onAddToCart={onAddToCart}
                                        alreadyInCart={cart.some(c => c.ingredientId === ing.id)} />
                                ))}

                            {/* Math summary */}
                            {firstIng && (
                                <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: 'linear-gradient(135deg,rgba(78,205,196,0.1),rgba(107,63,160,0.1))', border: '1px solid rgba(78,205,196,0.3)' }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#6b3fa0', marginBottom: 8 }}>📐 Calculation Summary ({firstIng.name})</div>
                                    {(() => {
                                        const r = calcRequisition(firstIng, groups);
                                        return (
                                            <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.8 }}>
                                                <b>D</b> = Σ(Pi×Ci) = <b>{r.D.toLocaleString()} {firstIng.unit}</b><br />
                                                <b>D_safe</b> = D × 1.10 = <b>{r.D_safe.toLocaleString()} {firstIng.unit}</b><br />
                                                <b>R</b> = ⌈D_safe / {r.packSize}⌉ = <b>{r.R} pack{r.R !== 1 ? 's' : ''}</b>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
