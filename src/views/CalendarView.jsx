/**
 * @file CalendarView.jsx
 * @description Calendario de producción con planificación de comidas por día.
 *
 * Sub-componentes internos:
 *  - MealBadge    : Chip compacto que muestra una comida (slot + nombre).
 *  - AddMealModal : Modal para agregar una receta a un slot del día.
 *  - DayPanel     : Panel lateral deslizante con el detalle de las comidas del día.
 *
 * Estado local:
 *  - meals       : { [dateKey: string]: MealEntry[] } donde dateKey = 'YYYY-MM-DD'.
 *  - selectedDay : { key, label } del día actualmente abierto en el panel.
 *
 * Props:
 *  - recipes {Recipe[]} - Lista de recetas disponibles para planificar.
 */
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, UtensilsCrossed, Sun, Coffee, Moon, Apple } from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MEAL_SLOTS = [
    { key: 'breakfast', label: 'Breakfast', icon: Coffee, color: '#f59e0b' },
    { key: 'lunch', label: 'Lunch', icon: Sun, color: '#6b3fa0' },
    { key: 'dinner', label: 'Dinner', icon: Moon, color: '#4ecdc4' },
    { key: 'snack', label: 'Snack', icon: Apple, color: '#10b981' },
];

// dateKey: "YYYY-MM-DD"
const toKey = (year, month, day) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

// ── Meal slot badge ───────────────────────────────────────────────────────────
function MealBadge({ slot, recipe, onRemove, compact = false }) {
    const SlotIcon = slot.icon;
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: compact ? 3 : 5,
            background: `${slot.color}18`, borderRadius: compact ? 5 : 8,
            padding: compact ? '1px 5px' : '4px 8px',
            border: `1px solid ${slot.color}33`,
            marginBottom: compact ? 2 : 4,
            minWidth: 0,
        }}>
            <SlotIcon size={compact ? 9 : 11} color={slot.color} style={{ flexShrink: 0 }} />
            <span style={{
                fontSize: compact ? 9 : 11, fontWeight: 600, color: slot.color,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            }}>
                {recipe.name}
            </span>
            {onRemove && (
                <button onClick={onRemove} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    display: 'flex', alignItems: 'center', color: slot.color, opacity: 0.6, flexShrink: 0,
                }}>
                    <X size={compact ? 9 : 11} />
                </button>
            )}
        </div>
    );
}

// ── Add Meal Modal ────────────────────────────────────────────────────────────
function AddMealModal({ dateLabel, recipes, existingMeals, onAdd, onClose }) {
    const [selectedSlot, setSelectedSlot] = useState('lunch');
    const [selectedRecipe, setSelectedRecipe] = useState(recipes[0]?.id ?? '');
    const [note, setNote] = useState('');

    const handleAdd = () => {
        if (!selectedRecipe) return;
        const recipe = recipes.find(r => String(r.id) === String(selectedRecipe));
        if (!recipe) return;
        onAdd({ slotKey: selectedSlot, recipe, note: note.trim() });
        setNote('');
    };

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
            <div className="glass-card fade-in-up" style={{ width: '100%', maxWidth: 460, padding: 28 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#3d1a78' }}>
                            🍽️ Add Meal
                        </h2>
                        <p style={{ margin: 0, fontSize: 12, color: '#9b6dca' }}>{dateLabel}</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(107,63,160,0.1)', border: 'none', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={16} color="#6b3fa0" />
                    </button>
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

                {/* Recipe selector */}
                <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Recipe</label>
                    {recipes.length === 0 ? (
                        <div style={{ fontSize: 13, color: '#9b6dca', padding: '10px', background: 'rgba(107,63,160,0.05)', borderRadius: 9 }}>
                            No recipes yet. Create some in the Recipes section first.
                        </div>
                    ) : (
                        <select value={selectedRecipe} onChange={e => setSelectedRecipe(e.target.value)} style={inputSx}>
                            {recipes.map(r => (
                                <option key={r.id} value={r.id}>{r.image} {r.name} — {r.category}</option>
                            ))}
                        </select>
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
                        disabled={!selectedRecipe || recipes.length === 0}
                        className="btn-primary"
                        style={{ opacity: (!selectedRecipe || recipes.length === 0) ? 0.5 : 1 }}
                    >
                        <Plus size={15} /> Add to Calendar
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Day Detail Panel ──────────────────────────────────────────────────────────
function DayPanel({ dateKey, dateLabel, meals, recipes, onAdd, onRemove, onClose }) {
    const [showAddModal, setShowAddModal] = useState(false);
    const totalMeals = meals.length;

    return (
        <>
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: 320,
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
                        {totalMeals === 0 ? 'No meals planned' : `${totalMeals} meal${totalMeals !== 1 ? 's' : ''} planned`}
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
                                    slotMeals.map((meal, i) => (
                                        <div key={i} style={{
                                            marginLeft: 36, marginBottom: 8,
                                            background: 'rgba(255,255,255,0.7)', borderRadius: 10,
                                            padding: '10px 12px', border: `1px solid ${slot.color}22`,
                                            borderLeft: `3px solid ${slot.color}`,
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                                <div style={{ fontWeight: 700, fontSize: 13, color: '#3d1a78', flex: 1 }}>
                                                    {meal.recipe.image} {meal.recipe.name}
                                                </div>
                                                <button onClick={() => onRemove(meal.id)} style={{
                                                    background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 7,
                                                    width: 26, height: 26, cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}>
                                                    <X size={12} color="#ef4444" />
                                                </button>
                                            </div>
                                            <div style={{ fontSize: 11, color: '#9b6dca', marginTop: 2 }}>
                                                {meal.recipe.category}
                                            </div>
                                            {meal.note && (
                                                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, fontStyle: 'italic', background: 'rgba(107,63,160,0.05)', borderRadius: 6, padding: '3px 7px' }}>
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
                        <Plus size={15} /> Add Meal
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
                    existingMeals={meals}
                    onAdd={(entry) => { onAdd(dateKey, entry); setShowAddModal(false); }}
                    onClose={() => setShowAddModal(false)}
                />
            )}
        </>
    );
}

// ── MAIN CalendarView ─────────────────────────────────────────────────────────
export default function CalendarView({ recipes = [] }) {
    const today = new Date();
    const [month, setMonth] = useState(today.getMonth());
    const [year, setYear] = useState(today.getFullYear());
    const [selectedDay, setSelectedDay] = useState(null); // {key, label}

    // meals: { [dateKey]: [{id, slotKey, recipe, note}] }
    const [meals, setMeals] = useState({});

    const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
    const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
    const goToday = () => { setMonth(today.getMonth()); setYear(today.getFullYear()); setSelectedDay(null); };

    // Build calendar cells
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = Array.from({ length: firstDay }).fill(null)
        .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
    while (cells.length % 7 !== 0) cells.push(null);

    // Meal counts per day (for dot indicators)
    const mealCountFor = (day) => {
        if (!day) return 0;
        const key = toKey(year, month, day);
        return (meals[key] ?? []).length;
    };

    const addMeal = (dateKey, { slotKey, recipe, note }) => {
        setMeals(prev => ({
            ...prev,
            [dateKey]: [
                ...(prev[dateKey] ?? []),
                { id: `meal-${Date.now()}-${Math.random()}`, slotKey, recipe, note },
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
    const totalMealsThisMonth = useMemo(() => {
        return Object.entries(meals).filter(([k]) => k.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
            .reduce((acc, [, arr]) => acc + arr.length, 0);
    }, [meals, year, month]);

    const plannedDaysCount = useMemo(() => {
        return Object.entries(meals).filter(([k]) =>
            k.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`) && meals[k].length > 0
        ).length;
    }, [meals, year, month]);

    const uniqueRecipesCount = useMemo(() => {
        const ids = new Set();
        Object.entries(meals).forEach(([k, arr]) => {
            if (k.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
                arr.forEach(m => ids.add(m.recipe.id));
        });
        return ids.size;
    }, [meals, year, month]);

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
                        Plan your daily meals and production schedule
                    </p>
                </div>
                <button onClick={goToday} className="btn-ghost" style={{ fontSize: 13 }}>
                    Today
                </button>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
                {[
                    { label: 'Meals This Month', value: totalMealsThisMonth, color: '#6b3fa0', icon: '🍽️' },
                    { label: 'Days Planned', value: plannedDaysCount, color: '#4ecdc4', icon: '📅' },
                    { label: 'Unique Recipes', value: uniqueRecipesCount, color: '#f59e0b', icon: '👨‍🍳' },
                ].map(({ label, value, color, icon }) => (
                    <div key={label} className="glass-card" style={{ padding: 16 }}>
                        <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
                        <div style={{ fontSize: 11, color: '#9b6dca', fontWeight: 500 }}>{label}</div>
                    </div>
                ))}
            </div>

            {/* Calendar */}
            <div className="glass-card" style={{ padding: 24, marginRight: selectedDay ? 340 : 0, transition: 'margin 0.3s ease' }}>
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

                        // Get up to 2 meal badges to show in cell
                        const visibleMeals = dayMeals.slice(0, 2);
                        const overflow = Math.max(0, count - 2);

                        return (
                            <div
                                key={idx}
                                onClick={() => openDay(day)}
                                style={{
                                    minHeight: 80, borderRadius: 10, padding: '8px 7px',
                                    background: isSelected
                                        ? 'linear-gradient(135deg,rgba(107,63,160,0.18),rgba(78,205,196,0.18))'
                                        : isToday
                                            ? 'linear-gradient(135deg,rgba(107,63,160,0.1),rgba(78,205,196,0.1))'
                                            : day ? 'rgba(255,255,255,0.5)' : 'transparent',
                                    border: isSelected
                                        ? '2px solid rgba(107,63,160,0.5)'
                                        : isToday
                                            ? '1.5px solid rgba(107,63,160,0.3)'
                                            : '1px solid transparent',
                                    cursor: day ? 'pointer' : 'default',
                                    transition: 'all 0.15s',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}
                                onMouseEnter={e => { if (day && !isSelected) e.currentTarget.style.background = 'rgba(107,63,160,0.07)'; }}
                                onMouseLeave={e => {
                                    if (day && !isSelected && !isToday) e.currentTarget.style.background = 'rgba(255,255,255,0.5)';
                                    if (isToday && !isSelected) e.currentTarget.style.background = 'linear-gradient(135deg,rgba(107,63,160,0.1),rgba(78,205,196,0.1))';
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
                                                    <MealBadge key={m.id} slot={slot} recipe={m.recipe} compact />
                                                );
                                            })}
                                            {overflow > 0 && (
                                                <div style={{ fontSize: 9, color: '#9b6dca', fontWeight: 700, paddingLeft: 2 }}>
                                                    +{overflow} more
                                                </div>
                                            )}
                                        </div>

                                        {/* Add meal pulse (only if no meals and hovered) */}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
                        <UtensilsCrossed size={12} color="#9b6dca" />
                        <span style={{ fontSize: 11, color: '#9b6dca' }}>Click a day to plan meals</span>
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
                    onAdd={addMeal}
                    onRemove={(mealId) => removeMeal(selectedDay.key, mealId)}
                    onClose={() => setSelectedDay(null)}
                />
            )}
        </div>
    );
}
