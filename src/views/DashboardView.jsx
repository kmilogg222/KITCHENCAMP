/**
 * @file DashboardView.jsx
 * @description Vista principal / portal de la aplicación.
 *
 * Muestra:
 *  - Tarjetas de estadísticas rápidas (recetas, pedidos, tiempo promedio).
 *  - Barra de búsqueda (decorativa; al hacer click navega a RecipesView).
 *  - Grid de recetas disponibles con acceso directo.
 *  - Tarjeta CTA para crear una nueva receta.
 *
 * Props:
 *  - recipes        {Recipe[]}  - Lista de recetas activas.
 *  - onSelectRecipe {Function}  - Selecciona una receta y navega a RecipesView.
 *  - onNavigate     {Function}  - Navega a cualquier vista por ID.
 *  - onCreateNew    {Function}  - Abre el formulario de creación de receta.
 */
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import SkeletonList from '../components/SkeletonList';
import { Sparkles, Clock, ChefHat, Plus, ClipboardList, AlertTriangle, Users, Truck, ArrowRight, Calendar as CalendarIcon, PackageOpen } from 'lucide-react';

export default function DashboardView() {
    const navigate = useNavigate();
    const recipes = useStore(state => state.recipes);
    const menus = useStore(state => state.menus);
    const ingredients = useStore(state => state.ingredients);
    const calendarEvents = useStore(state => state.calendarEvents);

    const onNavigate = (path) => navigate(`/${path}`);

    // Data for Widgets
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todaysEvents = calendarEvents[todayString] || [];
    const lowInventory = ingredients.filter(i => i.currentStock <= i.minOrder).slice(0, 5);

    // Mockups
    const teamMockup = [
        { id: 1, name: 'Carlos (Head Chef)', status: 'online', avatar: '👨‍🍳' },
        { id: 2, name: 'Julie (Sous Chef)', status: 'busy', avatar: '👩‍🍳' },
        { id: 3, name: 'Marcus (Prep)', status: 'offline', avatar: '🧑‍🍳' },
        { id: 4, name: 'Elena (Pastry)', status: 'online', avatar: '🧕' },
    ];

    const getStatusColor = (status) => {
        if (status === 'online') return '#10b981'; // Green
        if (status === 'busy') return '#f59e0b'; // Amber
        return '#9ca3af'; // Gray
    };

    const isHydrating = useStore(s => s.isHydrating);
    if (isHydrating) return <SkeletonList rows={4} />;

    return (
        <div className="fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#3d1a78', margin: 0 }}>
                            Welcome back, Chef 👋
                        </h1>
                        <p style={{ fontSize: 14, color: '#9b6dca', marginTop: 4 }}>
                            Here is the status of your kitchen today.
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{
                        background: 'linear-gradient(135deg,#6b3fa0,#3d1a78)',
                        borderRadius: 16, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8,
                        color: 'white', fontSize: 13, fontWeight: 600,
                    }}>
                        <Sparkles size={16} />
                        KitchenCalc Pro
                    </div>
                </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
                {[
                    { label: 'Active Recipes', value: recipes.length, icon: ChefHat, color: '#6b3fa0' },
                    { label: 'Active Menus', value: menus.length, icon: ClipboardList, color: '#4ecdc4' },
                    { label: 'Avg. Prep Time', value: '35 min', icon: Clock, color: '#f59e0b' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="glass-card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                                width: 42, height: 42, borderRadius: 12,
                                background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Icon size={20} color={color} />
                            </div>
                            <div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: '#3d1a78' }}>{value}</div>
                                <div style={{ fontSize: 11, color: '#9b6dca', fontWeight: 500 }}>{label}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bento Grid layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
                
                {/* LEFT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    
                    {/* WIDGET 1: Today's Menu */}
                    <div className="glass-card" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#3d1a78', fontWeight: 700, fontSize: 16 }}>
                                <CalendarIcon size={18} color="#4ecdc4" /> Menu For Today
                            </div>
                            <button onClick={() => onNavigate('calendar')} className="btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }}>
                                View Calendar <ArrowRight size={12} style={{ marginLeft: 4 }} />
                            </button>
                        </div>

                        {todaysEvents.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {todaysEvents.map((evt, idx) => {
                                    return (
                                        <div key={idx} style={{
                                            background: 'rgba(255,255,255,0.6)', borderRadius: 12, padding: 16,
                                            borderLeft: '4px solid #4ecdc4'
                                        }}>
                                            <div style={{ fontSize: 11, color: '#9b6dca', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                                                {evt.type === 'menu' ? 'Full Menu' : 'Single Recipe'} — {evt.slotKey.toUpperCase()}
                                            </div>
                                            <div style={{ fontSize: 15, fontWeight: 800, color: '#3d1a78' }}>
                                                {evt.type === 'menu' ? evt.menu?.name : evt.recipe?.name}
                                            </div>
                                            {evt.note && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>📝 {evt.note}</div>}
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div style={{
                                background: 'rgba(107,63,160,0.05)', borderRadius: 12, padding: 24,
                                textAlign: 'center', border: '1.5px dashed rgba(107,63,160,0.2)'
                            }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>🍽️</div>
                                <div style={{ fontWeight: 600, color: '#6b3fa0', fontSize: 14 }}>Nothing Scheduled</div>
                                <div style={{ fontSize: 12, color: '#9b6dca', marginTop: 4 }}>Your calendar is clear for today.</div>
                            </div>
                        )}
                    </div>

                    {/* WIDGET 2: Next Delivery Mockup */}
                    <div className="glass-card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#3d1a78', fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
                            <Truck size={18} color="#6b3fa0" /> Next Delivery (Mockup)
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'linear-gradient(135deg,rgba(107,63,160,0.1),rgba(78,205,196,0.1))',
                            padding: 16, borderRadius: 14, border: '1px solid rgba(107,63,160,0.2)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                    📦
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, color: '#3d1a78', fontSize: 14 }}>SISCO Foods</div>
                                    <div style={{ fontSize: 11, color: '#6b3fa0', fontWeight: 600 }}>Arriving Tomorrow • 08:00 AM</div>
                                </div>
                            </div>
                            <span className="chip chip-purple">Pending</span>
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    
                    {/* WIDGET 3: Low Inventory */}
                    <div className="glass-card" style={{ padding: 24, flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontWeight: 700, fontSize: 15 }}>
                                <AlertTriangle size={18} color="#ef4444" /> Low Inventory
                            </div>
                            <button onClick={() => onNavigate('inventory')} className="btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}>
                                View All
                            </button>
                        </div>

                        {lowInventory.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {lowInventory.map(ing => (
                                    <div key={ing.id} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '10px 12px', background: 'rgba(239,68,68,0.05)', borderRadius: 10,
                                        border: '1px solid rgba(239,68,68,0.2)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <PackageOpen size={16} color="#ef4444" />
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#7f1d1d', fontSize: 13 }}>{ing.name}</div>
                                                <div style={{ fontSize: 10, color: '#991b1b' }}>Supplier: {ing.supplier}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 800, color: '#ef4444', fontSize: 14 }}>{ing.currentStock}</div>
                                            <div style={{ fontSize: 9, color: '#b91c1c' }}>Min: {ing.minOrder}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ fontSize: 12, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: 12, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                                <Sparkles size={14} /> Stock levels are perfect!
                            </div>
                        )}
                    </div>

                    {/* WIDGET 4: Team Availability (Mockup) */}
                    <div className="glass-card" style={{ padding: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#3d1a78', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
                            <Users size={18} color="#4ecdc4" /> Team Available (Mockup)
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {teamMockup.map(member => (
                                <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ fontSize: 24 }}>{member.avatar}</div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{member.name}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: getStatusColor(member.status), boxShadow: `0 0 8px ${getStatusColor(member.status)}` }} />
                                        <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'capitalize' }}>{member.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="hover-border-teal" style={{
                            width: '100%', marginTop: 16, padding: '10px', background: 'transparent',
                            border: '1.5px dashed rgba(78,205,196,0.5)', borderRadius: 10, color: '#4ecdc4',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                        }}>
                            + Manage Team
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
