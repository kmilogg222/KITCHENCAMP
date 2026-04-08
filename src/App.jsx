import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// ── Componentes Globales ──────────────────────────────────────────────────────
import Sidebar from './components/Sidebar';

// ── Vistas perezosas (Lazy loading) ───────────────────────────────────────────
const DashboardView   = React.lazy(() => import('./views/DashboardView'));
const RecipesView     = React.lazy(() => import('./views/RecipesView'));
const CreateRecipeView = React.lazy(() => import('./views/CreateRecipeView'));
const MenusView       = React.lazy(() => import('./views/MenusView'));
const CreateMenuView  = React.lazy(() => import('./views/CreateMenuView'));
const CalendarView    = React.lazy(() => import('./views/CalendarView'));
const InventoryView   = React.lazy(() => import('./views/InventoryView'));
const SuppliersView   = React.lazy(() => import('./views/SuppliersView'));
const CartView        = React.lazy(() => import('./views/CartView'));

// Loader sencillo para el Suspense
function FallbackLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#9b6dca' }}>
      Loading...
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
        
        {/* Sidebar controla la navegación y muestra enlaces */}
        <Sidebar />

        {/* Área principal donde se renderizan las vistas */}
        <main style={{ marginLeft: 80, flex: 1, padding: '40px 48px', overflowY: 'auto' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
            
            <Suspense fallback={<FallbackLoader />}>
              <Routes>
                {/* Dashboard principal */}
                <Route path="/dashboard" element={<DashboardView />} />

                {/* Recetas */}
                <Route path="/recipes" element={<RecipesView />} />
                <Route path="/recipes/create" element={<CreateRecipeView />} />
                <Route path="/recipes/edit/:id" element={<CreateRecipeView />} />

                {/* Menús */}
                <Route path="/menus" element={<MenusView />} />
                <Route path="/menus/create" element={<CreateMenuView />} />
                <Route path="/menus/edit/:id" element={<CreateMenuView />} />

                {/* Planner / Calendario */}
                <Route path="/calendar" element={<CalendarView />} />

                {/* Inventario */}
                <Route path="/inventory" element={<InventoryView />} />

                {/* Proveedores */}
                <Route path="/suppliers" element={<SuppliersView />} />

                {/* Carrito de Compras */}
                <Route path="/cart" element={<CartView />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>

          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}
