import { Search, Sparkles, TrendingUp, Clock, ChefHat } from 'lucide-react';
import { recipes } from '../data/mockData';
import StarRating from '../components/StarRating';

export default function DashboardView({ onSelectRecipe, onNavigate }) {
    return (
        <div className="fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, color: '#3d1a78', margin: 0 }}>
                        Welcome back, Chef 👋
                    </h1>
                    <p style={{ fontSize: 14, color: '#9b6dca', marginTop: 4 }}>
                        What are we cooking today?
                    </p>
                </div>
                <div style={{
                    background: 'linear-gradient(135deg,#6b3fa0,#3d1a78)',
                    borderRadius: 16, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8,
                    color: 'white', fontSize: 13, fontWeight: 600,
                }}>
                    <Sparkles size={16} />
                    KitchenCalc Pro
                </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 32 }}>
                {[
                    { label: 'Active Recipes', value: recipes.length, icon: ChefHat, color: '#6b3fa0' },
                    { label: 'Orders This Week', value: 12, icon: TrendingUp, color: '#4ecdc4' },
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

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 24 }}>
                <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9b6dca' }} />
                <input
                    readOnly
                    placeholder="Search recipes, ingredients…"
                    onClick={() => onNavigate('recipes')}
                    style={{
                        width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
                        borderRadius: 14, border: '1.5px solid rgba(155,109,202,0.3)', fontSize: 14,
                        background: 'rgba(255,255,255,0.7)', cursor: 'pointer', outline: 'none',
                        backdropFilter: 'blur(8px)',
                    }}
                />
            </div>

            {/* Recipe grid */}
            <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: '#3d1a78', margin: 0 }}>Available Recipes</h2>
                    <button onClick={() => onNavigate('recipes')} className="btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }}>
                        View all
                    </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                    {recipes.map((r) => (
                        <div key={r.id}
                            onClick={() => { onSelectRecipe(r); onNavigate('recipes'); }}
                            className="glass-card"
                            style={{ padding: 20, cursor: 'pointer', transition: 'all 0.25s', position: 'relative', overflow: 'hidden' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(109,63,160,0.2)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                        >
                            {r.isNew && <span className="tag-new" style={{ position: 'absolute', top: 12, right: 12 }}>NEW</span>}
                            <div style={{ fontSize: 40, marginBottom: 12 }}>{r.image}</div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: '#3d1a78', marginBottom: 4 }}>{r.name}</div>
                            <div style={{ fontSize: 11, color: '#9b6dca', marginBottom: 8 }}>{r.description}</div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <StarRating rating={r.rating} />
                                <span className="chip chip-purple">{r.category}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
