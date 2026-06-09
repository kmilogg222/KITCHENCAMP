/**
 * @file AuthContext.jsx
 * @description Proveedor raíz de autenticación.
 * Solo exporta el componente AuthProvider para cumplir react-refresh/only-export-components.
 * El contexto y useAuthContext viven en ./authContext.js.
 */
import { useAuth } from './useAuth';
import { AuthContext } from './useAuthContext';

export function AuthProvider({ children }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
