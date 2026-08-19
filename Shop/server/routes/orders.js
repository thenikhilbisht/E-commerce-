const router = require('express').Router();
const db = require('../db/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { generateOrderReceiptPDF } = require('../utils/pdfGenerator');

// Generate unique order number in format: ORD-2026-XXXXXX
function generateOrderNumber() {
  const currentCount = db.prepare('SELECT COUNT(*) as cnt FROM orders').get()?.cnt || 0;
  const seq = (currentCount + 101).toString().padStart(6, '0');
  const year = new Date().getFullYear();
  return `ORD-${year}-${seq}`;
}

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = {};
  rows.forEach(r => (s[r.key] = r.value));
  return s;
}

// POST /api/orders — place order (STRICT AUTHENTICATION REQUIRED)
router.post('/', authenticate, (req, res) => {
  const { items, shipping_address, payment_method } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: 'Cart is empty' });
  if (!shipping_address) return res.status(400).json({ error: 'Shipping address required' });
  if (!payment_method) return res.status(400).json({ error: 'Payment method required' });

  const settings = getSettings();
  if (payment_method === 'cod' && settings.cod_enabled !== 'true')
    return res.status(400).json({ error: 'Cash on Delivery is currently disabled' });

  const user_id = req.user.id;
  const user_email = req.user.email;

  // Validate items, DB prices, & STOCK availability
  let subtotal = 0;
  const validatedItems = [];
  const stockUpdates = [];

  for (const item of items) {
    const product = db.prepare('SELECT id, title, price, images, stock, is_published FROM products WHERE id = ?').get(item.product_id);
    if (!product || product.is_published !== 1) {
      return res.status(400).json({ error: `Product "${item.title || item.product_id}" is no longer available` });
    }

    const qty = parseInt(item.quantity) || 1;
    if (product.stock < qty) {
      return res.status(400).json({
        error: `Sorry, "${product.title}" is out of stock or only ${product.stock} left in stock.`
      });
    }

    subtotal += product.price * qty;
    validatedItems.push({
      product_id: product.id,
      title: product.title,
      price: product.price,
      quantity: qty,
      size: item.size || null,
      image: safeJSON(product.images, [])[0] || '',
    });

    stockUpdates.push({ id: product.id, qty });
  }

  // Calculate server-side totals
  const freeAbove = parseFloat(settings.shipping_free_above || 999);
  const flatFee = parseFloat(settings.shipping_flat_fee || 99);
  const shipping_total = subtotal >= freeAbove ? 0 : flatFee;
  const total = subtotal + shipping_total;

  const order_number = generateOrderNumber();
  const initialHistory = [{
    status: 'confirmed',
    timestamp: new Date().toISOString(),
    note: 'Order placed & confirmed by customer'
  }];

  // Atomic transaction to place order and decrement stock
  const placeOrderTx = db.transaction(() => {
    // Decrement product stock
    for (const u of stockUpdates) {
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(u.qty, u.id);
    }

    if (payment_method === 'cod') {
      const result = db.prepare(`
        INSERT INTO orders (order_number, user_id, guest_email, items, subtotal, shipping_total, total, shipping_address, payment_method, status, order_status, payment_status, status_history)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'cod', 'confirmed', 'confirmed', 'pending', ?)
      `).run(
        order_number, user_id, user_email,
        JSON.stringify(validatedItems), subtotal, shipping_total, total,
        JSON.stringify(shipping_address),
        JSON.stringify(initialHistory)
      );

      return db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
    }
    return null;
  });

  if (payment_method === 'cod') {
    try {
      const order = placeOrderTx();
      return res.status(201).json({ order: parseOrder(order) });
    } catch (err) {
      console.error('Order creation error:', err);
      return res.status(500).json({ error: 'Failed to place order. Please try again.' });
    }
  }

  // Razorpay integration
  if (payment_method === 'razorpay') {
    const keyId = settings.razorpay_key_id || process.env.RAZORPAY_KEY_ID;
    const keySecret = settings.razorpay_key_secret || process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret || keyId.includes('placeholder')) {
      return res.status(400).json({ error: 'Razorpay is not configured. Please choose Cash on Delivery.' });
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    razorpay.orders.create({
      amount: Math.round(total * 100),
      currency: 'INR',
      receipt: order_number,
    }, (err, rzpOrder) => {
      if (err) {
        console.error('Razorpay error:', err);
        return res.status(500).json({ error: 'Payment gateway error. Please choose COD.' });
      }

      try {
        const order = db.transaction(() => {
          for (const u of stockUpdates) {
            db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(u.qty, u.id);
          }

          const result = db.prepare(`
            INSERT INTO orders (order_number, user_id, guest_email, items, subtotal, shipping_total, total, shipping_address, payment_method, razorpay_order_id, status, order_status, payment_status, status_history)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'razorpay', ?, 'pending', 'confirmed', 'pending', ?)
          `).run(
            order_number, user_id, user_email,
            JSON.stringify(validatedItems), subtotal, shipping_total, total,
            JSON.stringify(shipping_address), rzpOrder.id,
            JSON.stringify(initialHistory)
          );

          return db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
        })();

        res.status(201).json({
          order: parseOrder(order),
          razorpay: {
            key_id: keyId,
            order_id: rzpOrder.id,
            amount: rzpOrder.amount,
            currency: 'INR',
            name: settings.site_name || 'ShopIndia',
          },
        });
      } catch (e) {
        res.status(500).json({ error: 'Failed to initialize payment order.' });
      }
    });
    return;
  }

  res.status(400).json({ error: 'Invalid payment method' });
});

// POST /api/orders/verify-payment — Razorpay verification
router.post('/verify-payment', authenticate, (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
    return res.status(400).json({ error: 'Missing payment verification data' });

  const settings = getSettings();
  const keySecret = settings.razorpay_key_secret || process.env.RAZORPAY_KEY_SECRET;

  const generated = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generated !== razorpay_signature) {
    db.prepare("UPDATE orders SET status = 'failed', payment_status = 'failed' WHERE razorpay_order_id = ?").run(razorpay_order_id);
    return res.status(400).json({ error: 'Payment verification signature invalid' });
  }

  // Update order status & payment status
  const existingOrder = db.prepare('SELECT * FROM orders WHERE razorpay_order_id = ?').get(razorpay_order_id);
  if (existingOrder) {
    const history = safeJSON(existingOrder.status_history, []);
    history.push({
      status: 'confirmed',
      timestamp: new Date().toISOString(),
      note: `Online payment verified (Payment ID: ${razorpay_payment_id})`
    });

    db.prepare("UPDATE orders SET status = 'confirmed', order_status = 'confirmed', payment_status = 'paid', payment_id = ?, status_history = ? WHERE id = ?")
      .run(razorpay_payment_id, JSON.stringify(history), existingOrder.id);
  }

  const updatedOrder = db.prepare('SELECT * FROM orders WHERE razorpay_order_id = ?').get(razorpay_order_id);
  res.json({ order: parseOrder(updatedOrder) });
});

// GET /api/orders — admin list all orders
router.get('/', authenticate, requireAdmin, (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let query = 'SELECT o.*, u.name as customer_name, u.email as customer_email FROM orders o LEFT JOIN users u ON o.user_id = u.id';
  const params = [];

  if (status) {
    query += ' WHERE (o.order_status = ? OR o.status = ?)';
    params.push(status, status);
  }

  const countQuery = query.replace('SELECT o.*, u.name as customer_name, u.email as customer_email', 'SELECT COUNT(*) as total');
  const total = db.prepare(countQuery).get(...params)?.total || 0;

  query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  const orders = db.prepare(query).all(...params).map(parseOrder);
  res.json({ orders, total });
});

// GET /api/orders/my — customer's order history
router.get('/my', authenticate, (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, u.name as customer_name, u.email as customer_email
    FROM orders o LEFT JOIN users u ON o.user_id = u.id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
  `).all(req.user.id).map(parseOrder);
  res.json({ orders });
});

// GET /api/orders/:id — single order details (strict authorization)
router.get('/:id', authenticate, (req, res) => {
  const order = db.prepare(`
    SELECT o.*, u.name as customer_name, u.email as customer_email
    FROM orders o LEFT JOIN users u ON o.user_id = u.id
    WHERE o.id = ? OR o.order_number = ?
  `).get(req.params.id, req.params.id);

  if (!order) return res.status(404).json({ error: 'Order not found' });

  // Strict ownership check
  if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied: You do not have permission to view this order.' });
  }

  res.json({ order: parseOrder(order) });
});

// GET /api/orders/:id/receipt — download PDF receipt (STRICT USER OWNERSHIP CHECK)
router.get('/:id/receipt', authenticate, (req, res) => {
  const order = db.prepare(`
    SELECT o.*, u.name as customer_name, u.email as customer_email
    FROM orders o LEFT JOIN users u ON o.user_id = u.id
    WHERE o.id = ? OR o.order_number = ?
  `).get(req.params.id, req.params.id);

  if (!order) return res.status(404).json({ error: 'Order not found' });

  // Strict authorization check
  if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied: You can only download your own order receipts.' });
  }

  const parsedOrder = parseOrder(order);
  const settings = getSettings();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Invoice-${parsedOrder.order_number || parsedOrder.id}.pdf`);

  const pdfStream = generateOrderReceiptPDF(parsedOrder, settings);
  pdfStream.pipe(res);
});

// PATCH /api/orders/:id/status — admin update order lifecycle status
router.patch('/:id/status', authenticate, requireAdmin, (req, res) => {
  const { order_status, payment_status, tracking_number, note } = req.body;

  const validStatuses = ['confirmed', 'processing', 'packed', 'dispatched', 'out_for_delivery', 'delivered', 'cancelled', 'returned', 'refunded'];
  const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const newOrderStatus = order_status && validStatuses.includes(order_status) ? order_status : (order.order_status || order.status);
  const newPaymentStatus = payment_status && validPaymentStatuses.includes(payment_status) ? payment_status : order.payment_status;
  const newTrackingNumber = tracking_number !== undefined ? tracking_number : order.tracking_number;

  const history = safeJSON(order.status_history, []);
  if (order_status && order_status !== order.order_status) {
    const statusTitles = {
      confirmed: 'Order Confirmed',
      processing: 'Processing Order',
      packed: 'Packed & Prepared',
      dispatched: 'Dispatched to Courier',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      cancelled: 'Order Cancelled',
      returned: 'Order Returned',
      refunded: 'Payment Refunded'
    };
    history.push({
      status: order_status,
      timestamp: new Date().toISOString(),
      note: note || statusTitles[order_status] || `Status updated to ${order_status}`
    });
  }

  db.prepare(`
    UPDATE orders
    SET status = ?, order_status = ?, payment_status = ?, tracking_number = ?, status_history = ?
    WHERE id = ?
  `).run(
    newOrderStatus,
    newOrderStatus,
    newPaymentStatus,
    newTrackingNumber,
    JSON.stringify(history),
    req.params.id
  );

  const updated = db.prepare('SELECT o.*, u.name as customer_name, u.email as customer_email FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.id = ?').get(req.params.id);
  res.json({ order: parseOrder(updated) });
});

function parseOrder(o) {
  if (!o) return null;
  const orderStatus = o.order_status || o.status || 'confirmed';
  const paymentStatus = o.payment_status || (o.payment_method === 'cod' ? 'pending' : 'paid');

  let history = safeJSON(o.status_history, []);
  if (!Array.isArray(history) || history.length === 0) {
    history = [{
      status: orderStatus,
      timestamp: o.created_at || new Date().toISOString(),
      note: 'Order placed & confirmed'
    }];
  }

  return {
    ...o,
    order_status: orderStatus,
    payment_status: paymentStatus,
    status_history: history,
    items: safeJSON(o.items, []),
    shipping_address: safeJSON(o.shipping_address, {}),
  };
}

function safeJSON(str, fallback) {
  try { return JSON.parse(str); }
  catch { return fallback; }
}

module.exports = router;
