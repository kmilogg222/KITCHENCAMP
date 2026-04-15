/**
 * @file client.js
 * @description Cliente singleton de Supabase para KitchenCalc.
 * Exporta el cliente de Supabase y el feature flag USE_SUPABASE.
 * Si las variables de entorno no están definidas, USE_SUPABASE = false
 * y la app funciona con localStorage como antes.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Feature flag global. Si es false, toda la app usa Zustand + localStorage (comportamiento original).
 * Si es true, la app usa Supabase para persistencia y auth.
 */
export const USE_SUPABASE = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Cliente singleton de Supabase.
 * Solo se instancia cuando USE_SUPABASE = true.
 * @type {import('@supabase/supabase-js').SupabaseClient | null}
 */
export const supabase = USE_SUPABASE
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
