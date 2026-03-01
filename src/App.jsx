import { useState } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './views/DashboardView';
import RecipesView from './views/RecipesView';
import CartView from './views/CartView';
import InventoryView from './views/InventoryView';
import SuppliersView from './views/SuppliersView';
import CalendarView from './views/CalendarView';

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  // Cart state: array of { ingredientId, name, R, pricePerPack, supplier, packSize }
  const [cart, setCart] = useState([]);

  const addToCart = (ingredient, result) => {
    setCart(prev => {
      if (prev.some(i => i.ingredientId === ingredient.id)) return prev;
      return [
        ...prev,
        {
          ingredientId: ingredient.id,
          name: ingredient.name,
          R: result.R,
          pricePerPack: ingredient.pricePerPack,
          supplier: ingredient.supplier,
          packSize: ingredient.packSize,
          unit: ingredient.unit,
        },
      ];
    });
  };

  const removeFromCart = (ingredientId) => {
    setCart(prev => prev.filter(i => i.ingredientId !== ingredientId));
  };

  const clearCart = () => setCart([]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar activeView={activeView} onNavigate={setActiveView} cartCount={cart.length} />

      {/* Main content */}
      <main style={{ marginLeft: 80, flex: 1, padding: '32px 36px', minHeight: '100vh', maxWidth: 'calc(100vw - 80px)' }}>
        {activeView === 'dashboard' && (
          <DashboardView
            onSelectRecipe={setSelectedRecipe}
            onNavigate={setActiveView}
          />
        )}
        {activeView === 'recipes' && (
          <RecipesView
            selectedRecipe={selectedRecipe}
            setSelectedRecipe={setSelectedRecipe}
            cart={cart}
            onAddToCart={addToCart}
          />
        )}
        {activeView === 'calendar' && <CalendarView />}
        {activeView === 'inventory' && <InventoryView />}
        {activeView === 'suppliers' && <SuppliersView />}
        {activeView === 'cart' && (
          <CartView
            cart={cart}
            onRemove={removeFromCart}
            onClearCart={clearCart}
          />
        )}
      </main>
    </div>
  );
}
