/**
 * @file utils/generatePurchaseOrderPDF.js
 * @description Generador de PDF para la orden de compra (Purchase Order).
 *
 * IMPORTANTE: jsPDF no soporta emojis con las fuentes estándar (helvetica/courier).
 * Todos los íconos son reemplazados por formas vectoriales dibujadas con las
 * primitivas de jsPDF (rectángulos, círculos, líneas).
 *
 * Diseño del documento:
 *  - Encabezado con barra de color + logo vectorial
 *  - Sección de metadatos (Prepared By / Terms / Notes)
 *  - Resumen de suppliers con emails y subtotales
 *  - Tabla de ítems agrupada por supplier
 *  - Bloque de Grand Total
 *  - Pie de página en cada hoja con número de página
 *
 * @param {object}      opts
 * @param {CartItem[]}  opts.cart        - Ítems del carrito.
 * @param {Supplier[]}  opts.suppliers   - Lista de suppliers.
 * @param {number}      opts.grandTotal  - Gran total calculado.
 * @returns {string} Nombre del archivo PDF generado.
 */
import { jsPDF } from 'jspdf';

// ── Tokens de diseño del PDF ──────────────────────────────────────────────────
// Se definen como arrays RGB para pasarlos directamente a setFillColor / setTextColor

const C = {
    purpleDeep: [45, 20, 100],    // fondo header principal
    purpleMid: [107, 63, 160],    // acentos de texto
    purpleLight: [155, 109, 202],    // texto secundario
    purplePale: [232, 220, 252],    // fondos de filas alternas
    teal: [60, 180, 172],    // franja de acento y headers de tabla
    tealDark: [42, 148, 140],    // elementos teal oscuros
    white: [255, 255, 255],
    offWhite: [250, 248, 255],    // fondo de filas impares
    grayLine: [220, 215, 235],    // líneas divisoras
    textDark: [30, 20, 50],     // texto principal
    textGray: [100, 90, 120],    // texto secundario / helper
    success: [16, 150, 120],    // subtotal highlight
    totalBg: [35, 15, 85],     // fondo bloque grand total
};

// Márgenes y dimensiones A4
const PAGE_W = 210;   // mm ancho A4
const PAGE_H = 297;   // mm alto A4
const MARGIN = 16;    // margen izquierdo/derecho
const CONT_W = PAGE_W - MARGIN * 2;

// ── Helpers de dibujo ─────────────────────────────────────────────────────────

/** Genera número de PO único. */
const makePONumber = () => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `PO-${date}-${rand}`;
};

/** Formatea fecha legible. */
const formatDate = (d) => d.toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
});

/**
 * Dibuja el logo vectorial de KitchenCalc.
 * Un pequeño ícono de chef hat construido con formas básicas.
 * @param {jsPDF} doc
 * @param {number} x  - Posición X del ícono.
 * @param {number} y  - Posición Y del ícono.
 * @param {number} sz - Tamaño (ancho del ícono).
 */
function drawLogoIcon(doc, x, y, sz) {
    const h = sz * 0.75;
    const r = sz * 0.28;

    // Base del sombrero (rectángulo redondeado)
    doc.setFillColor(...C.teal);
    doc.roundedRect(x, y + h * 0.45, sz, h * 0.55, 1.5, 1.5, 'F');

    // Cuerpo blanco del sombrero
    doc.setFillColor(...C.white);
    doc.ellipse(x + sz / 2, y + h * 0.4, sz * 0.38, h * 0.42, 'F');

    // Pompón en la punta
    doc.setFillColor(...C.teal);
    doc.circle(x + sz / 2, y + h * 0.05, r * 0.45, 'F');
}

/**
 * Dibuja el encabezado de página.
 * @param {jsPDF} doc
 * @param {string} poNumber
 * @param {string} dateStr
 * @returns {number} Posición Y donde termina el header.
 */
function drawHeader(doc, poNumber, dateStr) {
    const headerH = 30;

    // Barra principal de fondo
    doc.setFillColor(...C.purpleDeep);
    doc.rect(0, 0, PAGE_W, headerH, 'F');

    // Franja de acento teal
    doc.setFillColor(...C.teal);
    doc.rect(0, headerH, PAGE_W, 3.5, 'F');

    // Logo vectorial
    drawLogoIcon(doc, MARGIN, 5, 14);

    // Nombre de la app
    doc.setTextColor(...C.white);
    doc.setFontSize(17);
    doc.setFont('helvetica', 'bold');
    doc.text('KitchenCalc', MARGIN + 17, 14.5);

    // Subtítulo
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 185, 230);
    doc.text('Kitchen Management System', MARGIN + 17, 20);

    // Línea divisora vertical entre logo y datos de PO
    doc.setDrawColor(...C.teal);
    doc.setLineWidth(0.5);
    doc.line(PAGE_W - 75, 6, PAGE_W - 75, 26);

    // Datos del PO (alineados a la derecha)
    doc.setTextColor(...C.white);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('PURCHASE ORDER', PAGE_W - MARGIN, 10, { align: 'right' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.teal);
    doc.text(poNumber, PAGE_W - MARGIN, 17.5, { align: 'right' });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 185, 230);
    doc.text(dateStr, PAGE_W - MARGIN, 23, { align: 'right' });

    return headerH + 3.5 + 8; // y de inicio del contenido
}

/**
 * Dibuja el bloque de metadatos (3 columnas).
 * @param {jsPDF} doc
 * @param {number} y
 * @returns {number} Nuevo y.
 */
function drawMeta(doc, y) {
    const boxH = 24;
    const colW = CONT_W / 3;
    const fields = [
        { title: 'PREPARED BY', lines: ['KitchenCalc System', 'auto-generated document'] },
        { title: 'PAYMENT TERMS', lines: ['Net 30 days', 'Standard Purchase Order'] },
        { title: 'INSTRUCTIONS', lines: ['Confirm receipt', 'within 24 business hours'] },
    ];

    // Fondo con borde sutil
    doc.setFillColor(...C.offWhite);
    doc.setDrawColor(...C.grayLine);
    doc.setLineWidth(0.4);
    doc.roundedRect(MARGIN, y, CONT_W, boxH, 3, 3, 'FD');

    fields.forEach((f, i) => {
        const x = MARGIN + i * colW + 6;

        // Línea de acento izquierda de cada campo
        if (i > 0) {
            doc.setDrawColor(...C.grayLine);
            doc.setLineWidth(0.4);
            doc.line(MARGIN + i * colW, y + 4, MARGIN + i * colW, y + boxH - 4);
        }

        // Título del campo
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.purpleMid);
        doc.text(f.title, x, y + 7);

        // Valores
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.textDark);
        f.lines.forEach((line, li) => doc.text(line, x, y + 13 + li * 5));
    });

    return y + boxH + 7;
}

/**
 * Dibuja la sección de resumen de suppliers.
 * @param {jsPDF} doc
 * @param {number} y
 * @param {object} grouped      - { [supId]: CartItem[] }
 * @param {Map}    supplierMap  - Map de suppliers (id -> Supplier).
 * @returns {number} Nuevo y.
 */
function drawSupplierSummary(doc, y, grouped, supplierMap) {
    // Título de sección
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.purpleMid);
    doc.text('SUPPLIER SUMMARY', MARGIN, y);
    y += 5;

    Object.entries(grouped).forEach(([supId, items], i) => {
        const sup = supplierMap.get(supId);
        const subTotal = items.reduce((s, it) => s + it.pricePerPack * it.R, 0);
        const rowH = 7;
        const bg = i % 2 === 0 ? C.offWhite : C.white;

        doc.setFillColor(...bg);
        doc.setDrawColor(...C.grayLine);
        doc.setLineWidth(0.3);
        doc.rect(MARGIN, y, CONT_W, rowH, 'FD');

        // Cuadrado de color de marca del supplier (a modo de icono)
        const supColor = sup?.color
            ? hexToRgb(sup.color)
            : C.purpleMid;
        doc.setFillColor(...supColor);
        doc.roundedRect(MARGIN + 3, y + 1.8, 3.5, 3.5, 0.8, 0.8, 'F');

        // Número + nombre del supplier
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.textDark);
        doc.text(`${i + 1}.  ${supId}`, MARGIN + 9, y + 5);

        // Email
        if (sup?.email) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(...C.purpleLight);
            doc.text(sup.email, MARGIN + 55, y + 5);
        }

        // Subtotal
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...C.purpleDeep);
        doc.text(`$${subTotal.toFixed(2)}`, PAGE_W - MARGIN, y + 5, { align: 'right' });

        y += rowH;
    });

    return y + 8;
}

/**
 * Dibuja la cabecera de columnas de la tabla de ítems.
 * @param {jsPDF} doc
 * @param {number} y
 * @returns {number} Nuevo y.
 */
function drawTableHeader(doc, y) {
    const ROW_H = 7.5;

    doc.setFillColor(...C.purpleDeep);
    doc.rect(MARGIN, y, CONT_W, ROW_H, 'F');

    const cols = [
        { label: '#', x: MARGIN + 3, align: 'left' },
        { label: 'INGREDIENT', x: MARGIN + 13, align: 'left' },
        { label: 'PACK SIZE', x: MARGIN + 80, align: 'left' },
        { label: 'PACKS (R)', x: MARGIN + 115, align: 'right' },
        { label: 'UNIT PRICE', x: MARGIN + 145, align: 'right' },
        { label: 'TOTAL', x: MARGIN + 174, align: 'right' },
    ];

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.white);

    cols.forEach(col => doc.text(col.label, col.x, y + 5, { align: col.align }));

    return y + ROW_H;
}

/**
 * Dibuja una fila de ítem en la tabla.
 * @param {jsPDF}    doc
 * @param {number}   y
 * @param {CartItem} item
 * @param {number}   rowIdx  - Para color alternado.
 * @param {number}   itemNum - Número secuencial del ítem.
 * @returns {number} Nuevo y.
 */
function drawItemRow(doc, y, item, rowIdx, itemNum) {
    const ROW_H = 6.5;
    const bg = rowIdx % 2 === 0 ? C.white : C.offWhite;

    doc.setFillColor(...bg);
    doc.setDrawColor(...C.grayLine);
    doc.setLineWidth(0.2);
    doc.rect(MARGIN, y, CONT_W, ROW_H, 'FD');

    const total = (item.pricePerPack * item.R).toFixed(2);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.textDark);

    // # (itálica y tenue)
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...C.textGray);
    doc.text(String(itemNum), MARGIN + 3, y + 4.5, { align: 'left' });

    // Nombre del ingrediente (en negrita)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.textDark);
    doc.text(item.name, MARGIN + 13, y + 4.5);

    // Pack size
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.textGray);
    doc.text(`${item.packSize.toLocaleString()} ${item.unit}`, MARGIN + 80, y + 4.5);

    // Packs (R)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.purpleMid);
    doc.text(String(item.R), MARGIN + 115, y + 4.5, { align: 'right' });

    // Unit price
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.textGray);
    doc.text(`$${item.pricePerPack.toFixed(2)}`, MARGIN + 145, y + 4.5, { align: 'right' });

    // Total (negrita y color oscuro)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.textDark);
    doc.text(`$${total}`, MARGIN + 174, y + 4.5, { align: 'right' });

    return y + ROW_H;
}

/**
 * Dibuja la fila de subtotal de un supplier.
 * @param {jsPDF} doc
 * @param {number} y
 * @param {string} supId
 * @param {number} subtotal
 * @returns {number} Nuevo y.
 */
function drawSubtotalRow(doc, y, supId, subtotal) {
    const ROW_H = 6.5;

    doc.setFillColor(235, 225, 255);
    doc.rect(MARGIN, y, CONT_W, ROW_H, 'F');

    // Línea de acento izquierda (teal)
    doc.setDrawColor(...C.teal);
    doc.setLineWidth(2);
    doc.line(MARGIN, y, MARGIN, y + ROW_H);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.purpleMid);
    doc.text(`Subtotal — ${supId}`, MARGIN + 4, y + 4.5);

    doc.setTextColor(...C.purpleDeep);
    doc.text(`$${subtotal.toFixed(2)}`, PAGE_W - MARGIN, y + 4.5, { align: 'right' });

    // Restablecer lineWidth
    doc.setLineWidth(0.4);

    return y + ROW_H + 2;
}

/**
 * Dibuja el bloque de grand total.
 * @param {jsPDF} doc
 * @param {number} y
 * @param {number} grandTotal
 * @param {CartItem[]} cart
 */
function drawGrandTotal(doc, y, grandTotal, cart) {
    const totalPacks = cart.reduce((s, i) => s + i.R, 0);
    const BOX_H = 18;
    const BOX_W = 90;
    const BOX_X = PAGE_W - MARGIN - BOX_W;

    // Texto de resumen (izquierda)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.textGray);
    doc.text(`${cart.length} ingredient${cart.length !== 1 ? 's' : ''}`, MARGIN, y + 7);
    doc.text(`${totalPacks} packs ordered`, MARGIN, y + 13);

    // Caja de total (derecha)
    doc.setFillColor(...C.totalBg);
    doc.roundedRect(BOX_X, y, BOX_W, BOX_H, 3, 3, 'F');

    // Franja teal en el borde izquierdo de la caja
    doc.setFillColor(...C.teal);
    doc.roundedRect(BOX_X, y, 4, BOX_H, 1.5, 1.5, 'F');
    doc.rect(BOX_X + 2, y, 2, BOX_H, 'F'); // esquina derecha cuadrada

    // Etiqueta
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 160, 220);
    doc.text('GRAND TOTAL', PAGE_W - MARGIN - 5, y + 6.5, { align: 'right' });

    // Monto
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.white);
    doc.text(`$${grandTotal.toFixed(2)}`, PAGE_W - MARGIN - 5, y + 14.5, { align: 'right' });
}

/**
 * Dibuja el pie de página de cada hoja.
 * @param {jsPDF} doc
 * @param {number} pageNum
 * @param {number} totalPages
 * @param {string} poNumber
 */
function drawFooter(doc, pageNum, totalPages, poNumber) {
    const y = PAGE_H - 9;

    // Línea separadora
    doc.setDrawColor(...C.grayLine);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.purpleLight);
    doc.text('Generated by KitchenCalc  —  Kitchen Management System', MARGIN, y + 4);
    doc.text(`${poNumber}  |  Page ${pageNum} of ${totalPages}`, PAGE_W - MARGIN, y + 4, { align: 'right' });
}

// ── Utilidad: convertir color HEX a array RGB ─────────────────────────────────
/**
 * Convierte un color hex (#rrggbb) a un array [r, g, b].
 * Fallback a purpleMid si el formato es inválido.
 * @param {string} hex
 * @returns {number[]}
 */
function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m
        ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
        : C.purpleMid;
}

// ── Función principal exportada ───────────────────────────────────────────────

/**
 * Genera y descarga el PDF de Purchase Order.
 *
 * @param {object}      opts
 * @param {CartItem[]}  opts.cart       - Ítems del carrito.
 * @param {Supplier[]}  opts.suppliers  - Lista de suppliers.
 * @param {number}      opts.grandTotal - Gran total del carrito.
 * @returns {string} Nombre del archivo PDF.
 */
export function generatePurchaseOrderPDF({ cart, suppliers, grandTotal }) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const poNumber = makePONumber();
    const dateStr = formatDate(new Date());

    // Agrupar ítems por supplier
    const grouped = cart.reduce((acc, item) => {
        (acc[item.supplier] = acc[item.supplier] ?? []).push(item);
        return acc;
    }, {});

    // Cache suppliers in a Map for O(1) lookup
    const supplierMap = new Map(suppliers.map(s => [s.id, s]));

    // ── Página y secciones iniciales ──────────────────────────────────────────
    let y = drawHeader(doc, poNumber, dateStr);
    y = drawMeta(doc, y);
    y = drawSupplierSummary(doc, y, grouped, supplierMap);

    // ── Tablas de ítems por supplier ──────────────────────────────────────────
    let globalRowIdx = 0;
    let itemNum = 1;

    for (const [supId, items] of Object.entries(grouped)) {
        const sup = supplierMap.get(supId);

        // Nueva página si no hay espacio suficiente para el bloque del supplier
        if (y > 235) {
            doc.addPage();
            y = drawHeader(doc, poNumber, dateStr);
        }

        // ── Encabezado del supplier ─────────────────────────────────────
        const supColor = sup?.color ? hexToRgb(sup.color) : C.teal;
        doc.setFillColor(...supColor);
        doc.roundedRect(MARGIN, y, CONT_W, 8, 2, 2, 'F');

        // Cuadrado de ícono blanco (simula icono de edificio)
        doc.setFillColor(...C.white);
        doc.roundedRect(MARGIN + 3, y + 2, 4, 4, 0.8, 0.8, 'F');

        // Nombre del supplier
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.white);
        doc.text(supId, MARGIN + 10, y + 5.5);

        // Website a la derecha
        if (sup?.contact) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(220, 245, 245);
            doc.text(sup.contact, PAGE_W - MARGIN - 2, y + 5.5, { align: 'right' });
        }
        y += 8;

        // ── Cabecera de columnas ────────────────────────────────────────
        y = drawTableHeader(doc, y);

        // ── Filas de ítems ──────────────────────────────────────────────
        let supSubtotal = 0;
        for (const item of items) {
            // Salto de página automático
            if (y > 260) {
                doc.addPage();
                y = drawHeader(doc, poNumber, dateStr);
                y = drawTableHeader(doc, y);
            }

            y = drawItemRow(doc, y, item, globalRowIdx, itemNum);
            supSubtotal += item.pricePerPack * item.R;
            globalRowIdx += 1;
            itemNum += 1;
        }

        // Subtotal del supplier
        y = drawSubtotalRow(doc, y, supId, supSubtotal);
        y += 4; // espacio entre bloques de supplier
    }

    // ── Grand total ───────────────────────────────────────────────────────────
    if (y > 255) { doc.addPage(); y = drawHeader(doc, poNumber, dateStr); }
    y += 4;
    drawGrandTotal(doc, y, grandTotal, cart);

    // ── Pie de página en TODAS las páginas ───────────────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        drawFooter(doc, p, totalPages, poNumber);
    }

    // ── Descargar el PDF ──────────────────────────────────────────────────────
    const fileName = `KitchenCalc_${poNumber}.pdf`;
    doc.save(fileName);
    return fileName;
}
