const router = require('express').Router();
const db = require('../db/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public safe keys (not exposed to frontend)
const PRIVATE_KEYS = ['razorpay_key_secret'];

// GET /api/settings/public — storefront-safe settings
router.get('/public', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = {};
  rows.forEach(r => {
    if (!PRIVATE_KEYS.includes(r.key)) s[r.key] = r.value;
  });
  res.json({ settings: s });
});

// GET /api/settings — admin all settings (includes private)
router.get('/', authenticate, requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = {};
  rows.forEach(r => (s[r.key] = r.value));
  res.json({ settings: s });
});

// PUT /api/settings — admin bulk update
router.put('/', authenticate, requireAdmin, upload.single('logo'), (req, res) => {
  const updates = { ...req.body };

  if (req.file) {
    updates.logo_url = `/uploads/${req.file.filename}`;
  }

  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  const updateMany = db.transaction((entries) => {
    for (const [key, value] of entries) {
      upsert.run(key, value);
    }
  });

  updateMany(Object.entries(updates));
  res.json({ message: 'Settings updated' });
});

// POST /api/settings/upload — upload hero image etc
router.post('/upload', authenticate, requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

module.exports = router;
