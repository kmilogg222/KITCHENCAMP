import React, { useState } from 'react';
import { Coffee, Sun, Moon, Apple, X, Plus } from 'lucide-react';

export const MEAL_SLOTS = [
    { key: 'breakfast', label: 'Breakfast', icon: Coffee, color: '#f59e0b' },
    { key: 'lunch', label: 'Lunch', icon: Sun, color: '#6b3fa0' },
    { key: 'dinner', label: 'Dinner', icon: Moon, color: '#4ecdc4' },
    { key: 'snack', label: 'Snack', icon: Apple, color: '#10b981' },
];

export function AddMealModal({ dateLabel, recipes, menus = [], onAdd, onClose }) {
    const [selectedSlot, setSelectedSlot] = useState('lunch');
    const [mode, setMode] = useState('recipe'); // 'recipe' | 'menu'
    const [selectedRecipe, setSelectedRecipe] = useState(recipes[0]?.id ?? '');
    const [selectedMenu, setSelectedMenu] = useState(menus[0]?.id ?? '');
    const [note, setNote] = useState('');

    const handleAdd = () => {
        if (mode === 'recipe') {
            if (!selectedRecipe) return;
            const recipe = recipes.find(r => String(r.id) === String(selectedRecipe));
            if (!recipe) return;
            onAdd({ type: 'recipe', slotKey: selectedSlot, recipe, note: note.trim() });
        } else {
            if (!selectedMenu) return;
            const menu = menus.find(m => m.id === selectedMenu);
            if (!menu) return;
            const menuRecipes = menu.recipeIds.map(rid => recipes.find(r => r.id === rid)).filter(Boolean);
            onAdd({ type: 'menu', slotKey: selectedSlot, menu, menuRecipes, note: note.trim() });
        }
        setNote('');
    };

    const currentMenu = menus.find(m => m.id === selectedMenu);
    const currentMenuRecipes = currentMenu
        ? currentMenu.recipeIds.map(rid => recipes.find(r => r.id === rid)).filter(Boolean)
        : [];

    const inputSx = {
        padding: '8px 11px', borderRadius: 9, fontSize: 13,
        border: '1.5px solid rgba(155,109,202,0.3)', outline: 'none',
        background: 'rgba(255,255,255,0.85)', color: '#1f2937', width: '100%',
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(61,26,120,0.35)',
            backdropFilter: 'blur(6px)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
            <div className="glass-card fade-in-up" style={{ width: '100%', maxWidth: 500, padding: 28 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#3d1a78' }}>
                            🍽️ Add to Calendar
                        </h2>
                        <p style={{ margin: 0, fontSize: 12, color: '#9b6dca' }}>{dateLabel}</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(107,63,160,0.1)', border: 'none', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={16} color="#6b3fa0" />
                    </button>
                </div>

                {/* Type toggle: Recipe vs Menu */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>What to add</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <button onClick={() => setMode('recipe')} style={{
                            padding: '12px 10px', borderRadius: 12,
                            border: `2px solid ${mode === 'recipe' ? '#6b3fa0' : 'transparent'}`,
                            background: mode === 'recipe' ? 'linear-gradient(135deg,rgba(107,63,160,0.12),rgba(107,63,160,0.06))' : 'rgba(255,255,255,0.5)',
                            cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.2s',
                        }}>
                            <span style={{ fontSize: 20 }}>🍳</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#6b3fa0' }}>Single Recipe</span>
                            <span style={{ fontSize: 10, color: '#9b6dca' }}>Add one dish</span>
                        </button>
                        <button onClick={() => setMode('menu')} style={{
                            padding: '12px 10px', borderRadius: 12,
                            border: `2px solid ${mode === 'menu' ? '#4ecdc4' : 'transparent'}`,
                            background: mode === 'menu' ? 'linear-gradient(135deg,rgba(78,205,196,0.12),rgba(78,205,196,0.06))' : 'rgba(255,255,255,0.5)',
                            cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.2s',
                        }}>
                            <span style={{ fontSize: 20 }}>📋</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#4ecdc4' }}>Full Menu</span>
                            <span style={{ fontSize: 10, color: '#9b6dca' }}>Add multiple recipes</span>
                        </button>
                    </div>
                </div>

                {/* Meal slot selector */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Meal Slot</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                        {MEAL_SLOTS.map(slot => {
                            const SlotIcon = slot.icon;
                            const active = selectedSlot === slot.key;
                            return (
                                <button key={slot.key} onClick={() => setSelectedSlot(slot.key)} style={{
                                    padding: '10px 6px', borderRadius: 10, border: `2px solid ${active ? slot.color : 'transparent'}`,
                                    background: active ? `${slot.color}18` : 'rgba(255,255,255,0.5)',
                                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', gap: 4, transition: 'all 0.2s',
                                }}>
                                    <SlotIcon size={16} color={slot.color} />
                                    <span style={{ fontSize: 11, fontWeight: 600, color: slot.color }}>{slot.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Recipe / Menu selector */}
                <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                        {mode === 'recipe' ? 'Recipe' : 'Menu'}
                    </label>

                    {mode === 'recipe' ? (
                        recipes.length === 0 ? (
                            <div style={{ fontSize: 13, color: '#9b6dca', padding: '10px', background: 'rgba(107,63,160,0.05)', borderRadius: 9 }}>
                                No recipes yet. Create some in the Recipes section first.
                            </div>
                        ) : (
                            <select value={selectedRecipe} onChange={e => setSelectedRecipe(e.target.value)} style={inputSx}>
                                {recipes.map(r => (
                                    <option key={r.id} value={r.id}>{r.image} {r.name} — {r.category}</option>
                                ))}
                            </select>
                        )
                    ) : (
                        menus.length === 0 ? (
                            <div style={{ fontSize: 13, color: '#9b6dca', padding: '10px', background: 'rgba(78,205,196,0.05)', borderRadius: 9 }}>
                                No menus yet. Create some in the Menus section first.
                            </div>
                        ) : (
                            <>
                                <select value={selectedMenu} onChange={e => setSelectedMenu(e.target.value)} style={{ ...inputSx, borderColor: 'rgba(78,205,196,0.4)' }}>
                                    {menus.map(m => {
                                        const mRecipes = m.recipeIds.map(rid => recipes.find(r => r.id === rid)).filter(Boolean);
                                        return (
                                            <option key={m.id} value={m.id}>
                                                {m.image} {m.name} — {mRecipes.length} recipe{mRecipes.length !== 1 ? 's' : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                                {/* Menu preview */}
                                {currentMenu && (
                                    <div style={{
                                        marginTop: 10, background: 'linear-gradient(135deg,rgba(78,205,196,0.08),rgba(107,63,160,0.05))',
                                        borderRadius: 10, padding: 12, border: '1px solid rgba(78,205,196,0.2)',
                                    }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#3d1a78', marginBottom: 6 }}>
                                            {currentMenu.image} {currentMenu.name}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#9b6dca', marginBottom: 8 }}>{currentMenu.description}</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {currentMenuRecipes.map((r, idx) => (
                                                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151' }}>
                                                    <span style={{ fontSize: 10, color: '#9b6dca', fontWeight: 700 }}>#{idx + 1}</span>
                                                    <span>{r.image}</span>
                                                    <span style={{ fontWeight: 500 }}>{r.name}</span>
                                                    <span style={{ fontSize: 10, color: '#9b6dca' }}>· {r.category}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )
                    )}
                </div>

                {/* Optional note */}
                <div style={{ marginBottom: 22 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Note (optional)</label>
                    <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. 40 servings, VIP event…" style={inputSx} />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} className="btn-ghost">Cancel</button>
                    <button
                        onClick={handleAdd}
                        disabled={(mode === 'recipe' && (!selectedRecipe || recipes.length === 0)) || (mode === 'menu' && (!selectedMenu || menus.length === 0))}
                        className={mode === 'menu' ? 'btn-teal' : 'btn-primary'}
                        style={{ opacity: ((mode === 'recipe' && (!selectedRecipe || recipes.length === 0)) || (mode === 'menu' && (!selectedMenu || menus.length === 0))) ? 0.5 : 1 }}
                    >
                        <Plus size={15} /> {mode === 'menu' ? 'Add Menu' : 'Add Recipe'}
                    </button>
                </div>
            </div>
        </div>
    );
}