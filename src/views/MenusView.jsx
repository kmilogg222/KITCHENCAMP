/**
 * @file MenusView.jsx
 * @description Vista principal para gestionar menús.
 *
 * Un menú agrupa múltiples recetas. Al generar la requisición,
 * el motor consolida ingredientes compartidos entre recetas
 * para producir un pedido unificado.
 *
 * Layout: dos columnas
 *  - Izquierda: lista de menús con búsqueda
 *  - Derecha: detalle del menú seleccionado + requisición consolidada
 */
import { useState } from 'react';
import {
    Search, Zap, RefreshCw, ShoppingBasket, Plus,
    Pencil, Trash2, ChefHat, Layers,
} from 'lucide-react';
import { defaultGroups, calcMenuRequisition } from '../data/mockData';

// ── Group input (same pattern as RecipesView) ────────────────────────────────
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

// ── Consolidated ingredient row ──────────────────────────────────────────────
function ConsolidatedIngredientRow({ item, onAddToCart, alreadyInCart }) {
    const [checked, setChecked] = useState(false);
    const { calc, isShared, usedInRecipes } = item;

    return (
        <div className={`ingredient-row ${checked ? 'checked' : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)}
                    style={{ accentColor: '#4ecdc4', width: 16, height: 16, cursor: 'pointer' }} />
                <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#3d1a78', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {item.name}
                        {isShared && (
                            <span className="shared-badge">
                                <Layers size={10} style={{ display: 'inline', marginRight: 3 }} />
                                {usedInRecipes.length} recipes
                            </span>
                        )}
                    </div>
                    {isShared && (
                        <div style={{ fontSize: 10, color: '#9b6dca', marginTop: 2 }}>
                            Used in: {usedInRecipes.join(', ')}
                        </div>
                    )}
                </div>
            </div>

            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#9b6dca', fontWeight: 500 }}>Stock</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: item.currentStock >= calc.R ? '#10b981' : '#ef4444' }}>
                    {item.currentStock}
                </div>
            </div>

            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#9b6dca', fontWeight: 500 }}>Min.</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#6b3fa0' }}>{item.minOrder}</div>
            </div>

            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#9b6dca', fontWeight: 500 }}>Order</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: calc.R > item.currentStock ? '#ef4444' : '#4ecdc4' }}>
                    {calc.R}<span style={{ fontSize: 10, fontWeight: 400, color: '#9b6dca', marginLeft: 2 }}>packs</span>
                </div>
                <div style={{ fontSize: 9, color: '#9b6dca' }}>{calc.D_safe.toLocaleString()}{item.unit}</div>
            </div>

            <div style={{ textAlign: 'center' }}>
                <button onClick={() => onAddToCart(item, calc)} className="btn-teal"
                    style={{ fontSize: 11, padding: '6px 10px', opacity: alreadyInCart ? 0.55 : 1 }}>
                    {alreadyInCart ? '✓ Added' : '+ Cart'}
                </button>
            </div>
        </div>
    );
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function MenusView({
    menus, recipes, ingredientsCatalog,
    selectedMenu, setSelectedMenu,
    cart, onAddToCart,
    onCreateNew, onEditMenu, onDeleteMenu,
}) {
    const [search, setSearch] = useState('');
    const [groups, setGroups] = useState(defaultGroups);
    const [generated, setGenerated] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const filtered = menus.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.description.toLowerCase().includes(search.toLowerCase())
    );

    const updateCount = (id, val) => {
        setGroups(prev => prev.map(g => g.id === id ? { ...g, count: val } : g));
        setGenerated(false);
    };

    const totalPeople = groups.reduce((s, g) => s + g.count, 0);

    const handleSelectMenu = (m) => { setSelectedMenu(m); setGenerated(false); setGroups(defaultGroups); };

    const handleDelete = (id) => {
        if (deleteConfirm === id) { onDeleteMenu(id); if (selectedMenu?.id === id) setSelectedMenu(null); setDeleteConfirm(null); }
        else { setDeleteConfirm(id); setTimeout(() => setDeleteConfirm(null), 3000); }
    };

    // Get recipes that belong to the selected menu
    const menuRecipes = selectedMenu
        ? selectedMenu.recipeIds.map(rid => recipes.find(r => r.id === rid)).filter(Boolean)
        : [];

    // Calculate consolidated requisition
    const requisitionData = (generated && selectedMenu && totalPeople > 0)
        ? calcMenuRequisition(selectedMenu, recipes, ingredientsCatalog, groups)
        : null;

    return (
        <div className="fade-in-up">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#3d1a78', margin: 0 }}>📋 Menu Calculator</h1>
                <button onClick={onCreateNew} className="btn-primary"><Plus size={16} /> New Menu</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
                {/* Left: menu list */}
                <div>
                    <div style={{ position: 'relative', marginBottom: 14 }}>
                        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9b6dca' }} />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menus…"
                            style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, borderRadius: 12, border: '1.5px solid rgba(155,109,202,0.3)', fontSize: 13, background: 'rgba(255,255,255,0.7)', outline: 'none' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#9b6dca', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                            Menus ({filtered.length})
                        </div>
                        {filtered.map(m => {
                            const mRecipes = m.recipeIds.map(rid => recipes.find(r => r.id === rid)).filter(Boolean);
                            return (
                                <div key={m.id} style={{ position: 'relative' }}>
                                    <button onClick={() => handleSelectMenu(m)} style={{
                                        display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 14,
                                        border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                                        background: selectedMenu?.id === m.id ? 'linear-gradient(135deg,rgba(107,63,160,0.15),rgba(78,205,196,0.15))' : 'rgba(255,255,255,0.5)',
                                        borderLeft: selectedMenu?.id === m.id ? '3px solid #6b3fa0' : '3px solid transparent',
                                        transition: 'all 0.2s', paddingRight: 70,
                                    }}>
                                        <span style={{ fontSize: 24, flexShrink: 0 }}>{m.image}</span>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: 13, color: '#3d1a78', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                                {m.name}
                                            </div>
                                            <div style={{ fontSize: 10, color: '#9b6dca', marginTop: 2 }}>
                                                {mRecipes.length} recipe{mRecipes.length !== 1 ? 's' : ''} · {mRecipes.map(r => r.image).join(' ')}
                                            </div>
                                        </div>
                                    </button>
                                    <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
                                        <button onClick={e => { e.stopPropagation(); onEditMenu(m); }} title="Edit"
                                            style={{ background: 'rgba(107,63,160,0.1)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b3fa0' }}>
                                            <Pencil size={13} />
                                        </button>
                                        <button onClick={e => { e.stopPropagation(); handleDelete(m.id); }} title={deleteConfirm === m.id ? 'Confirm' : 'Delete'}
                                            style={{ background: deleteConfirm === m.id ? '#fef2f2' : 'rgba(239,68,68,0.1)', border: deleteConfirm === m.id ? '1px solid #fca5a5' : 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        <button onClick={onCreateNew} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 14px',
                            borderRadius: 14, cursor: 'pointer', marginTop: 4, background: 'transparent',
                            border: '1.5px dashed rgba(107,63,160,0.35)', color: '#9b6dca', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                        }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#6b3fa0'; e.currentTarget.style.color = '#6b3fa0'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(107,63,160,0.35)'; e.currentTarget.style.color = '#9b6dca'; }}>
                            <Plus size={15} /> Create new menu
                        </button>
                    </div>
                </div>

                {/* Right panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {selectedMenu ? (
                        <div className="glass-card" style={{ padding: 20 }}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: '#3d1a78' }}>{selectedMenu.image} {selectedMenu.name}</div>
                                    <div style={{ fontSize: 12, color: '#9b6dca', marginTop: 4 }}>{selectedMenu.description}</div>
                                </div>
                                <button onClick={() => onEditMenu(selectedMenu)} className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>
                                    <Pencil size={13} style={{ marginRight: 4 }} /> Edit
                                </button>
                            </div>

                            {/* Recipes in this menu */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#6b3fa0', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    <ChefHat size={14} style={{ display: 'inline', marginRight: 6 }} />
                                    Recipes in this menu ({menuRecipes.length})
                                </div>
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    {menuRecipes.map((r, idx) => (
                                        <div key={r.id} className="menu-recipe-card">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: '#9b6dca', opacity: 0.6 }}>#{idx + 1}</span>
                                                <span style={{ fontSize: 22 }}>{r.image}</span>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 13, color: '#3d1a78' }}>{r.name}</div>
                                                    <div style={{ fontSize: 10, color: '#9b6dca' }}>
                                                        {r.ingredients.length} ingredient{r.ingredients.length !== 1 ? 's' : ''} · {r.category}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Groups */}
                            <div style={{ background: 'linear-gradient(135deg,rgba(107,63,160,0.08),rgba(78,205,196,0.08))', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#6b3fa0', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>👥 Diners by Group</div>
                                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                                    {groups.map(g => <GroupInput key={g.id} group={g} value={g.count} onChange={updateCount} />)}
                                </div>
                                {totalPeople > 0 && (
                                    <div style={{ marginTop: 12, fontSize: 12, color: '#4ecdc4', fontWeight: 600 }}>
                                        Total: {totalPeople} person{totalPeople !== 1 ? 's' : ''} × {menuRecipes.length} recipe{menuRecipes.length !== 1 ? 's' : ''} → margin applied: 10%
                                    </div>
                                )}
                            </div>

                            {/* Generate button */}
                            <button onClick={() => setGenerated(true)} className="btn-primary"
                                style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15 }} disabled={totalPeople === 0}>
                                <Zap size={18} /> Generate Menu Requisition
                            </button>
                        </div>
                    ) : (
                        <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                            <div style={{ fontWeight: 600, color: '#9b6dca', marginBottom: 12 }}>Select a menu to get started</div>
                            <button onClick={onCreateNew} className="btn-primary" style={{ margin: '0 auto' }}><Plus size={16} /> Or create your own</button>
                        </div>
                    )}

                    {/* Consolidated Requisition Results */}
                    {requisitionData && (
                        <div className="glass-card slide-in-right" style={{ padding: 20 }}>
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, background: 'linear-gradient(135deg,#6b3fa0,#4ecdc4)', borderRadius: 12, padding: '12px 16px' }}>
                                <div style={{ color: 'white', fontWeight: 700 }}>
                                    <ShoppingBasket size={16} style={{ display: 'inline', marginRight: 6 }} />
                                    {selectedMenu.name} — {totalPeople} diners × {menuRecipes.length} recipes
                                </div>
                                <button onClick={() => setGenerated(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '4px 10px', color: 'white', cursor: 'pointer', fontSize: 12 }}>
                                    <RefreshCw size={12} style={{ display: 'inline', marginRight: 4 }} /> Reset
                                </button>
                            </div>

                            {/* Per-recipe breakdown */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#6b3fa0', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    📊 Per-Recipe Breakdown
                                </div>
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    {requisitionData.byRecipe.map(({ recipe, results }) => (
                                        <div key={recipe.id} style={{
                                            background: 'rgba(255,255,255,0.6)', borderRadius: 12, padding: 12,
                                            border: '1px solid rgba(155,109,202,0.15)', flex: '1 1 200px', minWidth: 200,
                                        }}>
                                            <div style={{ fontWeight: 600, fontSize: 13, color: '#3d1a78', marginBottom: 6 }}>
                                                {recipe.image} {recipe.name}
                                            </div>
                                            {results.map(ing => (
                                                <div key={ing.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4b5563', padding: '2px 0' }}>
                                                    <span>{ing.name}</span>
                                                    <span style={{ fontWeight: 600, color: '#6b3fa0' }}>{ing.calc.R} pack{ing.calc.R !== 1 ? 's' : ''}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Consolidated table header */}
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b3fa0', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                🔗 Consolidated Requisition
                            </div>

                            <div className="ingredient-row" style={{ background: 'rgba(107,63,160,0.08)', marginBottom: 8 }}>
                                {['Ingredient', 'Stock', 'Min.', 'Order', 'Action'].map((h, i) => (
                                    <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase', textAlign: i === 0 ? 'left' : 'center' }}>{h}</div>
                                ))}
                            </div>

                            {requisitionData.consolidated.map(item => (
                                <ConsolidatedIngredientRow
                                    key={item.id}
                                    item={item}
                                    onAddToCart={onAddToCart}
                                    alreadyInCart={cart.some(c => c.ingredientId === item.id)}
                                />
                            ))}

                            {/* Summary */}
                            <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: 'linear-gradient(135deg,rgba(78,205,196,0.1),rgba(107,63,160,0.1))', border: '1px solid rgba(78,205,196,0.3)' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#6b3fa0', marginBottom: 8 }}>📐 Menu Summary</div>
                                <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.8 }}>
                                    <b>Total recipes:</b> {menuRecipes.length}<br />
                                    <b>Total unique ingredients:</b> {requisitionData.consolidated.length}<br />
                                    <b>Shared ingredients:</b> {requisitionData.consolidated.filter(i => i.isShared).length}
                                    {requisitionData.consolidated.filter(i => i.isShared).length > 0 && (
                                        <span style={{ color: '#4ecdc4', marginLeft: 4 }}>
                                            ({requisitionData.consolidated.filter(i => i.isShared).map(i => i.name).join(', ')})
                                        </span>
                                    )}<br />
                                    <b>Total packs to order:</b> <span style={{ fontWeight: 800, color: '#3d1a78' }}>
                                        {requisitionData.consolidated.reduce((s, i) => s + i.calc.R, 0)}
                                    </span><br />
                                    <b>Estimated cost:</b> <span style={{ fontWeight: 800, color: '#3d1a78' }}>
                                        ${requisitionData.consolidated.reduce((s, i) => s + i.calc.R * (i.pricePerPack || 0), 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
