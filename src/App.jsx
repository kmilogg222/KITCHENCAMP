import { useState } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './views/DashboardView';
import RecipesView from './views/RecipesView';
import CreateRecipeView from './views/CreateRecipeView';
import CartView from './views/CartView';
import InventoryView from './views/InventoryView';
import SuppliersView from './views/SuppliersView';
import CalendarView from './views/CalendarView';
import { recipes as MOCK_RECIPES } from './data/mockData';

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  // ── Recipes state (mock + custom) ─────────────────────────────────────────
  const [recipes, setRecipes] = useState(MOCK_RECIPES);

  // ── Create/Edit flow ──────────────────────────────────────────────────────
  // editingRecipe: null → create mode | recipe object → edit mode
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [showCreateView, setShowCreateView] = useState(false);

  const openCreateView = () => {
    setEditingRecipe(null);
    setShowCreateView(true);
  };

  const openEditView = (recipe) => {
    setEditingRecipe(recipe);
    setShowCreateView(true);
  };

  const handleSaveRecipe = (recipe) => {
    setRecipes(prev => {
      const exists = prev.some(r => r.id === recipe.id);
      if (exists) {
        // Update existing
        return prev.map(r => r.id === recipe.id ? recipe : r);
      } else {
        // Add new
        return [...prev, recipe];
      }
    });
    // After save: select the recipe and go to calculator
    setSelectedRecipe(recipe);
    setShowCreateView(false);
    setActiveView('recipes');
  };

  const handleDeleteRecipe = (id) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
    if (selectedRecipe?.id === id) setSelectedRecipe(null);
  };

  const handleCancelCreate = () => {
    setShowCreateView(false);
    setActiveView('recipes');
  };

  // ── Cart state ────────────────────────────────────────────────────────────
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

  // ── Navigation handler (reset create view when going elsewhere) ───────────
  const handleNavigate = (view) => {
    if (view !== 'recipes') setShowCreateView(false);
    setActiveView(view);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar activeView={activeView} onNavigate={handleNavigate} cartCount={cart.length} />

      <main style={{ marginLeft: 80, flex: 1, padding: '32px 36px', minHeight: '100vh', maxWidth: 'calc(100vw - 80px)' }}>

        {activeView === 'dashboard' && (
          <DashboardView
            recipes={recipes}
            onSelectRecipe={(r) => { setSelectedRecipe(r); setActiveView('recipes'); }}
            onNavigate={handleNavigate}
            onCreateNew={openCreateView}
          />
        )}

        {activeView === 'recipes' && !showCreateView && (
          <RecipesView
            recipes={recipes}
            selectedRecipe={selectedRecipe}
            setSelectedRecipe={setSelectedRecipe}
            cart={cart}
            onAddToCart={addToCart}
            onCreateNew={openCreateView}
            onEditRecipe={openEditView}
            onDeleteRecipe={handleDeleteRecipe}
          />
        )}

        {activeView === 'recipes' && showCreateView && (
          <CreateRecipeView
            editingRecipe={editingRecipe}
            onSave={handleSaveRecipe}
            onCancel={handleCancelCreate}
          />
        )}

        {activeView === 'calendar' && <CalendarView />}
        {activeView === 'inventory' && <InventoryView recipes={recipes} />}
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
