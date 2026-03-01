import { useState } from 'react';
import { Search, Plus, Zap, RefreshCw, ShoppingBasket } from 'lucide-react';
import { recipes, defaultGroups, calcRequisition } from '../data/mockData';
import StarRating from '../components/StarRating';
import Toggle from '../components/Toggle';

// ── Group input row ──────────────────────────────────────────────────────────
function GroupInput({ group, value, onChange }) {
    const colors = { A: '#4ecdc4', B: '#6b3fa0', C: '#f59e0b' };
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div className="group-badge" style={{ background: colors[group.id] ?? '#6b3fa0' }}>
                {group.id}
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#6b3fa0' }}>{group.label}</span>
            <span style={{ fontSize: 10, color: '#9b6dca' }}>{group.sublabel}</span>
            <input
                type="number"
                min={0}
                value={value}
                onChange={e => onChange(group.id, Math.max(0, parseInt(e.target.value) || 0))}
                className="qty-input"
                placeholder="0"
            />
        </div>
    );
}

// ── Ingredient result row ────────────────────────────────────────────────────
function IngredientRow({ ingredient, groups, useSubstitutions, onAddToCart, alreadyInCart }) {
    const [inRow, setInRow] = useState(false);
    const result = calcRequisition(ingredient, groups);
    const total = groups.reduce((s, g) => s + g.count, 0);
    if (total === 0) return null;

    return (
        <div className={`ingredient-row ${inRow ? 'checked' : ''}`}>
            {/* Checkbox + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                    type="checkbox"
                    checked={inRow}
                    onChange={e => setInRow(e.target.checked)}
                    style={{ accentColor: '#4ecdc4', width: 16, height: 16, cursor: 'pointer' }}
                />
                <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#3d1a78' }}>
                        {useSubstitutions && ingredient.substitutable && ingredient.substitute
                            ? ingredient.substitute
                            : ingredient.name}
                    </div>
                    {useSubstitutions && ingredient.substitutable && ingredient.substitute && (
                        <div style={{ fontSize: 10, color: '#9b6dca' }}>sub: {ingredient.name}</div>
                    )}
                </div>
            </div>

            {/* Stock */}
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#9b6dca', fontWeight: 500 }}>Stock</div>
                <div style={{
                    fontWeight: 700, fontSize: 14,
                    color: ingredient.currentStock >= result.R ? '#10b981' : '#ef4444',
                }}>
                    {ingredient.currentStock}
                </div>
            </div>

            {/* Min Order */}
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#9b6dca', fontWeight: 500 }}>Min.</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#6b3fa0' }}>{ingredient.minOrder}</div>
            </div>

            {/* Order packs */}
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#9b6dca', fontWeight: 500 }}>Order</div>
                <div style={{
                    fontWeight: 800, fontSize: 15,
                    color: result.R > ingredient.currentStock ? '#ef4444' : '#4ecdc4',
                }}>
                    {result.R}
                    <span style={{ fontSize: 10, fontWeight: 400, color: '#9b6dca', marginLeft: 2 }}>packs</span>
                </div>
                <div style={{ fontSize: 9, color: '#9b6dca' }}>
                    {result.D_safe.toLocaleString()}{ingredient.unit}
                </div>
            </div>

            {/* Add to cart */}
            <div style={{ textAlign: 'center' }}>
                <button
                    onClick={() => onAddToCart(ingredient, result)}
                    className="btn-teal"
                    style={{
                        fontSize: 11, padding: '6px 10px',
                        opacity: alreadyInCart ? 0.55 : 1,
                    }}
                >
                    {alreadyInCart ? '✓ Added' : '+ Cart'}
                </button>
            </div>
        </div>
    );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function RecipesView({ selectedRecipe, setSelectedRecipe, cart, onAddToCart }) {
    const [search, setSearch] = useState('');
    const [groups, setGroups] = useState(defaultGroups);
    const [useSubstitutions, setUseSubstitutions] = useState(false);
    const [generated, setGenerated] = useState(false);

    const filtered = recipes.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.category.toLowerCase().includes(search.toLowerCase())
    );

    const updateCount = (id, val) => {
        setGroups(prev => prev.map(g => g.id === id ? { ...g, count: val } : g));
        setGenerated(false);
    };

    const totalPeople = groups.reduce((s, g) => s + g.count, 0);

    const handleGenerate = () => {
        if (!selectedRecipe) return;
        setGenerated(true);
    };

    return (
        <div className="fade-in-up">
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#3d1a78', marginBottom: 24 }}>
                🍽️ Recipe Calculator
            </h1>

            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24 }}>
                {/* Left: recipe list */}
                <div>
                    <div style={{ position: 'relative', marginBottom: 16 }}>
                        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9b6dca' }} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search recipes…"
                            style={{
                                width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                                borderRadius: 12, border: '1.5px solid rgba(155,109,202,0.3)', fontSize: 13,
                                background: 'rgba(255,255,255,0.7)', outline: 'none',
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#9b6dca', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                            Recipes
                        </div>
                        {filtered.map(r => (
                            <button key={r.id}
                                onClick={() => { setSelectedRecipe(r); setGenerated(false); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                                    borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'left',
                                    background: selectedRecipe?.id === r.id
                                        ? 'linear-gradient(135deg,rgba(107,63,160,0.15),rgba(78,205,196,0.15))'
                                        : 'rgba(255,255,255,0.5)',
                                    borderLeft: selectedRecipe?.id === r.id ? '3px solid #6b3fa0' : '3px solid transparent',
                                    transition: 'all 0.2s',
                                }}>
                                <span style={{ fontSize: 24 }}>{r.image}</span>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 13, color: '#3d1a78' }}>
                                        {r.name}
                                        {r.isNew && <span className="tag-new" style={{ marginLeft: 6 }}>NEW</span>}
                                    </div>
                                    <StarRating rating={r.rating} />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Recipe header */}
                    {selectedRecipe ? (
                        <div className="glass-card" style={{ padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: '#3d1a78' }}>
                                        {selectedRecipe.image} {selectedRecipe.name}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#9b6dca', marginTop: 4 }}>{selectedRecipe.description}</div>
                                    <StarRating rating={selectedRecipe.rating} />
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <Toggle
                                        on={useSubstitutions}
                                        onToggle={() => setUseSubstitutions(v => !v)}
                                        label="Substitutions"
                                    />
                                </div>
                            </div>

                            {/* Group selectors */}
                            <div style={{
                                background: 'linear-gradient(135deg,rgba(107,63,160,0.08),rgba(78,205,196,0.08))',
                                borderRadius: 14, padding: 16, marginBottom: 16,
                            }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#6b3fa0', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    👥 Diners by Group
                                </div>
                                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                                    {groups.map(g => (
                                        <GroupInput key={g.id} group={g} value={g.count} onChange={updateCount} />
                                    ))}
                                </div>
                                {totalPeople > 0 && (
                                    <div style={{ marginTop: 12, fontSize: 12, color: '#4ecdc4', fontWeight: 600 }}>
                                        Total: {totalPeople} person{totalPeople !== 1 ? 's' : ''} → margin applied: 10%
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleGenerate}
                                className="btn-primary"
                                style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15 }}
                                disabled={totalPeople === 0 || !selectedRecipe}
                            >
                                <Zap size={18} />
                                Generate Requisition
                            </button>
                        </div>
                    ) : (
                        <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>👈</div>
                            <div style={{ fontWeight: 600, color: '#9b6dca' }}>Select a recipe to get started</div>
                        </div>
                    )}

                    {/* Results */}
                    {generated && selectedRecipe && totalPeople > 0 && (
                        <div className="glass-card slide-in-right" style={{ padding: 20 }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
                                background: 'linear-gradient(135deg,#6b3fa0,#4ecdc4)',
                                borderRadius: 12, padding: '12px 16px',
                            }}>
                                <div style={{ color: 'white', fontWeight: 700 }}>
                                    <ShoppingBasket size={16} style={{ display: 'inline', marginRight: 6 }} />
                                    {selectedRecipe.name} — {totalPeople} diners
                                </div>
                                <button
                                    onClick={() => setGenerated(false)}
                                    style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '4px 10px', color: 'white', cursor: 'pointer', fontSize: 12 }}>
                                    <RefreshCw size={12} style={{ display: 'inline', marginRight: 4 }} />
                                    Reset
                                </button>
                            </div>

                            {/* Header row */}
                            <div className="ingredient-row" style={{
                                background: 'rgba(107,63,160,0.08)', marginBottom: 8,
                                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                            }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase' }}>Ingredient</div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textAlign: 'center', textTransform: 'uppercase' }}>Stock</div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textAlign: 'center', textTransform: 'uppercase' }}>Min.</div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textAlign: 'center', textTransform: 'uppercase' }}>Order</div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textAlign: 'center', textTransform: 'uppercase' }}>Action</div>
                            </div>

                            {selectedRecipe.ingredients
                                .filter(ing => !useSubstitutions || !ing.name.includes('sub'))
                                .map(ing => (
                                    <IngredientRow
                                        key={ing.id}
                                        ingredient={ing}
                                        groups={groups}
                                        useSubstitutions={useSubstitutions}
                                        onAddToCart={onAddToCart}
                                        alreadyInCart={cart.some(c => c.ingredientId === ing.id)}
                                    />
                                ))}

                            {/* Math summary box */}
                            <div style={{
                                marginTop: 16, padding: 14, borderRadius: 12,
                                background: 'linear-gradient(135deg,rgba(78,205,196,0.1),rgba(107,63,160,0.1))',
                                border: '1px solid rgba(78,205,196,0.3)',
                            }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#6b3fa0', marginBottom: 8 }}>📐 Calculation Summary</div>
                                {selectedRecipe.ingredients.slice(0, 1).map(ing => {
                                    const r = calcRequisition(ing, groups);
                                    return (
                                        <div key={ing.id} style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.8 }}>
                                            <b>D</b> = Σ(Pi×Ci) = <b>{r.D.toLocaleString()} {ing.unit}</b>
                                            <br />
                                            <b>D_safe</b> = D × 1.10 = <b>{r.D_safe.toLocaleString()} {ing.unit}</b>
                                            <br />
                                            <b>R</b> = ⌈D_safe / {r.packSize}⌉ = <b>{r.R} pack{r.R !== 1 ? 's' : ''}</b>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
