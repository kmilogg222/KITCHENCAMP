/**
 * @file Sidebar.jsx
 * @description Barra de navegación lateral fija.
 *
 * Renderiza los botones de navegación deducidos del array `navItems`.
 * El ícono del carrito muestra un badge con el número de ítems si es > 0.
 *
 * Props:
 *  - activeView {string}   - ID de la vista actualmente activa.
 *  - onNavigate {Function} - Callback para cambiar de vista.
 *  - cartCount  {number}   - Número de ítems en el carrito (para el badge).
 */
import { useNavigate, useLocation } from 'react-router-dom';
import { ChefHat, Calendar, Package, Truck, ShoppingCart, ClipboardList, Calculator, Activity, Users, LogOut } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useAuthContext } from '../hooks/AuthContext';
import { USE_SUPABASE } from '../lib/db/client';

export default function Sidebar() {
    const navigate    = useNavigate();
    const location    = useLocation();
    const cart        = useStore(state => state.cart);
    const cartCount   = cart.reduce((sum, item) => sum + item.packs, 0);
    const { signOut } = useAuthContext();
    
    // Extract the active section from the URL path (e.g. "/recipes/create" -> "recipes")
    const activeView = location.pathname.split('/')[1] || 'dashboard';

    const onNavigate = (path) => navigate(`/${path}`);

    // Definición declarativa de los ítems de navegación.
    // Agregar una nueva sección solo requiere agregar una entrada aquí.
    const navItems = [
        { id: 'recipes', icon: ChefHat, label: 'Recipes' },
        { id: 'menus', icon: ClipboardList, label: 'Menus' },
        { id: 'calendar', icon: Calendar, label: 'Calendar' },
        { id: 'inventory', icon: Package, label: 'Inventory' },
        { id: 'suppliers', icon: Truck, label: 'Suppliers' },
        { id: 'cart', icon: ShoppingCart, label: 'Cart', badge: cartCount },
        // --- Mockups ---
        { id: 'budget', icon: Calculator, label: 'Budget', isMockup: true },
        { id: 'activity', icon: Activity, label: 'Activity', isMockup: true },
        { id: 'staff', icon: Users, label: 'Staff', isMockup: true },
    ];

    return (
        <aside className="fixed left-0 top-0 h-full flex flex-col items-center py-6 gap-2 z-40 overflow-y-auto custom-sidebar-scroll"
            style={{ 
                width: 80, background: 'rgba(61,26,120,0.92)', backdropFilter: 'blur(20px)'
            }}>
            {/* Custom thin scrollbar in webkit */}
            <style>{`
                .custom-sidebar-scroll::-webkit-scrollbar { width: 4px; }
                .custom-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
                .custom-sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(78,205,196,0.6); }
            `}</style>
            
            {/* Logo — click to go back to Dashboard */}
            <div className="flex flex-col items-center mb-4 hover-scale"
                onClick={() => onNavigate('dashboard')}
                style={{ cursor: 'pointer', flexShrink: 0 }}
                title="Back to Dashboard"
            >
                <div className="rounded-2xl flex items-center justify-center mb-1"
                    style={{
                        width: 44, height: 44,
                        background: 'linear-gradient(135deg,#4ecdc4,#38b2ac)',
                        boxShadow: activeView === 'dashboard' ? '0 0 12px rgba(78,205,196,0.5)' : 'none',
                        transition: 'box-shadow 0.2s',
                    }}>
                    <ChefHat size={24} color="white" />
                </div>
                <span style={{ color: activeView === 'dashboard' ? '#4ecdc4' : '#d4c3f0', fontSize: 9, fontWeight: 700, letterSpacing: 1, transition: 'color 0.2s' }}>KitchenCalc</span>
            </div>

            {navItems.map(({ id, icon: Icon, label, badge, isMockup }) => (
                <button key={id}
                    onClick={() => isMockup ? alert(`The ${label} module is currently a mockup design and will be functional soon.`) : onNavigate(id)}
                    title={label}
                    style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        padding: '10px 8px', borderRadius: 14, cursor: isMockup ? 'not-allowed' : 'pointer',
                        background: activeView === id ? 'rgba(78,205,196,0.25)' : 'transparent',
                        border: activeView === id ? '1px solid rgba(78,205,196,0.5)' : '1px solid transparent',
                        color: activeView === id ? '#4ecdc4' : 'rgba(255,255,255,0.5)',
                        transition: 'all 0.2s', position: 'relative', width: 64, flexShrink: 0,
                        opacity: isMockup ? 0.6 : 1, // Dim mockups slightly
                    }}>
                    <Icon size={20} />
                    <span style={{ fontSize: 9, fontWeight: 600, textAlign: 'center' }}>{label}</span>
                    {badge > 0 && (
                        <span className="cart-badge" style={{ right: 4, top: 2 }}>{badge}</span>
                    )}
                </button>
            ))}

            {/* Spacer para empujar el botón de logout al fondo */}
            <div style={{ flex: 1, minHeight: 16 }} />

            {/* Botón de logout — solo visible cuando Supabase está configurado */}
            {USE_SUPABASE && (
                <button
                    onClick={async (e) => {
                        e.preventDefault();
                        const { error } = await signOut();
                        if (error) {
                            console.error("[Sidebar] Error logging out:", error?.message || error);
                            // Fallback agresivo: borrar token de Supabase local
                            Object.keys(localStorage).forEach(key => {
                                if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                                    localStorage.removeItem(key);
                                }
                            });
                            window.location.reload();
                        }
                    }}
                    title="Sign Out"
                    style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        padding: '10px 6px', borderRadius: 14, cursor: 'pointer',
                        background: 'transparent',
                        border: '1px solid transparent',
                        color: 'rgba(255,255,255,0.4)',
                        transition: 'all 0.2s', width: 64, flexShrink: 0, marginTop: 'auto', marginBottom: 12
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.color = '#ef4444';
                        e.currentTarget.style.background = 'rgba(239,68,68,0.12)';
                        e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                    }}
                >
                    <LogOut size={20} />
                    <span style={{ fontSize: 9, fontWeight: 600 }}>Sign Out</span>
                </button>
            )}
        </aside>
    );
}
