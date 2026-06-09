/**
 * @file useAuthContext.js
 * @description Contexto de auth y hook de consumo — sin componentes React.
 * Separado de AuthContext.jsx para satisfacer react-refresh/only-export-components.
 * Nombre diferenciado de AuthContext.jsx para evitar colisiones en filesystems case-insensitive (Windows).
 */
import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
}
