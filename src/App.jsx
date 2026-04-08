/**
 * @file App.jsx
 * @description Componente raíz de KitchenCalc.
 *
 * Responsabilidades:
 *  1. Mantener el estado global de la aplicación (ingredientes, recetas,
 *     suppliers, carrito y navegación).
 *  2. Delegar cada pieza de lógica a custom hooks especializados.
 *  3. Renderizar la vista activa pasando sólo las props que cada vista necesita.
 *
 * Flujo de datos:
 *  mockData → useState (initial state) → handlers → props → views
 *
 * No contiene lógica de negocio propia; sólo orquesta los hooks y las vistas.
 */
import React, { useState, Suspense } from 'react';

// ── Componentes ───────────────────────────────────────────────────────────────
import Sidebar from './components/Sidebar';
import { useKitchen } from './context/KitchenContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// ── Vistas (Lazy Loaded) ──────────────────────────────────────────────────────
const DashboardView = React.lazy(() => import('./views/DashboardView'));
const RecipesView = React.lazy(() => import('./views/RecipesView'));
const CreateRecipeView = React.lazy(() => import('./views/CreateRecipeView'));
const MenusView = React.lazy(() => import('./views/MenusView'));
const CreateMenuView = React.lazy(() => import('./views/CreateMenuView'));
const CalendarView = React.lazy(() => import('./views/CalendarView'));
const InventoryView = React.lazy(() => import('./views/InventoryView'));
const SuppliersView = React.lazy(() => import('./views/SuppliersView'));
const CartView = React.lazy(() => import('./views/CartView'));

// ─────────────────────────────────────────────────────────────────────────────
export default function App() {

  const {
    ingredients, addIngredient, updateIngredient, deleteIngredient,
    suppliers, addSupplier, updateSupplier, deleteSupplier,
    recipes, addRecipe, updateRecipe, removeRecipe,
    menus, addMenu, updateMenu, removeMenu,
    cart, addToCart, removeFromCart, clearCart
  } = useKitchen();

  // ── Estado de navegación ─────────────────────────────────────────────────
  // `activeView` controla qué sección se muestra (sidebar-driven).
  const [activeView, setActiveView] = useState('dashboard');
  // `selectedRecipe` es la receta actualmente destacada en RecipesView.
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  // ── Flujo de Crear / Editar receta ────────────────────────────────────────
  // `editingRecipe` es null cuando se crea y el objeto receta cuando se edita.
  // `showCreateView` alterna entre RecipesView y CreateRecipeView.
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [showCreateView, setShowCreateView] = useState(false);

  /** Abre el formulario en modo CREACIÓN. */
  const openCreateView = () => {
    setEditingRecipe(null);
    setShowCreateView(true);
    setActiveView('recipes');
  };

  /** Abre el formulario en modo EDICIÓN con la receta dada. */
  const openEditView = (recipe) => {
    setEditingRecipe(recipe);
    setShowCreateView(true);
    setActiveView('recipes');
  };

  /**
   * Handler llamado desde CreateRecipeView al guardar.
   * Puede recibir también ingredientes nuevos creados en el formulario,
   * que se agregan al catálogo global antes de actualizar la receta.
   *
   * @param {object}   recipe         - Objeto receta a crear o actualizar.
   * @param {object[]} newIngredients - Ingredientes nuevos creados en el form.
   */
  const handleSaveRecipe = (recipe, newIngredients = []) => {
    // 1. Agregar al catálogo los ingredientes creados dentro del formulario
    newIngredients.forEach(ing => addIngredient(ing));

    // 2. Upsert de la receta: si ya existe → actualizar, si no → crear
    const exists = recipes.some(r => r.id === recipe.id);
    if (exists) updateRecipe(recipe);
    else addRecipe(recipe);

    // 3. Seleccionar la receta guardada y volver a RecipesView
    setSelectedRecipe(recipe);
    setShowCreateView(false);
    setActiveView('recipes');
  };

  /**
   * Elimina una receta. Si era la receta seleccionada, limpia la selección.
   * @param {number|string} id - ID de la receta a eliminar.
   */
  const handleDeleteRecipe = (id) => {
    removeRecipe(id);
    if (selectedRecipe?.id === id) setSelectedRecipe(null);
  };

  /** Cancela la creación/edición de una receta y vuelve al listado. */
  const handleCancelCreate = () => {
    setShowCreateView(false);
    setActiveView('recipes');
  };

  // ── Flujo de Crear / Editar menú ──────────────────────────────────────────
  const [editingMenu, setEditingMenu] = useState(null);
  const [showCreateMenuView, setShowCreateMenuView] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState(null);

  /** Abre el formulario en modo CREACIÓN de menú. */
  const openCreateMenuView = () => {
    setEditingMenu(null);
    setShowCreateMenuView(true);
    setActiveView('menus');
  };

  /** Abre el formulario en modo EDICIÓN con el menú dado. */
  const openEditMenuView = (menu) => {
    setEditingMenu(menu);
    setShowCreateMenuView(true);
    setActiveView('menus');
  };

  /**
   * Handler llamado desde CreateMenuView al guardar.
   * @param {object} menu - Objeto menú a crear o actualizar.
   */
  const handleSaveMenu = (menu) => {
    const exists = menus.some(m => m.id === menu.id);
    if (exists) updateMenu(menu);
    else addMenu(menu);
    setSelectedMenu(menu);
    setShowCreateMenuView(false);
    setActiveView('menus');
  };

  /**
   * Elimina un menú. Si era el seleccionado, limpia la selección.
   * @param {string} id - ID del menú a eliminar.
   */
  const handleDeleteMenu = (id) => {
    removeMenu(id);
    if (selectedMenu?.id === id) setSelectedMenu(null);
  };

  /** Cancela la creación/edición de un menú y vuelve al listado. */
  const handleCancelCreateMenu = () => {
    setShowCreateMenuView(false);
    setActiveView('menus');
  };

  /**
   * Centraliza la navegación entre vistas.
   * Al salir de la sección de recetas se descarta el formulario abierto.
   * @param {string} view - ID de la vista destino.
   */
  const handleNavigate = (view) => {
    if (view !== 'recipes') setShowCreateView(false);
    if (view !== 'menus') setShowCreateMenuView(false);
    setActiveView(view);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* Barra de navegación lateral fija */}
      <Sidebar
        activeView={activeView}
        onNavigate={handleNavigate}
        cartCount={cart.length}
      />

      {/* Área de contenido principal */}
      <main style={{
        marginLeft: 80,
        flex: 1,
        padding: '32px 36px',
        minHeight: '100vh',
        maxWidth: 'calc(100vw - 80px)',
      }}>
        <ErrorBoundary>
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b3fa0' }}>Loading...</div>}>
          {/* ── Dashboard ───────────────────────────────────────────── */}
          {activeView === 'dashboard' && (
            <DashboardView
              onSelectRecipe={(r) => {
                setSelectedRecipe(r);
                setActiveView('recipes');
                setShowCreateView(false);
              }}
              onSelectMenu={(m) => {
                setSelectedMenu(m);
                setActiveView('menus');
                setShowCreateMenuView(false);
              }}
              onNavigate={handleNavigate}
              onCreateNew={openCreateView}
              onCreateNewMenu={openCreateMenuView}
            />
          )}

          {/* ── Listado de Recetas ───────────────────────────────────── */}
          {activeView === 'recipes' && !showCreateView && (
            <RecipesView
              selectedRecipe={selectedRecipe}
              setSelectedRecipe={setSelectedRecipe}
              onCreateNew={openCreateView}
              onEditRecipe={openEditView}
              onDeleteRecipe={handleDeleteRecipe}
            />
          )}

          {/* ── Formulario Crear / Editar Receta ─────────────────────── */}
          {activeView === 'recipes' && showCreateView && (
            <CreateRecipeView
              editingRecipe={editingRecipe}
              ingredientsCatalog={ingredients}
              onSave={handleSaveRecipe}
              onCancel={handleCancelCreate}
            />
          )}

          {/* ── Listado de Menús ────────────────────────────────────── */}
          {activeView === 'menus' && !showCreateMenuView && (
            <MenusView
              selectedMenu={selectedMenu}
              setSelectedMenu={setSelectedMenu}
              onCreateNew={openCreateMenuView}
              onEditMenu={openEditMenuView}
              onDeleteMenu={handleDeleteMenu}
            />
          )}

          {/* ── Formulario Crear / Editar Menú ────────────────────────── */}
          {activeView === 'menus' && showCreateMenuView && (
            <CreateMenuView
              editingMenu={editingMenu}
              recipes={recipes}
              onSave={handleSaveMenu}
              onCancel={handleCancelCreateMenu}
            />
          )}

          {/* ── Calendario de Producción ─────────────────────────────── */}
          {activeView === 'calendar' && (
            <CalendarView />
          )}

          {/* ── Inventario (catálogo global de ingredientes) ──────────── */}
          {activeView === 'inventory' && (
            <InventoryView />
          )}

          {/* ── Gestión de Suppliers ─────────────────────────────────── */}
          {activeView === 'suppliers' && (
            <SuppliersView />
          )}

          {/* ── Carrito de Compras ───────────────────────────────────── */}
          {activeView === 'cart' && (
            <CartView />
          )}
        </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
