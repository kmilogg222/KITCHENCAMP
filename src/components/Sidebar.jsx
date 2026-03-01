import { ChefHat, Calendar, Package, Truck, ShoppingCart } from 'lucide-react';

export default function Sidebar({ activeView, onNavigate, cartCount }) {
    const navItems = [
        { id: 'recipes', icon: ChefHat, label: 'Recipes' },
        { id: 'calendar', icon: Calendar, label: 'Calendar' },
        { id: 'inventory', icon: Package, label: 'Inventory' },
        { id: 'suppliers', icon: Truck, label: 'Suppliers' },
        { id: 'cart', icon: ShoppingCart, label: 'Cart', badge: cartCount },
    ];

    return (
        <aside className="fixed left-0 top-0 h-full flex flex-col items-center py-8 gap-3 z-40"
            style={{ width: 80, background: 'rgba(61,26,120,0.92)', backdropFilter: 'blur(20px)' }}>
            {/* Logo */}
            <div className="flex flex-col items-center mb-6">
                <div className="rounded-2xl flex items-center justify-center mb-1"
                    style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#4ecdc4,#38b2ac)' }}>
                    <ChefHat size={26} color="white" />
                </div>
                <span style={{ color: '#d4c3f0', fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>KitchenCalc</span>
            </div>

            {navItems.map(({ id, icon: Icon, label, badge }) => (
                <button key={id}
                    onClick={() => onNavigate(id)}
                    title={label}
                    style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        padding: '12px 10px', borderRadius: 14, cursor: 'pointer',
                        background: activeView === id ? 'rgba(78,205,196,0.25)' : 'transparent',
                        border: activeView === id ? '1px solid rgba(78,205,196,0.5)' : '1px solid transparent',
                        color: activeView === id ? '#4ecdc4' : 'rgba(255,255,255,0.5)',
                        transition: 'all 0.2s', position: 'relative', width: 60,
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
