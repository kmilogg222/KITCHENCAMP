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
import { Search, Sparkles, TrendingUp, Clock, ChefHat, Plus, ClipboardList } from 'lucide-react';
import StarRating from '../components/StarRating';

export default function DashboardView() {
    const navigate = useNavigate();
    const recipes = useStore(state => state.recipes);
    const menus = useStore(state => state.menus);

    const onSelectRecipe = (r) => navigate('/recipes', { state: { selectedRecipe: r } });
    const onSelectMenu = (m) => navigate('/menus', { state: { selectedMenu: m } });
    const onCreateNew = () => navigate('/recipes/create');
    const onCreateNewMenu = () => navigate('/menus/create');
    const onNavigate = (path) => navigate(`/${path}`);
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
                            What are we cooking today?
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={onCreateNew}
                        className="btn-teal"
                        style={{ padding: '10px 18px' }}
                    >
                        <Plus size={16} /> New Recipe
                    </button>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 32 }}>
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
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: '#3d1a78', margin: 0 }}>
                        Available Recipes
                        <span style={{ fontSize: 13, fontWeight: 400, color: '#9b6dca', marginLeft: 8 }}>
                            ({recipes.length})
                        </span>
                    </h2>
                    <button onClick={() => onNavigate('recipes')} className="btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }}>
                        View all →
                    </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                    {recipes.map((r) => (
                        <div key={r.id}
                            onClick={() => onSelectRecipe(r)}
                            className="glass-card hover-lift"
                            style={{ padding: 20, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                        >
                            {r.isCustom && (
                                <span style={{
                                    position: 'absolute', top: 12, left: 12, fontSize: 9, background: 'linear-gradient(135deg,#6b3fa0,#4ecdc4)',
                                    color: 'white', borderRadius: 20, padding: '2px 8px', fontWeight: 700, letterSpacing: 0.5,
                                }}>
                                    CUSTOM
                                </span>
                            )}
                            {r.isNew && !r.isCustom && (
                                <span className="tag-new" style={{ position: 'absolute', top: 12, right: 12 }}>NEW</span>
                            )}
                            <div style={{ fontSize: 40, marginBottom: 12, marginTop: r.isCustom ? 8 : 0 }}>{r.image}</div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: '#3d1a78', marginBottom: 4 }}>{r.name}</div>
                            <div style={{ fontSize: 11, color: '#9b6dca', marginBottom: 8 }}>{r.description}</div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <StarRating rating={r.rating} />
                                <span className="chip chip-purple">{r.category}</span>
                            </div>
                        </div>
                    ))}

                    {/* Create new card */}
                    <div
                        onClick={onCreateNew}
                        className="glass-card hover-border-purple"
                        style={{
                            padding: 20, cursor: 'pointer',
                            border: '1.5px dashed rgba(107,63,160,0.35)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            justifyContent: 'center', gap: 10, minHeight: 160,
                            background: 'rgba(255,255,255,0.3)',
                        }}
                    >
                        <div style={{
                            width: 48, height: 48, borderRadius: 14, background: 'rgba(107,63,160,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Plus size={24} color="#6b3fa0" />
                        </div>
                        <div style={{ fontWeight: 600, color: '#6b3fa0', fontSize: 14 }}>Create Recipe</div>
                        <div style={{ fontSize: 11, color: '#9b6dca', textAlign: 'center' }}>Add your own custom recipe</div>
                    </div>
                </div>
            </div>

            {/* Menu grid */}
            <div style={{ marginTop: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: '#3d1a78', margin: 0 }}>
                        Available Menus
                        <span style={{ fontSize: 13, fontWeight: 400, color: '#9b6dca', marginLeft: 8 }}>
                            ({menus.length})
                        </span>
                    </h2>
                    <button onClick={() => onNavigate('menus')} className="btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }}>
                        View all →
                    </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                    {menus.map((m) => {
                        const mRecipes = m.recipeIds.map(rid => recipes.find(r => r.id === rid)).filter(Boolean);
                        return (
                            <div key={m.id}
                                onClick={() => onSelectMenu(m)}
                                className="glass-card hover-lift"
                                style={{ padding: 20, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                            >
                                <div style={{ fontSize: 40, marginBottom: 12 }}>{m.image}</div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: '#3d1a78', marginBottom: 4 }}>{m.name}</div>
                                <div style={{ fontSize: 11, color: '#9b6dca', marginBottom: 8 }}>{m.description}</div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', gap: 3 }}>
                                        {mRecipes.map(r => <span key={r.id} style={{ fontSize: 16 }} title={r.name}>{r.image}</span>)}
                                    </div>
                                    <span className="chip chip-teal">{mRecipes.length} recipe{mRecipes.length !== 1 ? 's' : ''}</span>
                                </div>
                            </div>
                        );
                    })}

                    {/* Create new menu card */}
                    <div
                        onClick={onCreateNewMenu}
                        className="glass-card hover-border-teal"
                        style={{
                            padding: 20, cursor: 'pointer',
                            border: '1.5px dashed rgba(78,205,196,0.45)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            justifyContent: 'center', gap: 10, minHeight: 160,
                            background: 'rgba(255,255,255,0.3)',
                        }}
                    >
                        <div style={{
                            width: 48, height: 48, borderRadius: 14, background: 'rgba(78,205,196,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Plus size={24} color="#4ecdc4" />
                        </div>
                        <div style={{ fontWeight: 600, color: '#4ecdc4', fontSize: 14 }}>Create Menu</div>
                        <div style={{ fontSize: 11, color: '#9b6dca', textAlign: 'center' }}>Combine recipes into a menu</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
