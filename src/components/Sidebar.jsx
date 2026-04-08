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
import { ChefHat, Calendar, Package, Truck, ShoppingCart, ClipboardList, Calculator, Activity, Users } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const cart = useStore(state => state.cart);
    const cartCount = cart.reduce((sum, item) => sum + item.packs, 0);
    
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
        <aside className="fixed left-0 top-0 h-full flex flex-col items-center py-8 gap-3 z-40"
            style={{ width: 80, background: 'rgba(61,26,120,0.92)', backdropFilter: 'blur(20px)' }}>
            {/* Logo — click to go back to Dashboard */}
            <div className="flex flex-col items-center mb-6 hover-scale"
                onClick={() => onNavigate('dashboard')}
                style={{ cursor: 'pointer' }}
                title="Back to Dashboard"
            >
                <div className="rounded-2xl flex items-center justify-center mb-1"
                    style={{
                        width: 48, height: 48,
                        background: 'linear-gradient(135deg,#4ecdc4,#38b2ac)',
                        boxShadow: activeView === 'dashboard' ? '0 0 12px rgba(78,205,196,0.5)' : 'none',
                        transition: 'box-shadow 0.2s',
                    }}>
                    <ChefHat size={26} color="white" />
                </div>
                <span style={{ color: activeView === 'dashboard' ? '#4ecdc4' : '#d4c3f0', fontSize: 9, fontWeight: 700, letterSpacing: 1, transition: 'color 0.2s' }}>KitchenCalc</span>
            </div>

            {navItems.map(({ id, icon: Icon, label, badge, isMockup }) => (
                <button key={id}
                    onClick={() => isMockup ? alert(`The ${label} module is currently a mockup design and will be functional soon.`) : onNavigate(id)}
                    title={label}
                    style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        padding: '12px 10px', borderRadius: 14, cursor: isMockup ? 'not-allowed' : 'pointer',
                        background: activeView === id ? 'rgba(78,205,196,0.25)' : 'transparent',
                        border: activeView === id ? '1px solid rgba(78,205,196,0.5)' : '1px solid transparent',
                        color: activeView === id ? '#4ecdc4' : 'rgba(255,255,255,0.5)',
                        transition: 'all 0.2s', position: 'relative', width: 60,
                        opacity: isMockup ? 0.6 : 1, // Dim mockups slightly
                    }}>
                    <Icon size={22} />
                    <span style={{ fontSize: 9, fontWeight: 600 }}>{label}</span>
                    {badge > 0 && (
                        <span className="cart-badge">{badge}</span>
                    )}
                </button>
            ))}
        </aside>
    );
}
