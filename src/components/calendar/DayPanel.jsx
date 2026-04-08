import React, { useState } from 'react';
import { ChevronDown, ChevronUp, X, Plus } from 'lucide-react';
import { MEAL_SLOTS, AddMealModal } from './AddMealModal';

export function DayPanel({ dateKey, dateLabel, meals, recipes, menus, onAdd, onRemove, onClose }) {
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
