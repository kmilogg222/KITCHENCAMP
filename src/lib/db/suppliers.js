/**
 * @file suppliers.js
 * @description CRUD de suppliers en Supabase.
 */
import { supabase } from './client';
import { storeSupplierToDb } from './transform';

export async function insertSupplier(supplier, userId) {
  // Omit id so Supabase generates a valid UUID (the store's custom string IDs are not UUIDs)
  const { id: _tempId, ...row } = storeSupplierToDb(supplier, userId);
  const { data, error } = await supabase
    .from('suppliers')
    .insert(row)
    .select()
    .single();
  return { data, error };
}

export async function updateSupplierInDb(supplier, userId) {
  const { id, ...rest } = storeSupplierToDb(supplier, userId);
  const { data, error } = await supabase
    .from('suppliers')
    .update(rest)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteSupplierFromDb(id) {
  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id);
  return { error };
}
