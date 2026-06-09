/**
 * @file calendar.js
 * @description CRUD de calendar_events en Supabase.
 * El store usa { "YYYY-MM-DD": events[] }; la DB usa filas planas con event_date.
 */
import { supabase } from './client';

/**
 * Inserta un único evento de calendario.
 * @param {object} event  - CalendarEvent del store { type, itemId, slot, note }
 * @param {string} dateKey - "YYYY-MM-DD"
 * @param {string} userId
 */
export async function insertCalendarEvent(event, dateKey, userId) {
  const row = {
    user_id:    userId,
    event_date: dateKey,
    slot:       event.slotKey,
    type:       event.type,
    recipe_id:  event.type === 'recipe' ? (event.itemId ?? event.recipe?.id) : null,
    menu_id:    event.type === 'menu'   ? (event.itemId ?? event.menu?.id)   : null,
    note:       event.note ?? '',
    groups:     event.groups ?? { A: 0, B: 0, C: 0 },
  };

  if (event.id && !event.id.startsWith('temp-')) {
    row.id = event.id;
  }

  const { data, error } = await supabase
    .from('calendar_events')
    .insert(row)
    .select()
    .single();
  return { data, error };
}

/**
 * Reemplaza TODOS los eventos de una fecha específica.
 * Estrategia simple: DELETE all for date + INSERT new ones.
 * @param {string}   dateKey - "YYYY-MM-DD"
 * @param {object[]} events  - Nuevos eventos para esa fecha
 * @param {string}   userId
 */
export async function setCalendarEventsForDate(dateKey, events, userId) {
  // 1. Si hay eventos nuevos, construir y validar las filas ANTES de borrar
  if (events && events.length > 0) {
    const rows = events.map(ev => ({
      user_id:    userId,
      event_date: dateKey,
      slot:       ev.slotKey,
      type:       ev.type,
      recipe_id:  ev.type === 'recipe' ? (ev.recipe?.id ?? ev.itemId) : null,
      menu_id:    ev.type === 'menu'   ? (ev.menu?.id   ?? ev.itemId) : null,
      note:       ev.note ?? '',
      groups:     ev.groups ?? { A: 0, B: 0, C: 0 },
    }));

    // Abortar si algún evento no resolvió su item; evita dejar el día vacío en DB
    const unresolved = rows.filter(r => !r.recipe_id && !r.menu_id);
    if (unresolved.length > 0) {
      return { error: new Error(`${unresolved.length} evento(s) sin recipe_id ni menu_id — operación cancelada`) };
    }

    // 2. Borrar SOLO si los nuevos rows son válidos
    const { error: deleteError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('event_date', dateKey)
      .eq('user_id', userId);

    if (deleteError) return { error: deleteError };

    const { error: insertError } = await supabase
      .from('calendar_events')
      .insert(rows);

    return { error: insertError };
  }

  // 3. Sin eventos nuevos: solo borrar (vaciar el día es intencional)
  const { error: deleteError } = await supabase
    .from('calendar_events')
    .delete()
    .eq('event_date', dateKey)
    .eq('user_id', userId);

  return { error: deleteError };
}

export async function deleteCalendarEventFromDb(eventId) {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId);
  return { error };
}

/**
 * Marca un evento del calendario como cocinado o no cocinado.
 * @param {string}  eventId
 * @param {boolean} cooked
 */
export async function setEventCooked(eventId, cooked) {
  const update = { cooked };
  if (cooked) update.cooked_at = new Date().toISOString();
  else update.cooked_at = null;

  const { error } = await supabase
    .from('calendar_events')
    .update(update)
    .eq('id', eventId);
  return { error };
}
