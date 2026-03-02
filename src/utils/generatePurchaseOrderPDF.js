/**
 * @file utils/generatePurchaseOrderPDF.js
 * @description Generador de PDF para la orden de compra (Purchase Order).
 *
 * Usa jsPDF para construir un documento con:
 *  - Encabezado con logo de texto y datos de la empresa
 *  - Número de orden y fecha de generación
 *  - Tabla de ítems agrupada por supplier, con subtotales
 *  - Resumen final con gran total
 *  - Pie de página en cada hoja
 *
 * Se mantiene separado de CartView para cumplir el principio
 * de Single Responsibility: CartView solo muestra UI, este módulo
 * solo genera documentos.
 *
 * @param {object} params
 * @param {CartItem[]}   params.cart      - Ítems del carrito.
 * @param {Supplier[]}   params.suppliers - Lista de suppliers (para datos de contacto).
 * @param {number}       params.grandTotal - Total calculado.
 */
import { jsPDF } from 'jspdf';

// ── Constantes de diseño del PDF ──────────────────────────────────────────────
const BRAND = {
    primary: [61, 26, 120],   // #3d1a78 → RGB
    accent: [78, 205, 196],   // #4ecdc4 → RGB
    textDark: [31, 41, 55],   // #1f2937
    textMid: [107, 63, 160],   // #6b3fa0
    textLight: [155, 109, 202],  // #9b6dca
    rowOdd: [249, 246, 255],  // fondo alternado de filas
    rowEven: [255, 255, 255],
    lineGray: [229, 231, 235],  // #e5e7eb
};

const PAGE_MARGIN = 18;            // margen izquierdo y derecho (mm)
const PAGE_WIDTH = 210;           // A4 ancho (mm)
const CONTENT_W = PAGE_WIDTH - PAGE_MARGIN * 2;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Genera un número de PO con formato PO-YYYYMMDD-XXXX. */
function generatePONumber() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `PO-${date}-${rand}`;
}

/** Formatea una fecha en formato legible "March 1, 2026 — 08:30 PM". */
function formatDate(date) {
    return date.toLocaleString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

/**
 * Dibuja el encabezado de la página con el branding de KitchenCalc.
 * @param {jsPDF} doc
 * @param {string} poNumber
 * @param {string} dateStr
 */
function drawHeader(doc, poNumber, dateStr) {
    // Barra de color superior
    doc.setFillColor(...BRAND.primary);
    doc.rect(0, 0, PAGE_WIDTH, 28, 'F');

    // Franja de acento teal
    doc.setFillColor(...BRAND.accent);
    doc.rect(0, 28, PAGE_WIDTH, 4, 'F');

    // Logo texto
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('🍳 KitchenCalc', PAGE_MARGIN, 17);

    // Subtítulo del documento
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Purchase Order / Requisition', PAGE_MARGIN, 24);

    // PO Number y fecha (alineados a la derecha)
    doc.setFontSize(9);
    doc.text(poNumber, PAGE_WIDTH - PAGE_MARGIN, 14, { align: 'right' });
    doc.text(dateStr, PAGE_WIDTH - PAGE_MARGIN, 21, { align: 'right' });

    return 42; // y inicial del contenido tras el header
}

/**
 * Dibuja la sección de metadatos (to/from, términos).
 * @param {jsPDF} doc
 * @param {number} y - Posición Y donde comienza.
 * @returns {number} Nueva posición Y.
 */
function drawMetaSection(doc, y) {
    const colW = CONTENT_W / 3;

    const boxes = [
        { title: 'PREPARED BY', lines: ['KitchenCalc System', 'Kitchen Management'] },
        { title: 'TERMS', lines: ['Net 30', 'Standard Purchase Order'] },
        { title: 'NOTES', lines: ['Please confirm receipt', 'within 24 hours'] },
    ];

    doc.setFillColor(...BRAND.rowOdd);
    doc.roundedRect(PAGE_MARGIN, y, CONTENT_W, 22, 3, 3, 'F');

    boxes.forEach((box, i) => {
        const x = PAGE_MARGIN + i * colW + 4;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BRAND.textMid);
        doc.text(box.title, x, y + 6);

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BRAND.textDark);
        box.lines.forEach((line, li) => doc.text(line, x, y + 11 + li * 5));
    });

    return y + 30;
}

/**
 * Dibuja la tabla de encabezado de columnas.
 * @param {jsPDF} doc
 * @param {number} y
 * @returns {number} Nueva posición Y.
 */
function drawTableHeader(doc, y) {
    const cols = [
        { label: '#', w: 10 },
        { label: 'Ingredient', w: 62 },
        { label: 'Pack Size', w: 28 },
        { label: 'Packs (R)', w: 24 },
        { label: 'Unit Price', w: 28 },
        { label: 'Total', w: 22 },
    ];

    doc.setFillColor(...BRAND.primary);
    doc.rect(PAGE_MARGIN, y, CONTENT_W, 8, 'F');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);

    let x = PAGE_MARGIN + 2;
    cols.forEach(col => {
        const align = col.label === 'Total' || col.label === 'Unit Price' || col.label === 'Packs (R)'
            ? 'right' : 'left';
        doc.text(col.label, align === 'right' ? x + col.w - 3 : x, y + 5.5, { align });
        x += col.w;
    });

    return y + 8;
}

/**
 * Dibuja una fila de ítem en la tabla.
 * @param {jsPDF}   doc
 * @param {number}  y
 * @param {CartItem} item
 * @param {number}  rowIndex - Para el color alternado.
 * @param {number}  itemNum  - Número de ítem global.
 * @returns {number} Nueva posición Y.
 */
function drawItemRow(doc, y, item, rowIndex, itemNum) {
    const ROW_H = 7;
    const bg = rowIndex % 2 === 0 ? BRAND.rowEven : BRAND.rowOdd;

    doc.setFillColor(...bg);
    doc.rect(PAGE_MARGIN, y, CONTENT_W, ROW_H, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.textDark);

    const total = (item.pricePerPack * item.R).toFixed(2);
    const cols = [
        { text: String(itemNum), x: PAGE_MARGIN + 2, align: 'left' },
        { text: item.name, x: PAGE_MARGIN + 12, align: 'left' },
        { text: `${item.packSize.toLocaleString()} ${item.unit}`, x: PAGE_MARGIN + 74, align: 'left' },
        { text: String(item.R), x: PAGE_MARGIN + 98, align: 'right' },
        { text: `$${item.pricePerPack.toFixed(2)}`, x: PAGE_MARGIN + 126, align: 'right' },
        { text: `$${total}`, x: PAGE_MARGIN + 172, align: 'right' },
    ];

    cols.forEach(col => doc.text(col.text, col.x, y + 5, { align: col.align }));

    return y + ROW_H;
}

/**
 * Dibuja el pie de página de cada hoja.
 * @param {jsPDF} doc
 * @param {number} pageNum
 * @param {number} totalPages
 */
function drawFooter(doc, pageNum, totalPages) {
    const y = 287;
    doc.setDrawColor(...BRAND.lineGray);
    doc.line(PAGE_MARGIN, y, PAGE_WIDTH - PAGE_MARGIN, y);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.textLight);
    doc.text('Generated by KitchenCalc — Kitchen Management System', PAGE_MARGIN, y + 4);
    doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_WIDTH - PAGE_MARGIN, y + 4, { align: 'right' });
}

// ── Función principal ─────────────────────────────────────────────────────────

/**
 * Genera y descarga el PDF de Purchase Order.
 *
 * @param {object}    opts
 * @param {CartItem[]}  opts.cart       - Ítems del carrito.
 * @param {Supplier[]}  opts.suppliers  - Lista completa de suppliers.
 * @param {number}      opts.grandTotal - Gran total calculado.
 */
export function generatePurchaseOrderPDF({ cart, suppliers, grandTotal }) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const poNumber = generatePONumber();
    const dateStr = formatDate(new Date());

    // Agrupar ítems por supplier
    const grouped = cart.reduce((acc, item) => {
        (acc[item.supplier] = acc[item.supplier] ?? []).push(item);
        return acc;
    }, {});

    let y = drawHeader(doc, poNumber, dateStr);
    y = drawMetaSection(doc, y);

    // ── Resumen de suppliers ───────────────────────────────────────────────────
    y += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.textMid);
    doc.text('SUPPLIER SUMMARY', PAGE_MARGIN, y);
    y += 4;

    const suppKeys = Object.keys(grouped);
    suppKeys.forEach((supId, i) => {
        const sup = suppliers.find(s => s.id === supId);
        const subTotal = grouped[supId].reduce((s, it) => s + it.pricePerPack * it.R, 0);

        doc.setFillColor(...BRAND.rowOdd);
        doc.rect(PAGE_MARGIN, y, CONTENT_W, 6, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BRAND.primary);
        doc.text(`${i + 1}. ${supId}`, PAGE_MARGIN + 2, y + 4.5);
        if (sup?.email) {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...BRAND.textLight);
            doc.text(sup.email, PAGE_MARGIN + 40, y + 4.5);
        }
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BRAND.textDark);
        doc.text(`$${subTotal.toFixed(2)}`, PAGE_WIDTH - PAGE_MARGIN, y + 4.5, { align: 'right' });
        y += 7;
    });

    // ── Tabla de ítems por supplier ───────────────────────────────────────────
    y += 4;
    let globalRow = 0;

    for (const [supId, items] of Object.entries(grouped)) {
        const sup = suppliers.find(s => s.id === supId);

        // Verificar si hay espacio suficiente; si no, nueva página
        if (y > 240) {
            doc.addPage();
            y = drawHeader(doc, poNumber, dateStr) + 6;
        }

        // Encabezado del supplier
        doc.setFillColor(...BRAND.accent);
        doc.rect(PAGE_MARGIN, y, CONTENT_W, 7, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(`🏭  ${supId}`, PAGE_MARGIN + 2, y + 5);
        if (sup?.contact) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.text(sup.contact, PAGE_WIDTH - PAGE_MARGIN, y + 5, { align: 'right' });
        }
        y += 7;

        // Encabezado de columnas
        y = drawTableHeader(doc, y);

        // Filas de ingredientes
        let supSubtotal = 0;
        items.forEach((item, i) => {
            if (y > 265) {
                drawFooter(doc, doc.internal.getNumberOfPages(), '?');
                doc.addPage();
                y = drawHeader(doc, poNumber, dateStr) + 6;
                y = drawTableHeader(doc, y);
            }
            y = drawItemRow(doc, y, item, globalRow + i, globalRow + i + 1);
            supSubtotal += item.pricePerPack * item.R;
        });
        globalRow += items.length;

        // Subtotal del supplier
        doc.setFillColor(230, 220, 250);
        doc.rect(PAGE_MARGIN, y, CONTENT_W, 6, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BRAND.textMid);
        doc.text(`Subtotal — ${supId}`, PAGE_MARGIN + 2, y + 4.5);
        doc.setTextColor(...BRAND.primary);
        doc.text(`$${supSubtotal.toFixed(2)}`, PAGE_WIDTH - PAGE_MARGIN, y + 4.5, { align: 'right' });
        y += 10;
    }

    // ── Gran total ────────────────────────────────────────────────────────────
    if (y > 255) { doc.addPage(); y = 30; }

    y += 4;
    doc.setFillColor(...BRAND.primary);
    doc.roundedRect(PAGE_WIDTH - PAGE_MARGIN - 80, y, 80, 16, 3, 3, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text('GRAND TOTAL', PAGE_WIDTH - PAGE_MARGIN - 4, y + 6, { align: 'right' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${grandTotal.toFixed(2)}`, PAGE_WIDTH - PAGE_MARGIN - 4, y + 13, { align: 'right' });

    // Número de ítems y packs totales
    const totalPacks = cart.reduce((s, i) => s + i.R, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.textLight);
    doc.text(`${cart.length} ingredients · ${totalPacks} packs total`, PAGE_MARGIN, y + 10);

    // ── Pie de página en TODAS las páginas ────────────────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        drawFooter(doc, p, totalPages);
    }

    // ── Descargar ─────────────────────────────────────────────────────────────
    const fileName = `KitchenCalc_${poNumber}.pdf`;
    doc.save(fileName);

    return fileName;
}
