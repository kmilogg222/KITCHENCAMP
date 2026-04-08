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
import {
    ChevronLeft, ChevronRight, Plus, UtensilsCrossed,
    ClipboardList,
} from 'lucide-react';
import { DayPanel } from '../components/calendar/DayPanel';
import { MEAL_SLOTS } from '../components/calendar/AddMealModal';

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


import { useKitchen } from '../context/KitchenContext';

// ── MAIN CalendarView ─────────────────────────────────────────────────────────
export default function CalendarView() {
    const { recipes = [], menus = [] } = useKitchen();
    const today = new Date();
    const [month, setMonth] = useState(today.getMonth());
    const [year, setYear] = useState(today.getFullYear());
    const [selectedDay, setSelectedDay] = useState(null);

    // meals: { [dateKey]: [{id, type, slotKey, recipe?, menu?, menuRecipes?, note}] }
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
