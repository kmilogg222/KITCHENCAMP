/**
 * @file AuthContext.jsx
 * @description Contexto de autenticación global.
 * useAuth() se ejecuta UNA SOLA VEZ aquí y se distribuye vía Context API.
 * Esto evita que AuthGate y AppContent creen suscripciones duplicadas.
 */
import { createContext, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';

const AuthContext = createContext(null);

/** Proveedor raíz — envuelve toda la app, ejecuta useAuth() una sola vez */
export function AuthProvider({ children }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

/** Hook de consumo — cualquier componente usa este en lugar de useAuth() directamente */
export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
}
