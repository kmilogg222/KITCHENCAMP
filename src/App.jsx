/**
 * @file App.jsx
 * @description Raíz de la aplicación KitchenCalc.
 * AuthProvider ejecuta useAuth() UNA SOLA VEZ y distribuye el estado via Context.
 * Todos los componentes hijos usan useAuthContext() para acceder a user/signOut/etc.
 */
import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// ── Auth: proveedor único de sesión ───────────────────────────────────────────
import { AuthProvider, useAuthContext } from './hooks/AuthContext';

// ── Componentes Globales ──────────────────────────────────────────────────────
import Sidebar         from './components/Sidebar';
import AuthGate        from './components/AuthGate';
import ToastContainer  from './components/Toast';
import MigrationBanner from './components/MigrationBanner';

// ── Store ─────────────────────────────────────────────────────────────────────
import { useStore } from './store/useStore';
import { USE_SUPABASE } from './lib/db/client';

// ── Vistas perezosas (Lazy loading) ───────────────────────────────────────────
const DashboardView    = React.lazy(() => import('./views/DashboardView'));
const RecipesView      = React.lazy(() => import('./views/RecipesView'));
const CreateRecipeView = React.lazy(() => import('./views/CreateRecipeView'));
const MenusView        = React.lazy(() => import('./views/MenusView'));
const CreateMenuView   = React.lazy(() => import('./views/CreateMenuView'));
const CalendarView     = React.lazy(() => import('./views/CalendarView'));
const InventoryView    = React.lazy(() => import('./views/InventoryView'));
const SuppliersView    = React.lazy(() => import('./views/SuppliersView'));
const CartView         = React.lazy(() => import('./views/CartView'));
const DataPortalView   = React.lazy(() => import('./views/DataPortalView'));

// ── Loaders ───────────────────────────────────────────────────────────────────
function FallbackLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#9b6dca' }}>
      Loading...
    </div>
  );
}

// ── Barra de progreso de hidratación (no bloquea las rutas) ─────────────────
function HydrationBar() {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 9999,
      background: 'rgba(78,205,196,0.15)',
    }}>
      <div style={{
        height: '100%', width: '60%',
        background: 'linear-gradient(90deg, #4ecdc4, #38b2ac, #4ecdc4)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s ease-in-out infinite',
        borderRadius: '0 2px 2px 0',
      }} />
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
    </div>
  );
}

// ── Contenido de la app (tras autenticación) ──────────────────────────────────
function AppContent() {
  const { user, needsMigration, dismissMigration } = useAuthContext();
  const isHydrating    = useStore(s => s.isHydrating);
  const hydrationError = useStore(s => s.hydrationError);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {/* Barra de carga discreta — solo visible mientras se hidratan los datos */}
      {isHydrating && USE_SUPABASE && <HydrationBar />}

      <Sidebar />

      <main style={{ marginLeft: 80, flex: 1, padding: '40px 48px', overflowY: 'auto' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', minHeight: 'calc(100vh - 80px)' }}>

          {/* Error de hidratación */}
          {hydrationError ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16, textAlign: 'center' }}>
              <p style={{ color: '#fca5a5', fontSize: 15 }}>Failed to load your data. Please check your connection.</p>
              <p style={{ color: 'rgba(155,109,202,0.6)', fontSize: 12 }}>{hydrationError}</p>
              <button onClick={() => window.location.reload()}
                style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #4ecdc4, #38b2ac)', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                Retry
              </button>
            </div>
          ) : (
            <Suspense fallback={<FallbackLoader />}>
              <Routes>
                <Route path="/dashboard"        element={<DashboardView />} />
                <Route path="/recipes"          element={<RecipesView />} />
                <Route path="/recipes/create"   element={<CreateRecipeView />} />
                <Route path="/recipes/edit/:id" element={<CreateRecipeView />} />
                <Route path="/menus"            element={<MenusView />} />
                <Route path="/menus/create"     element={<CreateMenuView />} />
                <Route path="/menus/edit/:id"   element={<CreateMenuView />} />
                <Route path="/calendar"         element={<CalendarView />} />
                <Route path="/inventory"        element={<InventoryView />} />
                <Route path="/suppliers"        element={<SuppliersView />} />
                <Route path="/cart"             element={<CartView />} />
                <Route path="/data"             element={<DataPortalView />} />
                <Route path="*"                 element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          )}

        </div>
      </main>

      {/* Globales */}
      <ToastContainer />
      {needsMigration && USE_SUPABASE && user && (
        <MigrationBanner userId={user.id} onDismiss={dismissMigration} />
      )}
    </div>
  );
}

// ── App raíz ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    // AuthProvider envuelve TODO — useAuth() se ejecuta UNA SOLA VEZ aquí
    <AuthProvider>
      <AuthGate>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthGate>
    </AuthProvider>
  );
}
