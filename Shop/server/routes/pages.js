const router = require('express').Router();
const db = require('../db/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { sanitizeHTML } = require('../middleware/sanitize');

// GET /api/pages
router.get('/', (req, res) => {
  const pages = db.prepare('SELECT id, title, slug, is_published, updated_at FROM pages').all();
  res.json({ pages });
});

// GET /api/pages/:slug
router.get('/:slug', (req, res) => {
  const page = db.prepare('SELECT * FROM pages WHERE slug = ? AND is_published = 1').get(req.params.slug);
  if (!page) return res.status(404).json({ error: 'Page not found' });
  res.json({ page });
});

// POST /api/pages — admin
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { title, slug, content, is_published } = req.body;
  if (!title || !slug) return res.status(400).json({ error: 'Title and slug are required' });

  const sanitized = sanitizeHTML(content || '');
  try {
    const result = db.prepare(
      'INSERT INTO pages (title, slug, content, is_published) VALUES (?, ?, ?, ?)'
    ).run(title.trim(), slug.trim().toLowerCase(), sanitized, is_published === false ? 0 : 1);
    const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ page });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Slug already exists' });
    throw e;
  }
});

// PUT /api/pages/:slug — admin update
router.put('/:slug', authenticate, requireAdmin, (req, res) => {
  const page = db.prepare('SELECT * FROM pages WHERE slug = ?').get(req.params.slug);
  if (!page) return res.status(404).json({ error: 'Page not found' });

  const { title, content, is_published } = req.body;
  const sanitized = sanitizeHTML(content !== undefined ? content : page.content);

  db.prepare(
    "UPDATE pages SET title=?, content=?, is_published=?, updated_at=CURRENT_TIMESTAMP WHERE slug=?"
  ).run(
    title || page.title,
    sanitized,
    is_published !== undefined ? (is_published ? 1 : 0) : page.is_published,
    req.params.slug
  );

  const updated = db.prepare('SELECT * FROM pages WHERE slug = ?').get(req.params.slug);
  res.json({ page: updated });
});

// DELETE /api/pages/:slug — admin
router.delete('/:slug', authenticate, requireAdmin, (req, res) => {
  const page = db.prepare('SELECT id FROM pages WHERE slug = ?').get(req.params.slug);
  if (!page) return res.status(404).json({ error: 'Page not found' });
  db.prepare('DELETE FROM pages WHERE slug = ?').run(req.params.slug);
  res.json({ message: 'Page deleted' });
});

module.exports = router;
