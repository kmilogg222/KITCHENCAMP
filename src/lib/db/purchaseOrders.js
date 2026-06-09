/**
 * @file purchaseOrders.js
 * @description CRUD de órdenes de compra persistentes en Supabase.
 */
import { supabase } from './client';

/**
 * Inserta una orden de compra con sus ítems (rollback manual si falla el insert de ítems).
 * @param {{ deliveryDate, startDate, endDate, total, status }} po
 * @param {Array}  items
 * @param {string} userId
 */
export async function insertPurchaseOrder(po, items, userId) {
  const { data: orderData, error: orderError } = await supabase
    .from('purchase_orders')
    .insert({
      user_id:       userId,
      status:        po.status ?? 'pending',
      delivery_date: po.deliveryDate ?? null,
      start_date:    po.startDate    ?? null,
      end_date:      po.endDate      ?? null,
      total:         po.total        ?? 0,
    })
    .select()
    .single();

  if (orderError) return { data: null, error: orderError };

  const itemRows = items.map(item => ({
    user_id:           userId,
    po_id:             orderData.id,
    ingredient_id:     item.ingredientId ?? null,
    name_snapshot:     item.name,
    supplier_snapshot: item.supplier ?? '',
    packs:             item.R,
    pack_size:         item.packSize,
    unit:              item.unit ?? null,
    price_per_pack:    item.pricePerPack ?? 0,
  }));

  const { error: itemsError } = await supabase
    .from('purchase_order_items')
    .insert(itemRows);

  if (itemsError) {
    // Rollback: eliminar la cabecera
    await supabase.from('purchase_orders').delete().eq('id', orderData.id);
    return { data: null, error: itemsError };
  }

  return { data: orderData, error: null };
}

/**
 * Obtiene todas las órdenes del usuario con sus ítems.
 * @param {string} userId
 */
export async function fetchPurchaseOrders(userId) {
  const [ordersRes, itemsRes] = await Promise.all([
    supabase.from('purchase_orders').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('purchase_order_items').select('*').eq('user_id', userId),
  ]);

  if (ordersRes.error) return { data: null, error: ordersRes.error };
  if (itemsRes.error)  return { data: null, error: itemsRes.error };

  const itemsByPo = (itemsRes.data ?? []).reduce((acc, item) => {
    if (!acc[item.po_id]) acc[item.po_id] = [];
    acc[item.po_id].push(item);
    return acc;
  }, {});

  const orders = (ordersRes.data ?? []).map(o => ({
    id:           o.id,
    status:       o.status,
    deliveryDate: o.delivery_date ?? null,
    startDate:    o.start_date    ?? null,
    endDate:      o.end_date      ?? null,
    total:        o.total,
    createdAt:    o.created_at,
    receivedAt:   o.received_at   ?? null,
    items:        (itemsByPo[o.id] ?? []).map(i => ({
      id:           i.id,
      ingredientId: i.ingredient_id,
      name:         i.name_snapshot,
      supplier:     i.supplier_snapshot,
      R:            i.packs,
      packSize:     i.pack_size,
      unit:         i.unit,
      pricePerPack: i.price_per_pack,
    })),
  }));

  return { data: orders, error: null };
}

/**
 * Actualiza el estado de una orden de compra.
 * @param {string} poId
 * @param {'pending'|'received'|'cancelled'} status
 */
export async function updatePurchaseOrderStatus(poId, status) {
  const update = { status };
  if (status === 'received') update.received_at = new Date().toISOString();
  const { error } = await supabase
    .from('purchase_orders')
    .update(update)
    .eq('id', poId);
  return { error };
}

/**
 * Elimina una orden de compra (cascade borra sus ítems).
 * @param {string} poId
 */
export async function deletePurchaseOrder(poId) {
  const { error } = await supabase
    .from('purchase_orders')
    .delete()
    .eq('id', poId);
  return { error };
}
