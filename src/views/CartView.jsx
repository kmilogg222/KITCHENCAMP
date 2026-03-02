/**
 * @file CartView.jsx
 * @description Vista del carrito de compras con generación de PDF.
 *
 * Muestra los ítems agrupados por supplier con subtotales,
 * permite generar un PDF profesional de Purchase Order y ver
 * el panel lateral de "Vendor List" con checkboxes por ítem.
 *
 * Props:
 *  - cart        {CartItem[]}  - Ítems actuales del carrito.
 *  - suppliers   {Supplier[]}  - Lista global de suppliers (para colores/links/PDF).
 *  - onRemove    {Function}    - Elimina un ítem por ingredientId.
 *  - onClearCart {Function}    - Vacía todo el carrito.
 */
import { useState } from 'react';
import { Trash2, FileText, CheckCircle2, ExternalLink, FileDown, Loader } from 'lucide-react';
import { generatePurchaseOrderPDF } from '../utils/generatePurchaseOrderPDF';

// ── Sub-componente: sección de un supplier en la tabla ────────────────────────

/**
 * Sección de carrito agrupada por supplier.
 * Muestra encabezado con color de marca, filas de ítems y subtotal.
 *
 * @param {string}     supplierName - ID del supplier.
 * @param {CartItem[]} items        - Ítems de este supplier.
 * @param {Supplier[]} suppliers    - Lista global para buscar color/contacto.
 * @param {Function}   onRemove     - Callback para eliminar un ítem.
 */
function SupplierSection({ supplierName, items, suppliers, onRemove }) {
    // Obtener perfil completo para colores y link de contacto
    const sup = suppliers.find(s => s.id === supplierName);
    const subtotal = items.reduce((s, i) => s + i.pricePerPack * i.R, 0);
    const color = sup?.color ?? '#6b3fa0';

    return (
        <div style={{ marginBottom: 20 }}>
            {/* Encabezado del supplier */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                padding: '10px 14px', borderRadius: 12,
                background: `linear-gradient(135deg, ${color}22, ${color}10)`,
                border: `1px solid ${color}33`,
            }}>
                {/* Indicador de color de marca */}
                <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: color,
                    boxShadow: `0 0 8px ${color}88`,
                }} />
                <span style={{ fontWeight: 700, color, fontSize: 14 }}>{supplierName}</span>

                {/* Link al sitio web del supplier */}
                {sup?.contact && (
                    <a href={`https://${sup.contact}`} target="_blank" rel="noreferrer"
                        style={{ marginLeft: 'auto', fontSize: 11, color: '#9b6dca', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {sup.contact} <ExternalLink size={10} />
                    </a>
                )}
            </div>

            {/* Filas de ingredientes */}
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
                            title="Remove from cart"
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                </div>
            ))}

            {/* Subtotal del supplier */}
            <div style={{
                display: 'flex', justifyContent: 'flex-end', padding: '8px 14px',
                fontSize: 13, fontWeight: 600, color: '#6b3fa0',
            }}>
                Subtotal: <span style={{ color: '#3d1a78', fontWeight: 800, marginLeft: 6 }}>${subtotal.toFixed(2)}</span>
            </div>
        </div>
    );
}

// ── Sub-componente: banner de éxito tras generar el PDF ───────────────────────

/**
 * Banner temporal que confirma la descarga del PDF.
 * @param {string} fileName - Nombre del archivo generado.
 */
function PDFSuccessBanner({ fileName }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(78,205,196,0.12))',
            border: '1.5px solid rgba(16,185,129,0.3)',
            borderRadius: 12, padding: '12px 18px',
            marginBottom: 16, animation: 'fadeIn 0.3s ease',
        }}>
            <CheckCircle2 size={18} color="#10b981" />
            <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#065f46' }}>
                    PDF generado exitosamente
                </div>
                <div style={{ fontSize: 11, color: '#059669', marginTop: 1 }}>
                    📄 {fileName} — revisa tu carpeta de descargas
                </div>
            </div>
        </div>
    );
}

// ── Componente principal ──────────────────────────────────────────────────────

/** Vista principal del carrito de compras. */
export default function CartView({ cart, suppliers = [], onRemove, onClearCart }) {
    const [generatingPDF, setGeneratingPDF] = useState(false);
    const [lastFileName, setLastFileName] = useState(null);
    const [vendorOpen, setVendorOpen] = useState(false);

    // Agrupar ítems por supplier para la visualización en tabla
    const grouped = cart.reduce((acc, item) => {
        (acc[item.supplier] = acc[item.supplier] ?? []).push(item);
        return acc;
    }, {});

    const grandTotal = cart.reduce((s, i) => s + i.pricePerPack * i.R, 0);
    const totalPacks = cart.reduce((s, i) => s + i.R, 0);

    /**
     * Genera el PDF de Purchase Order usando el módulo dedicado.
     * Muestra un spinner durante la generación y el nombre del archivo tras
     * completarse para confirmarle al usuario que la descarga fue exitosa.
     */
    const handleGeneratePDF = async () => {
        setGeneratingPDF(true);
        setLastFileName(null);

        // Pequeño delay para que React actualice el spinner antes de bloquar con jsPDF
        await new Promise(resolve => setTimeout(resolve, 80));

        try {
            const fileName = generatePurchaseOrderPDF({ cart, suppliers, grandTotal });
            setLastFileName(fileName);
        } catch (err) {
            console.error('[CartView] Error generando PDF:', err);
        } finally {
            setGeneratingPDF(false);
        }
    };

    return (
        <div className="fade-in-up">

            {/* ── Encabezado ──────────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: '#3d1a78', margin: 0 }}>
                        🛒 Purchase Cart
                    </h1>
                    {cart.length > 0 && (
                        <p style={{ fontSize: 13, color: '#9b6dca', margin: '4px 0 0' }}>
                            {cart.length} ingredient{cart.length !== 1 ? 's' : ''} · {totalPacks} packs · ${grandTotal.toFixed(2)} total
                        </p>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {/* Toggle del panel lateral Vendor List */}
                    <button
                        onClick={() => setVendorOpen(v => !v)}
                        className="btn-ghost"
                        style={{ fontSize: 12 }}
                    >
                        <FileText size={14} /> Vendor List
                    </button>

                    {/* Botón limpiar carrito */}
                    {cart.length > 0 && (
                        <button
                            onClick={onClearCart}
                            className="btn-ghost"
                            style={{ fontSize: 12, borderColor: '#ef444488', color: '#ef4444' }}
                        >
                            Clear All
                        </button>
                    )}
                </div>
            </div>

            {/* ── Estado vacío ─────────────────────────────────────────────── */}
            {cart.length === 0 ? (
                <div className="glass-card" style={{ padding: 60, textAlign: 'center' }}>
                    <div style={{ fontSize: 52, marginBottom: 16 }}>🛒</div>
                    <div style={{ fontWeight: 700, color: '#6b3fa0', fontSize: 16, marginBottom: 8 }}>
                        Cart is empty
                    </div>
                    <div style={{ color: '#9b6dca', fontSize: 13 }}>
                        Go to Recipes, generate a requisition and add items.
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: vendorOpen ? '1fr 280px' : '1fr', gap: 24 }}>

                    {/* ── Tabla principal ───────────────────────────────────── */}
                    <div>
                        {/* Banner de éxito tras generar PDF */}
                        {lastFileName && <PDFSuccessBanner fileName={lastFileName} />}

                        <div className="glass-card" style={{ padding: 20, marginBottom: 4 }}>
                            {/* Encabezados de columna */}
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

                            {/* Una sección por supplier */}
                            {Object.entries(grouped).map(([sup, items]) => (
                                <SupplierSection
                                    key={sup}
                                    supplierName={sup}
                                    items={items}
                                    suppliers={suppliers}
                                    onRemove={onRemove}
                                />
                            ))}

                            {/* ── Barra inferior: total + botón PDF ─────── */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '14px 14px', borderTop: '1.5px solid rgba(107,63,160,0.15)',
                                marginTop: 8,
                            }}>
                                <div>
                                    <span style={{ fontWeight: 700, fontSize: 16, color: '#3d1a78' }}>Grand Total</span>
                                    <div style={{ fontSize: 11, color: '#9b6dca', marginTop: 2 }}>
                                        {cart.length} items · {totalPacks} packs
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    {/* Monto total con gradiente */}
                                    <span style={{
                                        fontSize: 22, fontWeight: 800,
                                        background: 'linear-gradient(135deg,#6b3fa0,#4ecdc4)',
                                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                    }}>
                                        ${grandTotal.toFixed(2)}
                                    </span>

                                    {/* Botón principal: Generar PDF */}
                                    <button
                                        onClick={handleGeneratePDF}
                                        disabled={generatingPDF}
                                        className="btn-primary"
                                        style={{ padding: '10px 20px', opacity: generatingPDF ? 0.8 : 1 }}
                                        title="Genera un PDF profesional de Purchase Order"
                                    >
                                        {generatingPDF
                                            ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
                                            : <><FileDown size={15} /> Download PDF</>
                                        }
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── Información sobre el PDF ─────────────────────── */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 14px', borderRadius: 10,
                            background: 'rgba(107,63,160,0.05)',
                            border: '1px solid rgba(107,63,160,0.1)',
                            marginTop: 10,
                        }}>
                            <FileDown size={14} color="#9b6dca" />
                            <span style={{ fontSize: 12, color: '#9b6dca' }}>
                                El PDF incluye número de PO, agrupación por supplier, subtotales y gran total en formato A4.
                            </span>
                        </div>
                    </div>

                    {/* ── Panel lateral: Vendor List ────────────────────────── */}
                    {vendorOpen && (
                        <div className="glass-card slide-in-right" style={{ padding: 20, height: 'fit-content' }}>
                            <div style={{ fontWeight: 700, color: '#3d1a78', fontSize: 15, marginBottom: 16 }}>
                                📋 Vendor's List
                            </div>

                            {/* Lista compacta de suppliers con checkboxes por ítem */}
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
