const router = require('express').Router();
const db = require('../db/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

function slugify(text) {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
}

// GET /api/categories
router.get('/', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY display_order ASC').all();
  res.json({ categories });
});

// GET /api/categories/:slug
router.get('/:slug', (req, res) => {
  const cat = db.prepare('SELECT * FROM categories WHERE slug = ? OR id = ?').get(req.params.slug, req.params.slug);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  res.json({ category: cat });
});

// POST /api/categories — admin
router.post('/', authenticate, requireAdmin, upload.single('image'), (req, res) => {
  const { name, display_order } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const slug = slugify(name);
  const image_url = req.file ? `/uploads/${req.file.filename}` : (req.body.image_url || '');

  try {
    const result = db.prepare(
      'INSERT INTO categories (name, slug, image_url, display_order) VALUES (?, ?, ?, ?)'
    ).run(name.trim(), slug, image_url, parseInt(display_order) || 0);
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ category: cat });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Category slug already exists' });
    throw e;
  }
});

// PUT /api/categories/:id — admin
router.put('/:id', authenticate, requireAdmin, upload.single('image'), (req, res) => {
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Category not found' });

  const { name, display_order } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : (req.body.image_url ?? cat.image_url);
  const newName = name || cat.name;
  const newSlug = slugify(newName);

  db.prepare('UPDATE categories SET name=?, slug=?, image_url=?, display_order=? WHERE id=?')
    .run(newName.trim(), newSlug, image_url, parseInt(display_order ?? cat.display_order), req.params.id);

  const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  res.json({ category: updated });
});

// DELETE /api/categories/:id — admin
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  // Nullify products' category_id
  db.prepare('UPDATE products SET category_id = NULL WHERE category_id = ?').run(req.params.id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ message: 'Category deleted' });
});

module.exports = router;
