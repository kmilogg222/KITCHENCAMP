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
import { useState } from 'react';

// ── Componentes ───────────────────────────────────────────────────────────────
import Sidebar from './components/Sidebar';

// ── Vistas ────────────────────────────────────────────────────────────────────
import DashboardView from './views/DashboardView';
import RecipesView from './views/RecipesView';
import CreateRecipeView from './views/CreateRecipeView';
import MenusView from './views/MenusView';
import CreateMenuView from './views/CreateMenuView';
import CalendarView from './views/CalendarView';
import InventoryView from './views/InventoryView';
import SuppliersView from './views/SuppliersView';
import CartView from './views/CartView';

// ── Custom Hooks ──────────────────────────────────────────────────────────────
import { useCrudState } from './hooks/useCrudState';
import { useCartManager } from './hooks/useCartManager';

// ── Datos iniciales (mock) ───────────────────────────────────────────────────
import {
  recipes as MOCK_RECIPES,
  ingredientsCatalog as MOCK_CATALOG,
  suppliers as MOCK_SUPPLIERS,
  menus as MOCK_MENUS,
} from './data/mockData';

// ─────────────────────────────────────────────────────────────────────────────
export default function App() {

  // ── Estado de navegación ─────────────────────────────────────────────────
  // `activeView` controla qué sección se muestra (sidebar-driven).
  const [activeView, setActiveView] = useState('dashboard');
  // `selectedRecipe` es la receta actualmente destacada en RecipesView.
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  // ── Colecciones CRUD (via hook genérico) ─────────────────────────────────
  // Cada useCrudState retorna { items, add, update, remove }.
  const {
    items: ingredients,
    add: addIngredient,
    update: updateIngredient,
    remove: deleteIngredient,
  } = useCrudState(MOCK_CATALOG);

  const {
    items: suppliers,
    add: addSupplier,
    update: updateSupplier,
    remove: deleteSupplier,
  } = useCrudState(MOCK_SUPPLIERS);

  const {
    items: recipes,
    add: addRecipe,
    update: updateRecipe,
    remove: removeRecipe,
  } = useCrudState(MOCK_RECIPES);

  const {
    items: menus,
    add: addMenu,
    update: updateMenu,
    remove: removeMenu,
  } = useCrudState(MOCK_MENUS);

  // ── Carrito de compras ────────────────────────────────────────────────────
  const { cart, addToCart, removeFromCart, clearCart } = useCartManager();

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

        {/* ── Dashboard ───────────────────────────────────────────── */}
        {activeView === 'dashboard' && (
          <DashboardView
            recipes={recipes}
            menus={menus}
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
            recipes={recipes}
            ingredientsCatalog={ingredients}
            selectedRecipe={selectedRecipe}
            setSelectedRecipe={setSelectedRecipe}
            cart={cart}
            onAddToCart={addToCart}
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
            menus={menus}
            recipes={recipes}
            ingredientsCatalog={ingredients}
            selectedMenu={selectedMenu}
            setSelectedMenu={setSelectedMenu}
            cart={cart}
            onAddToCart={addToCart}
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
          <CalendarView recipes={recipes} menus={menus} />
        )}

        {/* ── Inventario (catálogo global de ingredientes) ──────────── */}
        {activeView === 'inventory' && (
          <InventoryView
            ingredients={ingredients}
            recipes={recipes}
            suppliers={suppliers}
            onUpdateIngredient={updateIngredient}
            onAddIngredient={addIngredient}
            onDeleteIngredient={deleteIngredient}
          />
        )}

        {/* ── Gestión de Suppliers ─────────────────────────────────── */}
        {activeView === 'suppliers' && (
          <SuppliersView
            suppliers={suppliers}
            ingredients={ingredients}
            onAddSupplier={addSupplier}
            onUpdateSupplier={updateSupplier}
            onDeleteSupplier={deleteSupplier}
          />
        )}

        {/* ── Carrito de Compras ───────────────────────────────────── */}
        {activeView === 'cart' && (
          <CartView
            cart={cart}
            suppliers={suppliers}
            onRemove={removeFromCart}
            onClearCart={clearCart}
          />
        )}

      </main>
    </div>
  );
}
