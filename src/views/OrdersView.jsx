/**
 * @file OrdersView.jsx
 * @description Lista de órdenes de compra persistentes con estado y recepción de stock.
 */
import { useState } from 'react';
import { ClipboardList, CheckCircle2, RotateCcw, FileDown, Trash2, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import { generatePurchaseOrderPDF } from '../utils/generatePurchaseOrderPDF';
import { useStore } from '../store/useStore';
import SkeletonList from '../components/SkeletonList';

const STATUS_LABEL = { pending: 'Pending', received: 'Received', cancelled: 'Cancelled' };
const STATUS_COLOR = { pending: '#f59e0b', received: '#10b981', cancelled: '#ef4444' };

function StatusBadge({ status }) {
    return (
        <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
            background: `${STATUS_COLOR[status] ?? '#9ca3af'}22`,
            color: STATUS_COLOR[status] ?? '#9ca3af',
            border: `1px solid ${STATUS_COLOR[status] ?? '#9ca3af'}44`,
        }}>
            {STATUS_LABEL[status] ?? status}
        </span>
    );
}

function OrderRow({ order, suppliers, onReceive, onDelete }) {
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleReceive = async () => {
        setLoading(true);
        await onReceive(order.id);
        setLoading(false);
    };

    const handleReprint = () => {
        generatePurchaseOrderPDF({
            cart: order.items,
            suppliers,
            grandTotal: order.total,
            deliveryDate: order.deliveryDate,
            dateRange: order.startDate
                ? { start: order.startDate, end: order.endDate }
                : undefined,
        });
    };

    return (
        <div className="glass-card" style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
            {/* Header row */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                cursor: 'pointer',
            }} onClick={() => setExpanded(e => !e)}>
                <ClipboardList size={16} color="#6b3fa0" />
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#3d1a78' }}>
                            PO {order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <StatusBadge status={order.status} />
                        <span style={{ fontSize: 11, color: '#9b6dca', marginLeft: 4 }}>
                            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                        Created: {new Date(order.createdAt).toLocaleDateString()}
                        {order.deliveryDate && ` · Delivery: ${order.deliveryDate}`}
                        {order.startDate && ` · Period: ${order.startDate} – ${order.endDate}`}
                    </div>
                </div>
                <span style={{ fontWeight: 800, fontSize: 15, color: '#3d1a78' }}>
                    ${order.total.toFixed(2)}
                </span>
                <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
                    {order.status === 'pending' && (
                        <button
                            className="btn-primary"
                            style={{ padding: '6px 12px', fontSize: 12 }}
                            onClick={e => { e.stopPropagation(); handleReceive(); }}
                            disabled={loading}
                            title="Marcar como recibida y reponer stock"
                        >
                            {loading
                                ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
                                : <><CheckCircle2 size={12} /> Receive</>}
                        </button>
                    )}
                    <button
                        style={{
                            background: 'none', border: '1px solid #e5e7eb', borderRadius: 8,
                            padding: '6px 10px', cursor: 'pointer', color: '#6b7280', fontSize: 12,
                            display: 'flex', alignItems: 'center', gap: 4,
                        }}
                        onClick={e => { e.stopPropagation(); handleReprint(); }}
                        title="Reimprimir PDF"
                    >
                        <FileDown size={12} /> PDF
                    </button>
                    <button
                        style={{
                            background: 'none', border: '1px solid #fecaca', borderRadius: 8,
                            padding: '6px 10px', cursor: 'pointer', color: '#ef4444', fontSize: 12,
                            display: 'flex', alignItems: 'center', gap: 4,
                        }}
                        onClick={e => { e.stopPropagation(); onDelete(order.id); }}
                        title="Eliminar orden"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
                {expanded ? <ChevronUp size={14} color="#9b6dca" /> : <ChevronDown size={14} color="#9b6dca" />}
            </div>

            {/* Expanded items */}
            {expanded && (
                <div style={{ borderTop: '1px solid rgba(107,63,160,0.1)', padding: '12px 16px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ color: '#9b6dca', textAlign: 'left' }}>
                                <th style={{ padding: '4px 8px' }}>Ingredient</th>
                                <th style={{ padding: '4px 8px' }}>Supplier</th>
                                <th style={{ padding: '4px 8px', textAlign: 'right' }}>Packs</th>
                                <th style={{ padding: '4px 8px', textAlign: 'right' }}>Pack size</th>
                                <th style={{ padding: '4px 8px', textAlign: 'right' }}>Unit price</th>
                                <th style={{ padding: '4px 8px', textAlign: 'right' }}>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map(item => (
                                <tr key={item.id} style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                                    <td style={{ padding: '6px 8px', color: '#374151' }}>{item.name}</td>
                                    <td style={{ padding: '6px 8px', color: '#6b7280' }}>{item.supplier}</td>
                                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#374151' }}>{item.R}</td>
                                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#6b7280' }}>
                                        {item.packSize} {item.unit}
                                    </td>
                                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#374151' }}>
                                        ${item.pricePerPack.toFixed(2)}
                                    </td>
                                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#3d1a78' }}>
                                        ${(item.R * item.pricePerPack).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {order.receivedAt && (
                        <div style={{ marginTop: 8, fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={11} /> Received on {new Date(order.receivedAt).toLocaleString()}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function OrdersView() {
    const purchaseOrders = useStore(state => state.purchaseOrders);
    const suppliers = useStore(state => state.suppliers);
    const receivePurchaseOrder = useStore(state => state.receivePurchaseOrder);
    const loading = useStore(state => state.loading);
    const [filter, setFilter] = useState('all');

    const deletePO = useStore(state => state.deletePurchaseOrder);

    const filtered = purchaseOrders.filter(o => filter === 'all' || o.status === filter);

    return (
        <div className="fade-in" style={{ maxWidth: 900, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h1 style={{
                        fontSize: 24, fontWeight: 800, margin: 0,
                        background: 'linear-gradient(135deg,#6b3fa0,#4ecdc4)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        Purchase Orders
                    </h1>
                    <p style={{ color: '#9b6dca', fontSize: 13, margin: '4px 0 0' }}>
                        {purchaseOrders.length} order{purchaseOrders.length !== 1 ? 's' : ''} · {purchaseOrders.filter(o => o.status === 'pending').length} pending
                    </p>
                </div>
                {/* Filter tabs */}
                <div style={{ display: 'flex', gap: 6 }}>
                    {['all', 'pending', 'received'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                cursor: 'pointer', border: 'none',
                                background: filter === f ? 'linear-gradient(135deg,#6b3fa0,#4ecdc4)' : 'rgba(107,63,160,0.08)',
                                color: filter === f ? '#fff' : '#6b3fa0',
                            }}
                        >
                            {f === 'all' ? 'All' : STATUS_LABEL[f]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <SkeletonList rows={4} />
            ) : filtered.length === 0 ? (
                <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
                    <ClipboardList size={40} color="#d1c4e9" style={{ margin: '0 auto 12px' }} />
                    <p style={{ color: '#9b6dca', fontSize: 14 }}>
                        {filter === 'all' ? 'No orders yet. Generate one from the Cart.' : `No ${filter} orders.`}
                    </p>
                </div>
            ) : (
                filtered.map(order => (
                    <OrderRow
                        key={order.id}
                        order={order}
                        suppliers={suppliers}
                        onReceive={receivePurchaseOrder}
                        onDelete={deletePO}
                    />
                ))
            )}
        </div>
    );
}
