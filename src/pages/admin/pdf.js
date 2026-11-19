import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function invoiceTotals(inv) {
  const subtotal = (inv.items || []).reduce((s, it) => s + Number(it.qty || 0) * Number(it.price || 0), 0);
  const discount = Math.min(subtotal, Number(inv.discount || 0));
  const taxable = subtotal - discount;
  const tax = (taxable * Number(inv.taxRate || 0)) / 100;
  return { subtotal, discount, tax, total: taxable + tax };
}

const fmt = (n, cur) => `${cur} ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtD = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

async function toDataUrl(url) {
  const blob = await (await fetch(url)).blob();
  return new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
}

const RED = [208, 16, 43];
const DARK = [90, 4, 16];
const GOLD = [255, 212, 0];
const INK = [20, 18, 22];
const GREY = [120, 116, 126];

export async function downloadInvoicePdf(inv, content, settings) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 16;
  const cur = inv.currency || settings.currency || 'N$';
  const t = invoiceTotals(inv);

  // header band
  doc.setFillColor(...DARK); doc.rect(0, 0, W, 50, 'F');
  doc.setFillColor(...RED); doc.triangle(0, 0, W * 0.72, 0, 0, 50, 'F');
  doc.setFillColor(...GOLD); doc.rect(0, 50, W, 2.2, 'F');

  try {
    const crest = await toDataUrl('/images/crest.png');
    doc.addImage(crest, 'PNG', M, 9, 32, 32);
  } catch { /* crest optional */ }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
  doc.text((content.clubName || '').toUpperCase(), M + 38, 21);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  const contact = [content.address, content.email, content.phone].filter(Boolean);
  contact.forEach((l, i) => doc.text(l, M + 38, 28 + i * 4.6));

  doc.setFont('helvetica', 'bold'); doc.setFontSize(30);
  doc.text('INVOICE', W - M, 25, { align: 'right' });
  doc.setFontSize(10); doc.setTextColor(...GOLD);
  doc.text(inv.number || '', W - M, 33, { align: 'right' });
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  doc.text(`STATUS: ${(inv.status || 'draft').toUpperCase()}`, W - M, 39, { align: 'right' });

  // bill to + meta
  let y = 66;
  doc.setTextColor(...RED); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
  doc.text('BILL TO', M, y);
  doc.setTextColor(...INK); doc.setFontSize(12);
  doc.text(inv.billTo?.name || '—', M, y + 7);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...GREY);
  const billLines = [
    ...doc.splitTextToSize(inv.billTo?.address || '', 85),
    inv.billTo?.email, inv.billTo?.phone,
  ].filter(Boolean);
  billLines.forEach((l, i) => doc.text(l, M, y + 13 + i * 5));

  const meta = [['Invoice date', fmtD(inv.date)], ['Due date', fmtD(inv.dueDate)], ['Amount due', fmt(t.total, cur)]];
  meta.forEach(([k, v], i) => {
    const yy = y + i * 9;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...RED);
    doc.text(k.toUpperCase(), W - M - 60, yy);
    doc.setTextColor(...INK); doc.setFontSize(10.5);
    doc.text(v, W - M, yy, { align: 'right' });
  });

  y = Math.max(y + 13 + billLines.length * 5, y + 27) + 8;

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['#', 'Description', 'Qty', 'Unit price', 'Amount']],
    body: (inv.items || []).map((it, i) => [
      String(i + 1).padStart(2, '0'), it.description || '', String(it.qty), fmt(it.price, cur), fmt(Number(it.qty) * Number(it.price), cur),
    ]),
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9.5, cellPadding: { top: 4, bottom: 4, left: 3, right: 3 }, textColor: INK },
    headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    alternateRowStyles: { fillColor: [247, 244, 240] },
    columnStyles: { 0: { cellWidth: 12, textColor: GREY }, 2: { halign: 'center', cellWidth: 16 }, 3: { halign: 'right', cellWidth: 34 }, 4: { halign: 'right', cellWidth: 36, fontStyle: 'bold' } },
    didParseCell: (d) => { if (d.section === 'head' && d.column.index >= 2) d.cell.styles.halign = d.column.index === 2 ? 'center' : 'right'; },
  });

  // totals
  y = doc.lastAutoTable.finalY + 8;
  if (y > H - 80) { doc.addPage(); y = 24; }
  const tx = W - M - 78;
  const rows = [['Subtotal', fmt(t.subtotal, cur)]];
  if (t.discount) rows.push(['Discount', `- ${fmt(t.discount, cur)}`]);
  rows.push([`VAT (${Number(inv.taxRate || 0)}%)`, fmt(t.tax, cur)]);
  doc.setFontSize(9.5);
  rows.forEach(([k, v], i) => {
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY); doc.text(k, tx, y + i * 6.5);
    doc.setTextColor(...INK); doc.text(v, W - M, y + i * 6.5, { align: 'right' });
  });
  y += rows.length * 6.5;
  doc.setFillColor(...RED); doc.roundedRect(tx - 4, y - 1, 78 + 4, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('TOTAL DUE', tx, y + 6.6);
  doc.text(fmt(t.total, cur), W - M - 3, y + 6.6, { align: 'right' });

  // notes & bank details
  let ny = doc.lastAutoTable.finalY + 8;
  const block = (title, text) => {
    if (!text) return;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...RED);
    doc.text(title, M, ny);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GREY);
    const lines = doc.splitTextToSize(text, tx - M - 14);
    doc.text(lines, M, ny + 5);
    ny += 9 + lines.length * 4.4;
  };
  block('NOTES', inv.notes);
  block('PAYMENT DETAILS', settings.bank);

  // footer
  doc.setFillColor(...GOLD); doc.rect(0, H - 16, W, 1.2, 'F');
  doc.setFillColor(...DARK); doc.rect(0, H - 14.8, W, 14.8, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  doc.text(settings.footer || '', M, H - 6.5);
  doc.text(`${content.league || ''} · Est. ${content.founded || ''}`, W - M, H - 6.5, { align: 'right' });

  doc.save(`${inv.number || 'invoice'}.pdf`);
}
