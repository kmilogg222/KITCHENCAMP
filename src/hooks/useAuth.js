/**
 * @file useAuth.js
 * @description Hook de autenticación con Supabase.
 * Maneja sesión, login, signup y logout.
 * La hidratación del store se hace via useStore.getState() (acceso imperativo)
 * para evitar dependencias circulares y el deadlock de gotrue-js en StrictMode.
 */
import { useState, useEffect, useRef } from 'react';
import { supabase, USE_SUPABASE } from '../lib/db/client';
import { fetchAllUserData } from '../lib/db/transform';
import { useStore, setCurrentUserId } from '../store/useStore';
import { hasLocalData, isUserDbEmpty } from '../lib/db/migration';

/**
 * Hook principal de autenticación.
 */
export function useAuth() {
  const [user, setUser]                     = useState(null);
  const [loading, setLoading]               = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);

  // ── Función de hidratación (imperativa, sin hooks extra) ─────────────────
  async function hydrateStore(sessionUser) {
    if (!USE_SUPABASE || !sessionUser) return;
    
    // Obtener estado global para evitar doble hidratación (incluso en StrictMode)
    const { isHydrating, hasHydrated, hydrate, setHydrationError, setHydrating } = useStore.getState();
    
    // Si ya estamos hidratando, o si ya hidratamos previamente en esta sesión, ignorar
    if (isHydrating || hasHydrated) return;

    setCurrentUserId(sessionUser.id);
    setHydrating(true);

    try {
      const data = await fetchAllUserData();
      hydrate(data);

      // Verificar si hay datos locales para migrar (DB vacía + localStorage con datos)
      if (hasLocalData()) {
        const empty = await isUserDbEmpty(sessionUser.id);
        if (empty) setNeedsMigration(true);
      }
    } catch (err) {
      console.error('[useAuth] Hydration failed:', err.message);
      setHydrationError(err.message);
    }
  }

  useEffect(() => {
    // Modo sin Supabase: usuario local mock, siempre autenticado
    if (!USE_SUPABASE) {
      setUser({ id: 'local', email: 'local@kitchencalc.app' });
      setLoading(false);
      // En modo local, no hay isHydrating (el store arranca con mockData)
      useStore.getState().setHydrating(false);
      return;
    }

    let isMounted = true;

    // Obtener sesión existente al montar
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) await hydrateStore(sessionUser);
      setLoading(false);
    });

    // Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);

        if (event === 'SIGNED_IN' && sessionUser) {
          setLoading(false);
          await hydrateStore(sessionUser);
        }

        if (event === 'SIGNED_OUT') {
          setCurrentUserId(null);
          setNeedsMigration(false);
          useStore.getState().resetStore();
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Acciones de auth ─────────────────────────────────────────────────────
  const signUp = async (email, password) => {
    if (!USE_SUPABASE) return { data: null, error: new Error('Supabase not configured') };
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  };

  const signIn = async (email, password) => {
    if (!USE_SUPABASE) return { data: null, error: new Error('Supabase not configured') };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signOut = async () => {
    if (!USE_SUPABASE) return { error: null };
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (e) {
      return { error: e };
    }
  };

  const dismissMigration = () => setNeedsMigration(false);

  return { user, loading, needsMigration, signUp, signIn, signOut, dismissMigration };
}
