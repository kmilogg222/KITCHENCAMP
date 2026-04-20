/**
 * @file errors.js
 * @description Mapeo de códigos de error de Supabase/Postgres a mensajes amigables.
 */

const PG_CODE_MAP = {
  '23505': 'Este elemento ya existe (duplicado).',
  '23503': 'No se puede completar — falta un registro relacionado.',
  '23502': 'Falta un campo obligatorio.',
  '42501': 'No tienes permisos para esta acción.',
  '53300': 'Demasiadas conexiones. Intenta de nuevo en un momento.',
  '57014': 'La solicitud expiró. Intenta de nuevo.',
  'PGRST116': 'Registro no encontrado.',
};

/**
 * Convierte un error de Supabase/Postgres a un mensaje legible para el usuario.
 * @param {object|null} error - Objeto de error de Supabase
 * @returns {string}
 */
export function mapSupabaseError(error) {
  if (!error) return 'Error desconocido.';
  const friendly = PG_CODE_MAP[error.code];
  if (friendly) return friendly;
  return error.message ?? 'Error inesperado.';
}
