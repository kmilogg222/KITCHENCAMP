/**
 * @file CalendarView.jsx
 * @description Production calendar with daily meal planning.
 *
 * Supports adding both individual RECIPES and full MENUS to calendar days.
 * When a menu is added, all its recipes are grouped visually and marked
 * with a distinct "MENU" badge.
 *
 * Props:
 *  - recipes {Recipe[]} - Available recipes.
 *  - menus   {Menu[]}   - Available menus (groups of recipes).
 */
import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import {
    ChevronLeft, ChevronRight, Plus, X, UtensilsCrossed,
    ClipboardList, ChevronDown, ChevronUp,
} from 'lucide-react';
import { MEAL_SLOTS, INPUT_STYLE } from '../constants/theme';

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];



const toKey = (year, month, day) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

// ── Meal badge (compact for calendar cells) ──────────────────────────────────
function MealBadge({ slot, recipe, isMenu, compact = false }) {
    const SlotIcon = slot.icon;
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: compact ? 3 : 5,
            background: isMenu ? 'rgba(78,205,196,0.12)' : `${slot.color}18`,
            borderRadius: compact ? 5 : 8,
            padding: compact ? '1px 5px' : '4px 8px',
            border: isMenu ? '1px solid rgba(78,205,196,0.3)' : `1px solid ${slot.color}33`,
            marginBottom: compact ? 2 : 4,
            minWidth: 0,
        }}>
            {isMenu ? (
                <ClipboardList size={compact ? 9 : 11} color="#4ecdc4" style={{ flexShrink: 0 }} />
            ) : (
                <SlotIcon size={compact ? 9 : 11} color={slot.color} style={{ flexShrink: 0 }} />
            )}
            <span style={{
                fontSize: compact ? 9 : 11, fontWeight: 600,
                color: isMenu ? '#4ecdc4' : slot.color,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            }}>
                {recipe?.name ?? 'Menu'}
            </span>
        </div>
    );
}

// ── Add Meal Modal (supports both Recipes and Menus) ─────────────────────────
function AddMealModal({ dateLabel, recipes, menus = [], onAdd, onClose }) {
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

    const inputSx = INPUT_STYLE;

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

// ── Day Detail Panel ──────────────────────────────────────────────────────────
function DayPanel({ dateKey, dateLabel, meals, recipes, menus, onAdd, onRemove, onClose }) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState({});
    const totalMeals = meals.length;

    const toggleMenu = (id) => setExpandedMenus(prev => ({ ...prev, [id]: !prev[id] }));

    return (
        <>
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: 340,
                background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)',
                borderLeft: '1px solid rgba(107,63,160,0.15)',
                boxShadow: '-8px 0 32px rgba(61,26,120,0.12)',
                zIndex: 100, display: 'flex', flexDirection: 'column',
                animation: 'slideInRight 0.3s ease-out',
            }}>
                {/* Panel header */}
                <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(107,63,160,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ fontWeight: 800, fontSize: 17, color: '#3d1a78' }}>📅 {dateLabel}</div>
                        <button onClick={onClose} style={{ background: 'rgba(107,63,160,0.1)', border: 'none', borderRadius: 9, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={15} color="#6b3fa0" />
                        </button>
                    </div>
                    <div style={{ fontSize: 12, color: '#9b6dca' }}>
                        {totalMeals === 0 ? 'No meals planned' : `${totalMeals} item${totalMeals !== 1 ? 's' : ''} planned`}
                    </div>
                </div>

                {/* Meal slots */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                    {MEAL_SLOTS.map(slot => {
                        const slotMeals = meals.filter(m => m.slotKey === slot.key);
                        const SlotIcon = slot.icon;
                        return (
                            <div key={slot.key} style={{ marginBottom: 20 }}>
                                {/* Slot header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${slot.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <SlotIcon size={14} color={slot.color} />
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: slot.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{slot.label}</span>
                                    {slotMeals.length > 0 && (
                                        <span style={{ fontSize: 10, background: `${slot.color}20`, color: slot.color, borderRadius: 20, padding: '1px 7px', fontWeight: 700 }}>
                                            {slotMeals.length}
                                        </span>
                                    )}
                                </div>

                                {/* Meal items */}
                                {slotMeals.length === 0 ? (
                                    <div style={{ fontSize: 12, color: '#c4b5d9', fontStyle: 'italic', paddingLeft: 36 }}>
                                        Nothing planned
                                    </div>
                                ) : (
                                    slotMeals.map((meal) => (
                                        <div key={meal.id} style={{
                                            marginLeft: 36, marginBottom: 8,
                                            background: meal.type === 'menu'
                                                ? 'linear-gradient(135deg,rgba(78,205,196,0.06),rgba(255,255,255,0.7))'
                                                : 'rgba(255,255,255,0.7)',
                                            borderRadius: 10,
                                            padding: '10px 12px',
                                            border: meal.type === 'menu'
                                                ? '1px solid rgba(78,205,196,0.25)'
                                                : `1px solid ${slot.color}22`,
                                            borderLeft: meal.type === 'menu'
                                                ? '3px solid #4ecdc4'
                                                : `3px solid ${slot.color}`,
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    {meal.type === 'menu' ? (
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <span style={{ fontWeight: 700, fontSize: 13, color: '#3d1a78' }}>
                                                                    {meal.menu.image} {meal.menu.name}
                                                                </span>
                                                                <span style={{
                                                                    background: 'linear-gradient(135deg,#4ecdc4,#38b2ac)',
                                                                    color: 'white', fontSize: 9, fontWeight: 700,
                                                                    padding: '1px 6px', borderRadius: 10,
                                                                }}>MENU</span>
                                                            </div>
                                                            <div style={{ fontSize: 11, color: '#9b6dca', marginTop: 2 }}>
                                                                {meal.menuRecipes?.length ?? 0} recipe{(meal.menuRecipes?.length ?? 0) !== 1 ? 's' : ''}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div style={{ fontWeight: 700, fontSize: 13, color: '#3d1a78' }}>
                                                                {meal.recipe.image} {meal.recipe.name}
                                                            </div>
                                                            <div style={{ fontSize: 11, color: '#9b6dca', marginTop: 2 }}>
                                                                {meal.recipe.category}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                                    {meal.type === 'menu' && (
                                                        <button onClick={() => toggleMenu(meal.id)} style={{
                                                            background: 'rgba(78,205,196,0.1)', border: 'none', borderRadius: 7,
                                                            width: 26, height: 26, cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        }}>
                                                            {expandedMenus[meal.id]
                                                                ? <ChevronUp size={12} color="#4ecdc4" />
                                                                : <ChevronDown size={12} color="#4ecdc4" />}
                                                        </button>
                                                    )}
                                                    <button onClick={() => onRemove(meal.id)} style={{
                                                        background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 7,
                                                        width: 26, height: 26, cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        flexShrink: 0,
                                                    }}>
                                                        <X size={12} color="#ef4444" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Menu expanded recipes */}
                                            {meal.type === 'menu' && expandedMenus[meal.id] && (
                                                <div style={{
                                                    marginTop: 8, paddingTop: 8,
                                                    borderTop: '1px solid rgba(78,205,196,0.15)',
                                                }}>
                                                    {(meal.menuRecipes ?? []).map((r, idx) => (
                                                        <div key={r.id} style={{
                                                            display: 'flex', alignItems: 'center', gap: 6,
                                                            padding: '4px 0', fontSize: 12, color: '#374151',
                                                        }}>
                                                            <span style={{ fontSize: 10, color: '#9b6dca', fontWeight: 700 }}>#{idx + 1}</span>
                                                            <span>{r.image}</span>
                                                            <span style={{ fontWeight: 500, flex: 1 }}>{r.name}</span>
                                                            <span style={{ fontSize: 10, color: '#9b6dca' }}>{r.category}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {meal.note && (
                                                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6, fontStyle: 'italic', background: 'rgba(107,63,160,0.05)', borderRadius: 6, padding: '3px 7px' }}>
                                                    📝 {meal.note}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Add button */}
                <div style={{ padding: 16, borderTop: '1px solid rgba(107,63,160,0.1)' }}>
                    <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                        <Plus size={15} /> Add Meal or Menu
                    </button>
                </div>
            </div>

            {/* Backdrop for panel */}
            <div onClick={onClose} style={{
                position: 'fixed', inset: 0, zIndex: 99,
                background: 'transparent',
            }} />

            {/* Add Meal Modal */}
            {showAddModal && (
                <AddMealModal
                    dateLabel={dateLabel}
                    recipes={recipes}
                    menus={menus}
                    onAdd={(entry) => { onAdd(dateKey, entry); setShowAddModal(false); }}
                    onClose={() => setShowAddModal(false)}
                />
            )}
        </>
    );
}

export default function CalendarView() {
    const recipes = useStore(state => state.recipes);
    const menus = useStore(state => state.menus);
    const today = new Date();
    const [month, setMonth] = useState(today.getMonth());
    const [year, setYear] = useState(today.getFullYear());
    const [selectedDay, setSelectedDay] = useState(null);

    // meals: { [dateKey]: [{id, type, slotKey, recipe?, menu?, menuRecipes?, note}] }
    const meals = useStore(state => state.calendarEvents);
    const setMeals = useStore(state => state.setCalendarEvents);

    const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
    const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
    const goToday = () => { setMonth(today.getMonth()); setYear(today.getFullYear()); setSelectedDay(null); };

    // Build calendar cells
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = Array.from({ length: firstDay }).fill(null)
        .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
    while (cells.length % 7 !== 0) cells.push(null);

    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    const addMeal = (dateKey, entry) => {
        setMeals(prev => ({
            ...prev,
            [dateKey]: [
                ...(prev[dateKey] ?? []),
                { id: `meal-${Date.now()}-${Math.random()}`, ...entry },
            ],
        }));
    };

    const removeMeal = (dateKey, mealId) => {
        setMeals(prev => ({
            ...prev,
            [dateKey]: (prev[dateKey] ?? []).filter(m => m.id !== mealId),
        }));
    };

    // Stats for month
    const totalItemsThisMonth = useMemo(() => {
        return Object.entries(meals).filter(([k]) => k.startsWith(monthPrefix))
            .reduce((acc, [, arr]) => acc + arr.length, 0);
    }, [meals, monthPrefix]);

    const plannedDaysCount = useMemo(() => {
        return Object.entries(meals).filter(([k]) =>
            k.startsWith(monthPrefix) && meals[k].length > 0
        ).length;
    }, [meals, monthPrefix]);

    const menusPlannedCount = useMemo(() => {
        return Object.entries(meals).filter(([k]) => k.startsWith(monthPrefix))
            .reduce((acc, [, arr]) => acc + arr.filter(m => m.type === 'menu').length, 0);
    }, [meals, monthPrefix]);

    const uniqueRecipesCount = useMemo(() => {
        const ids = new Set();
        Object.entries(meals).forEach(([k, arr]) => {
            if (k.startsWith(monthPrefix))
                arr.forEach(m => {
                    if (m.type === 'menu' && m.menuRecipes) {
                        m.menuRecipes.forEach(r => ids.add(r.id));
                    } else if (m.recipe) {
                        ids.add(m.recipe.id);
                    }
                });
        });
        return ids.size;
    }, [meals, monthPrefix]);

    const openDay = (day) => {
        if (!day) return;
        const key = toKey(year, month, day);
        const dateLabel = `${MONTH_NAMES[month]} ${day}, ${year}`;
        setSelectedDay({ key, label: dateLabel });
    };

    return (
        <div className="fade-in-up">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: '#3d1a78', margin: 0 }}>
                        📅 Production Calendar
                    </h1>
                    <p style={{ fontSize: 13, color: '#9b6dca', margin: '4px 0 0' }}>
                        Plan daily meals with individual recipes or full menus
                    </p>
                </div>
                <button onClick={goToday} className="btn-ghost" style={{ fontSize: 13 }}>
                    Today
                </button>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
                {[
                    { label: 'Items This Month', value: totalItemsThisMonth, color: '#6b3fa0', icon: '🍽️' },
                    { label: 'Days Planned', value: plannedDaysCount, color: '#4ecdc4', icon: '📅' },
                    { label: 'Menus Planned', value: menusPlannedCount, color: '#38b2ac', icon: '📋' },
                    { label: 'Unique Recipes', value: uniqueRecipesCount, color: '#f59e0b', icon: '👨‍🍳' },
                ].map(({ label, value, color, icon }) => (
                    <div key={label} className="glass-card" style={{ padding: 16 }}>
                        <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
                        <div style={{ fontSize: 11, color: '#9b6dca', fontWeight: 500 }}>{label}</div>
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="glass-card" style={{ padding: 24, marginRight: selectedDay ? 360 : 0, transition: 'margin 0.3s ease' }}>
                {/* Month nav */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <button onClick={prev} style={{ background: 'rgba(107,63,160,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronLeft size={18} color="#6b3fa0" />
                    </button>
                    <div style={{ fontWeight: 800, fontSize: 20, color: '#3d1a78' }}>
                        {MONTH_NAMES[month]} {year}
                    </div>
                    <button onClick={next} style={{ background: 'rgba(107,63,160,0.1)', border: 'none', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronRight size={18} color="#6b3fa0" />
                    </button>
                </div>

                {/* Day name headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8 }}>
                    {DAY_NAMES.map(d => (
                        <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#9b6dca', textTransform: 'uppercase', padding: '4px 0' }}>
                            {d}
                        </div>
                    ))}
                </div>

                {/* Calendar cells */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
                    {cells.map((day, idx) => {
                        const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                        const key = day ? toKey(year, month, day) : null;
                        const isSelected = key && selectedDay?.key === key;
                        const dayMeals = key ? (meals[key] ?? []) : [];
                        const count = dayMeals.length;
                        const hasMenu = dayMeals.some(m => m.type === 'menu');

                        const visibleMeals = dayMeals.slice(0, 2);
                        const overflow = Math.max(0, count - 2);

                        return (
                            <div
                                key={idx}
                                className={`glass-card ${day && !isSelected ? 'hover-bg-purple' : ''}`}
                                style={{
                                    minHeight: 80, borderRadius: 10, padding: '8px 7px',
                                    background: isSelected
                                        ? 'linear-gradient(135deg,rgba(107,63,160,0.18),rgba(78,205,196,0.18))'
                                        : isToday
                                            ? 'linear-gradient(135deg,rgba(107,63,160,0.1),rgba(78,205,196,0.1))'
                                            : day ? 'rgba(255,255,255,0.5)' : 'transparent',
                                    border: isSelected
                                        ? '2px solid rgba(107,63,160,0.5)'
                                        : hasMenu
                                            ? '1.5px solid rgba(78,205,196,0.4)'
                                            : isToday
                                                ? '1.5px solid rgba(107,63,160,0.3)'
                                                : '1px solid transparent',
                                    cursor: day ? 'pointer' : 'default',
                                    transition: 'all 0.15s',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}
                            >
                                {day && (
                                    <>
                                        {/* Day number */}
                                        <div style={{
                                            fontWeight: isToday ? 800 : 600, fontSize: 13,
                                            color: isToday ? '#6b3fa0' : isSelected ? '#3d1a78' : '#374151',
                                            marginBottom: 4,
                                            display: 'flex', alignItems: 'center', gap: 4,
                                        }}>
                                            {isToday ? (
                                                <span style={{
                                                    background: 'linear-gradient(135deg,#6b3fa0,#4ecdc4)',
                                                    color: 'white', borderRadius: '50%', width: 22, height: 22,
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 12,
                                                }}>
                                                    {day}
                                                </span>
                                            ) : day}
                                        </div>

                                        {/* Meal badges (compact) */}
                                        <div>
                                            {visibleMeals.map((m) => {
                                                const slot = MEAL_SLOTS.find(s => s.key === m.slotKey) ?? MEAL_SLOTS[0];
                                                return (
                                                    <MealBadge
                                                        key={m.id}
                                                        slot={slot}
                                                        recipe={m.type === 'menu' ? m.menu : m.recipe}
                                                        isMenu={m.type === 'menu'}
                                                        compact
                                                    />
                                                );
                                            })}
                                            {overflow > 0 && (
                                                <div style={{ fontSize: 9, color: '#9b6dca', fontWeight: 700, paddingLeft: 2 }}>
                                                    +{overflow} more
                                                </div>
                                            )}
                                        </div>

                                        {/* Add meal indicator */}
                                        {count === 0 && (
                                            <div style={{
                                                position: 'absolute', bottom: 5, right: 5,
                                                width: 14, height: 14, borderRadius: '50%',
                                                background: 'rgba(107,63,160,0.15)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <Plus size={8} color="#9b6dca" />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: 20, marginTop: 20, flexWrap: 'wrap', paddingTop: 16, borderTop: '1px solid rgba(107,63,160,0.1)' }}>
                    {MEAL_SLOTS.map(slot => {
                        const SlotIcon = slot.icon;
                        return (
                            <div key={slot.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <SlotIcon size={12} color={slot.color} />
                                <span style={{ fontSize: 11, color: slot.color, fontWeight: 600 }}>{slot.label}</span>
                            </div>
                        );
                    })}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <ClipboardList size={12} color="#4ecdc4" />
                        <span style={{ fontSize: 11, color: '#4ecdc4', fontWeight: 600 }}>Menu</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
                        <UtensilsCrossed size={12} color="#9b6dca" />
                        <span style={{ fontSize: 11, color: '#9b6dca' }}>Click a day to plan</span>
                    </div>
                </div>
            </div>

            {/* Day detail panel */}
            {selectedDay && (
                <DayPanel
                    dateKey={selectedDay.key}
                    dateLabel={selectedDay.label}
                    meals={meals[selectedDay.key] ?? []}
                    recipes={recipes}
                    menus={menus}
                    onAdd={addMeal}
                    onRemove={(mealId) => removeMeal(selectedDay.key, mealId)}
                    onClose={() => setSelectedDay(null)}
                />
            )}
        </div>
    );
}
