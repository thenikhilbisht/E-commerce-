const PDFDocument = require('pdfkit');

/**
 * Generate a vector PDF invoice document stream for an order.
 * @param {Object} order - Parsed order object from database.
 * @param {Object} settings - Site settings object.
 * @returns {PDFDocument} - Readable PDF stream.
 */
function generateOrderReceiptPDF(order, settings = {}) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  const siteName = settings.site_name || 'ShopIndia';
  const contactEmail = settings.contact_email || 'support@shopindia.com';
  const contactPhone = settings.contact_phone || '+91 98765 43210';

  // ── Header Bar ──────────────────────────────────────────────────────────
  doc
    .fillColor('#0f172a')
    .fontSize(24)
    .font('Helvetica-Bold')
    .text(siteName.toUpperCase(), 40, 40);

  doc
    .fillColor('#64748b')
    .fontSize(9)
    .font('Helvetica')
    .text('PREMIUM ETHNIC & CONTEMPORARY FASHION', 40, 68)
    .text(`Email: ${contactEmail} | Phone: ${contactPhone}`, 40, 80);

  // Invoice Tag (Top Right)
  doc
    .fillColor('#c2410c')
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('INVOICE / RECEIPT', 380, 40, { align: 'right' });

  doc
    .fillColor('#334155')
    .fontSize(10)
    .font('Helvetica')
    .text(`Invoice No: ${order.order_number || ('ORD-' + order.id)}`, 380, 62, { align: 'right' })
    .text(`Date: ${new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`, 380, 76, { align: 'right' })
    .text(`Payment: ${(order.payment_method || 'COD').toUpperCase()} (${(order.payment_status || 'Pending').toUpperCase()})`, 380, 90, { align: 'right' });

  doc
    .moveTo(40, 110)
    .lineTo(555, 110)
    .strokeColor('#e2e8f0')
    .strokeWidth(1.5)
    .stroke();

  // ── Customer & Shipping Info ─────────────────────────────────────────────
  let y = 125;
  doc
    .fillColor('#0f172a')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('CUSTOMER & SHIPPING DETAILS', 40, y);

  y += 18;
  const addr = order.shipping_address || {};
  const customerName = addr.fullName || addr.name || order.customer_name || 'Valued Customer';
  const customerEmail = order.guest_email || order.customer_email || addr.email || 'N/A';
  const phone = addr.phone || 'N/A';
  const addressLine = [addr.address, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ') || 'N/A';

  doc
    .fillColor('#334155')
    .fontSize(9.5)
    .font('Helvetica-Bold')
    .text(`Name: `, 40, y, { continued: true })
    .font('Helvetica')
    .text(customerName)
    .font('Helvetica-Bold')
    .text(`Email: `, 40, y + 14, { continued: true })
    .font('Helvetica')
    .text(customerEmail)
    .font('Helvetica-Bold')
    .text(`Phone: `, 40, y + 28, { continued: true })
    .font('Helvetica')
    .text(phone)
    .font('Helvetica-Bold')
    .text(`Shipping Address: `, 40, y + 42, { continued: true })
    .font('Helvetica')
    .text(addressLine);

  y += 65;
  doc
    .moveTo(40, y)
    .lineTo(555, y)
    .strokeColor('#e2e8f0')
    .strokeWidth(1)
    .stroke();

  // ── Items Table Header ──────────────────────────────────────────────────
  y += 15;
  doc.rect(40, y, 515, 24).fill('#f1f5f9');
  doc
    .fillColor('#0f172a')
    .fontSize(9.5)
    .font('Helvetica-Bold')
    .text('ITEM DESCRIPTION', 50, y + 7)
    .text('SIZE', 310, y + 7)
    .text('QTY', 370, y + 7, { width: 40, align: 'center' })
    .text('PRICE', 420, y + 7, { width: 60, align: 'right' })
    .text('AMOUNT', 490, y + 7, { width: 60, align: 'right' });

  y += 28;
  const items = Array.isArray(order.items) ? order.items : [];
  doc.font('Helvetica').fontSize(9).fillColor('#334155');

  items.forEach((item, index) => {
    const itemTitle = item.title || `Product #${item.product_id}`;
    const sizeStr = item.size || '-';
    const qty = item.quantity || 1;
    const price = item.price || 0;
    const lineTotal = price * qty;

    doc
      .text(itemTitle, 50, y, { width: 250, height: 14, ellipsis: true })
      .text(sizeStr, 310, y)
      .text(qty.toString(), 370, y, { width: 40, align: 'center' })
      .text(`Rs ${price.toLocaleString('en-IN')}`, 420, y, { width: 60, align: 'right' })
      .text(`Rs ${lineTotal.toLocaleString('en-IN')}`, 490, y, { width: 60, align: 'right' });

    y += 20;
    doc
      .moveTo(40, y)
      .lineTo(555, y)
      .strokeColor('#f1f5f9')
      .strokeWidth(0.5)
      .stroke();
    y += 6;
  });

  // ── Totals Section ───────────────────────────────────────────────────────
  y += 10;
  const subtotal = order.subtotal || 0;
  const shipping = order.shipping_total || 0;
  const total = order.total || 0;

  doc.font('Helvetica').fontSize(9.5).fillColor('#475569');
  doc.text('Subtotal:', 380, y, { width: 90, align: 'right' });
  doc.text(`Rs ${subtotal.toLocaleString('en-IN')}`, 480, y, { width: 70, align: 'right' });

  y += 16;
  doc.text('Shipping Fee:', 380, y, { width: 90, align: 'right' });
  doc.text(shipping === 0 ? 'FREE' : `Rs ${shipping.toLocaleString('en-IN')}`, 480, y, { width: 70, align: 'right' });

  y += 20;
  doc.rect(370, y - 4, 185, 26).fill('#0f172a');
  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('GRAND TOTAL:', 380, y + 3, { width: 90, align: 'right' })
    .text(`Rs ${total.toLocaleString('en-IN')}`, 480, y + 3, { width: 70, align: 'right' });

  // ── Footer & Guarantee ─────────────────────────────────────────────────
  doc
    .fillColor('#64748b')
    .fontSize(8.5)
    .font('Helvetica')
    .text('Thank you for shopping with ShopIndia! For questions or returns, please contact customer support.', 40, 760, { align: 'center' });

  doc.end();
  return doc;
}

module.exports = {
  generateOrderReceiptPDF
};
