/**
 * @file CartView.jsx
 * @description Vista del carrito de compras.
 *
 * Muestra los ítems agrupados por supplier con subtotales,
 * permite exportar la lista como archivo .txt y ver el panel
 * lateral de "Vendor List" con checkboxes por ítem.
 *
 * Props:
 *  - cart      {CartItem[]}  - Ítems actuales del carrito.
 *  - suppliers {Supplier[]}  - Lista global de suppliers (para colores/links).
 *  - onRemove  {Function}    - Elimina un ítem por ingredientId.
 *  - onClearCart {Function}  - Vacía todo el carrito.
 */
import { useState } from 'react';
import { Trash2, Download, CheckCircle2, ExternalLink } from 'lucide-react';

/**
 * Sección de carrito agrupada por un supplier.
 * Muestra el encabezado con color de marca, los ítems y el subtotal.
 *
 * @param {string}     supplierName - ID/nombre del supplier.
 * @param {CartItem[]} items        - Ítems de este supplier.
 * @param {Supplier[]} suppliers    - Lista global de suppliers.
 * @param {Function}   onRemove     - Callback para eliminar un ítem.
 */
function SupplierSection({ supplierName, items, suppliers, onRemove }) {
    // Busca el perfil completo del supplier para obtener color y contacto
    const sup = suppliers.find(s => s.id === supplierName);
    const subtotal = items.reduce((s, i) => s + i.pricePerPack * i.R, 0);

    return (
        <div style={{ marginBottom: 20 }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                padding: '10px 14px', borderRadius: 12,
                background: `linear-gradient(135deg, ${sup?.color ?? '#6b3fa0'}22, ${sup?.color ?? '#6b3fa0'}10)`,
                border: `1px solid ${sup?.color ?? '#6b3fa0'}33`,
            }}>
                <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: sup?.color ?? '#6b3fa0',
                    boxShadow: `0 0 8px ${sup?.color ?? '#6b3fa0'}88`,
                }} />
                <span style={{ fontWeight: 700, color: sup?.color ?? '#6b3fa0', fontSize: 14 }}>{supplierName}</span>
                <a href={`https://${sup?.contact}`} target="_blank" rel="noreferrer"
                    style={{ marginLeft: 'auto', fontSize: 11, color: '#9b6dca', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {sup?.contact} <ExternalLink size={10} />
                </a>
            </div>
            {items.map(item => (
                <div key={item.ingredientId} className="cart-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle2 size={14} color="#4ecdc4" />
                        <span style={{ fontWeight: 600, fontSize: 13, color: '#3d1a78' }}>{item.name}</span>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: 13 }}>
                        <span style={{ fontWeight: 700, color: '#6b3fa0' }}>{item.R}</span>
                        <span style={{ fontSize: 10, color: '#9b6dca' }}> packs</span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <span className="chip chip-purple">{supplierName}</span>
                    </div>
                    <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 14, color: '#3d1a78' }}>
                        ${(item.pricePerPack * item.R).toFixed(2)}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <button
                            onClick={() => onRemove(item.ingredientId)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                            title="Remove"
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                </div>
            ))}
            <div style={{
                display: 'flex', justifyContent: 'flex-end', padding: '8px 14px',
                fontSize: 13, fontWeight: 600, color: '#6b3fa0',
            }}>
                Subtotal: <span style={{ color: '#3d1a78', fontWeight: 800, marginLeft: 6 }}>${subtotal.toFixed(2)}</span>
            </div>
        </div>
    );
}

/** Componente principal del carrito de compras. */
export default function CartView({ cart, suppliers = [], onRemove, onClearCart }) {
    const [exported, setExported] = useState(false);
    const [vendorOpen, setVendorOpen] = useState(false);

    const grouped = cart.reduce((acc, item) => {
        (acc[item.supplier] = acc[item.supplier] ?? []).push(item);
        return acc;
    }, {});

    const grandTotal = cart.reduce((s, i) => s + i.pricePerPack * i.R, 0);

    const handleExport = () => {
        const lines = ['KitchenCalc - Purchase Requisition', '='.repeat(40), ''];
        Object.entries(grouped).forEach(([sup, items]) => {
            lines.push(`Supplier: ${sup}`);
            items.forEach(i => {
                lines.push(`  - ${i.name}: ${i.R} packs × $${i.pricePerPack} = $${(i.R * i.pricePerPack).toFixed(2)}`);
            });
            lines.push('');
        });
        lines.push(`${'─'.repeat(40)}`);
        lines.push(`TOTAL: $${grandTotal.toFixed(2)}`);
        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'kitchencalc_order.txt'; a.click();
        setExported(true);
        setTimeout(() => setExported(false), 3000);
    };

    return (
        <div className="fade-in-up">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#3d1a78', margin: 0 }}>
                    🛒 Purchase Cart
                </h1>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={() => setVendorOpen(v => !v)}
                        className="btn-ghost"
                        style={{ fontSize: 12 }}
                    >
                        Vendor List
                    </button>
                    {cart.length > 0 && (
                        <button onClick={onClearCart} className="btn-ghost" style={{ fontSize: 12, borderColor: '#ef444488', color: '#ef4444' }}>
                            Clear All
                        </button>
                    )}
                </div>
            </div>

            {cart.length === 0 ? (
                <div className="glass-card" style={{ padding: 60, textAlign: 'center' }}>
                    <div style={{ fontSize: 52, marginBottom: 16 }}>🛒</div>
                    <div style={{ fontWeight: 700, color: '#6b3fa0', fontSize: 16, marginBottom: 8 }}>Cart is empty</div>
                    <div style={{ color: '#9b6dca', fontSize: 13 }}>Go to Recipes, generate a requisition and add items.</div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: vendorOpen ? '1fr 280px' : '1fr', gap: 24 }}>
                    <div>
                        {/* Header */}
                        <div className="glass-card" style={{ padding: 20, marginBottom: 4 }}>
                            <div style={{
                                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                                padding: '0 14px', marginBottom: 12,
                            }}>
                                {['Ingredient', 'Packs', 'Vendor', 'Price', ''].map(h => (
                                    <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#6b3fa0', textTransform: 'uppercase' }}>
                                        {h}
                                    </div>
                                ))}
                            </div>

                            {/* Renderiza una sección por supplier */}
                            {Object.entries(grouped).map(([sup, items]) => (
                                <SupplierSection
                                    key={sup}
                                    supplierName={sup}
                                    items={items}
                                    suppliers={suppliers}
                                    onRemove={onRemove}
                                />
                            ))}

                            {/* Total bar */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '14px 14px', borderTop: '1.5px solid rgba(107,63,160,0.15)',
                                marginTop: 8,
                            }}>
                                <span style={{ fontWeight: 700, fontSize: 16, color: '#3d1a78' }}>Grand Total</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <span style={{
                                        fontSize: 22, fontWeight: 800,
                                        background: 'linear-gradient(135deg,#6b3fa0,#4ecdc4)',
                                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                    }}>
                                        ${grandTotal.toFixed(2)}
                                    </span>
                                    <button onClick={handleExport} className="btn-primary" style={{ padding: '10px 18px' }}>
                                        <Download size={15} />
                                        {exported ? 'Exported!' : 'Export List'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Vendor sidebar panel */}
                    {vendorOpen && (
                        <div className="glass-card slide-in-right" style={{ padding: 20, height: 'fit-content' }}>
                            <div style={{ fontWeight: 700, color: '#3d1a78', fontSize: 15, marginBottom: 16 }}>
                                📋 Vendor's List
                            </div>
                            {/* Lista compacta de todos los suppliers con checkboxes */}
                            {suppliers.map(sup => {
                                const items = cart.filter(i => i.supplier === sup.id);
                                return (
                                    <div key={sup.id} style={{ marginBottom: 16 }}>
                                        <div style={{ fontWeight: 700, color: sup.color, fontSize: 13, marginBottom: 6 }}>
                                            {sup.name}
                                        </div>
                                        {items.length === 0 ? (
                                            <div style={{ fontSize: 11, color: '#9b6dca' }}>No items</div>
                                        ) : items.map(item => (
                                            <div key={item.ingredientId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                <input type="checkbox" defaultChecked style={{ accentColor: sup.color }} />
                                                <span style={{ fontSize: 12, color: '#374151' }}>{item.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
