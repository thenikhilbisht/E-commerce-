const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// POST /api/upload — generic image upload (admin only)
router.post('/', authenticate, requireAdmin, upload.array('files', 10), (req, res) => {
  if (!req.files || req.files.length === 0)
    return res.status(400).json({ error: 'No files uploaded' });

  const urls = req.files.map(f => `/uploads/${f.filename}`);
  res.json({ urls });
});

module.exports = router;
