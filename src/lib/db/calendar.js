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
    slot:       event.slot,
    type:       event.type,
    recipe_id:  event.type === 'recipe' ? event.itemId : null,
    menu_id:    event.type === 'menu'   ? event.itemId : null,
    note:       event.note ?? '',
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
  // 1. Borrar todos los eventos de ese día
  const { error: deleteError } = await supabase
    .from('calendar_events')
    .delete()
    .eq('event_date', dateKey)
    .eq('user_id', userId);

  if (deleteError) return { error: deleteError };

  // 2. Si hay eventos nuevos, insertarlos
  if (!events || events.length === 0) return { error: null };

  const rows = events.map(ev => ({
    user_id:    userId,
    event_date: dateKey,
    slot:       ev.slot,
    type:       ev.type,
    recipe_id:  ev.type === 'recipe' ? ev.itemId : null,
    menu_id:    ev.type === 'menu'   ? ev.itemId : null,
    note:       ev.note ?? '',
  }));

  const { error: insertError } = await supabase
    .from('calendar_events')
    .insert(rows);

  return { error: insertError };
}

export async function deleteCalendarEventFromDb(eventId) {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId);
  return { error };
}
