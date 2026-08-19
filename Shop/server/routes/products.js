const router = require('express').Router();
const db = require('../db/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { sanitizeHTML } = require('../middleware/sanitize');

// Helper: slugify
function slugify(text) {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

// GET /api/products — public listing with filters
router.get('/', (req, res) => {
  const { category, minPrice, maxPrice, search, page = 1, limit = 12 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = 'SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_published = 1';
  const params = [];

  if (category) {
    query += ' AND c.slug = ?';
    params.push(category);
  }
  if (minPrice) {
    query += ' AND p.price >= ?';
    params.push(parseFloat(minPrice));
  }
  if (maxPrice) {
    query += ' AND p.price <= ?';
    params.push(parseFloat(maxPrice));
  }
  if (search) {
    query += ' AND (p.title LIKE ? OR p.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const countQuery = query.replace('SELECT p.*, c.name as category_name, c.slug as category_slug', 'SELECT COUNT(*) as total');
  const total = db.prepare(countQuery).get(...params)?.total || 0;

  query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  const products = db.prepare(query).all(...params).map(parseProduct);
  res.json({ products, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/products/:id — single product
router.get('/:id', (req, res) => {
  const product = db.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE (p.id = ? OR p.slug = ?) AND p.is_published = 1
  `).get(req.params.id, req.params.id);

  if (!product) return res.status(404).json({ error: 'Product not found' });

  // Related products (same category, exclude self)
  const related = product.category_id
    ? db.prepare(`
        SELECT p.*, c.name as category_name FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.category_id = ? AND p.id != ? AND p.is_published = 1
        LIMIT 4
      `).all(product.category_id, product.id).map(parseProduct)
    : [];

  res.json({ product: parseProduct(product), related });
});

// POST /api/products — admin create
router.post('/', authenticate, requireAdmin, upload.array('images', 10), (req, res) => {
  const { title, description, price, compare_price, sizes, category_id, stock, is_published } = req.body;
  if (!title || !price) return res.status(400).json({ error: 'Title and price are required' });

  const slug = slugify(title) + '-' + Date.now();
  const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
  const existingImages = req.body.existing_images ? JSON.parse(req.body.existing_images) : [];
  const allImages = [...existingImages, ...images];

  const sanitizedDesc = sanitizeHTML(description || '');

  const result = db.prepare(`
    INSERT INTO products (title, slug, description, price, compare_price, sizes, images, category_id, stock, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title.trim(), slug, sanitizedDesc,
    parseFloat(price), compare_price ? parseFloat(compare_price) : null,
    JSON.stringify(sizes ? (Array.isArray(sizes) ? sizes : JSON.parse(sizes)) : []),
    JSON.stringify(allImages),
    category_id || null, parseInt(stock) || 0,
    is_published === 'false' || is_published === false ? 0 : 1
  );

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ product: parseProduct(product) });
});

// PUT /api/products/:id — admin update
router.put('/:id', authenticate, requireAdmin, upload.array('images', 10), (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const { title, description, price, compare_price, sizes, category_id, stock, is_published } = req.body;
  const newImages = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
  const keepImages = req.body.existing_images ? JSON.parse(req.body.existing_images) : JSON.parse(existing.images || '[]');
  const allImages = [...keepImages, ...newImages];

  const sanitizedDesc = sanitizeHTML(description || '');

  db.prepare(`
    UPDATE products SET title=?, description=?, price=?, compare_price=?, sizes=?, images=?, category_id=?, stock=?, is_published=?, slug=?
    WHERE id=?
  `).run(
    (title || existing.title).trim(),
    sanitizedDesc,
    parseFloat(price || existing.price),
    compare_price !== undefined ? (compare_price ? parseFloat(compare_price) : null) : existing.compare_price,
    JSON.stringify(sizes ? (Array.isArray(sizes) ? sizes : JSON.parse(sizes)) : JSON.parse(existing.sizes || '[]')),
    JSON.stringify(allImages),
    category_id !== undefined ? (category_id || null) : existing.category_id,
    parseInt(stock !== undefined ? stock : existing.stock),
    is_published !== undefined ? (is_published === 'false' || is_published === false ? 0 : 1) : existing.is_published,
    slugify(title || existing.title),
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json({ product: parseProduct(updated) });
});

// DELETE /api/products/:id — admin delete
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ message: 'Product deleted' });
});

// Helper: parse JSON fields
function parseProduct(p) {
  return {
    ...p,
    images: safeJSON(p.images, []),
    sizes: safeJSON(p.sizes, []),
  };
}

function safeJSON(str, fallback) {
  try { return JSON.parse(str); }
  catch { return fallback; }
}

module.exports = router;
