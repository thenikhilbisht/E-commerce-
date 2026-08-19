const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'shop.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency and crash safety
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ─────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'customer',
    reset_token TEXT,
    reset_token_expires DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration for existing databases
try { db.exec("ALTER TABLE users ADD COLUMN reset_token TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN reset_token_expires DATETIME"); } catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    image_url TEXT,
    display_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    compare_price REAL,
    sizes TEXT DEFAULT '[]',
    images TEXT DEFAULT '[]',
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    stock INTEGER DEFAULT 0,
    is_published INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    guest_email TEXT,
    items TEXT NOT NULL,
    subtotal REAL NOT NULL,
    shipping_total REAL DEFAULT 0,
    total REAL NOT NULL,
    shipping_address TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    payment_id TEXT,
    razorpay_order_id TEXT,
    status TEXT DEFAULT 'confirmed',
    order_status TEXT DEFAULT 'confirmed',
    payment_status TEXT DEFAULT 'pending',
    status_history TEXT DEFAULT '[]',
    tracking_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration for orders table
try { db.exec("ALTER TABLE orders ADD COLUMN order_status TEXT DEFAULT 'confirmed'"); } catch (e) {}
try { db.exec("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending'"); } catch (e) {}
try { db.exec("ALTER TABLE orders ADD COLUMN status_history TEXT DEFAULT '[]'"); } catch (e) {}
try { db.exec("ALTER TABLE orders ADD COLUMN tracking_number TEXT"); } catch (e) {}

db.exec(`


  CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT DEFAULT '',
    is_published INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// ─── Seed Data ───────────────────────────────────────────────────────────────

function seedIfEmpty() {
  // Seed settings
  const settingCount = db.prepare('SELECT COUNT(*) as cnt FROM settings').get();
  if (settingCount.cnt === 0) {
    const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    const seedSettings = [
      ['site_name', 'ShopIndia'],
      ['contact_email', 'hello@shopindia.com'],
      ['contact_phone', '+91 98765 43210'],
      ['whatsapp_number', '919876543210'],
      ['instagram_url', 'https://instagram.com/shopindia'],
      ['facebook_url', 'https://facebook.com/shopindia'],
      ['twitter_url', ''],
      ['razorpay_key_id', process.env.RAZORPAY_KEY_ID || ''],
      ['razorpay_key_secret', process.env.RAZORPAY_KEY_SECRET || ''],
      ['cod_enabled', 'true'],
      ['announcement_bar_text', '✨ Free shipping on all prepaid orders above ₹999! Use code FREESHIP'],
      ['announcement_bar_enabled', 'true'],
      ['logo_url', ''],
      ['navigation_links', JSON.stringify([
        { label: 'All Products', url: '/category/all' },
        { label: 'Kurtas', url: '/category/kurtas' },
        { label: 'T-Shirts', url: '/category/t-shirts' },
        { label: 'Dresses', url: '/category/dresses' },
        { label: 'Accessories', url: '/category/accessories' }
      ])],
      ['hero_title', 'Style That Speaks Indian'],
      ['hero_subtitle', 'Curated luxury ethnic & contemporary fashion, designed for modern elegance.'],
      ['hero_image_url', 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1200&q=80'],
      ['shipping_free_above', '999'],
      ['shipping_flat_fee', '99'],
    ];
    const insertMany = db.transaction((rows) => {
      for (const row of rows) insertSetting.run(...row);
    });
    insertMany(seedSettings);
  } else {
    // Ensure hero image is populated if empty
    const heroSetting = db.prepare("SELECT value FROM settings WHERE key = 'hero_image_url'").get();
    if (!heroSetting || !heroSetting.value) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('hero_image_url', ?)").run(
        'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1200&q=80'
      );
    }
  }

  // Seed & update admin user
  const bcrypt = require('bcryptjs');
  const adminPassword = 'AdminNikhil123@';
  const adminHash = bcrypt.hashSync(adminPassword, 10);
  const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin' OR email = 'admin@shopindia.com'").get();

  if (!adminExists) {
    db.prepare(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')"
    ).run('Admin', 'admin@shopindia.com', adminHash);
  } else {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(adminHash, adminExists.id);
  }

  // Seed categories
  const catCount = db.prepare('SELECT COUNT(*) as cnt FROM categories').get();
  if (catCount.cnt === 0) {
    const insertCat = db.prepare(
      'INSERT INTO categories (name, slug, image_url, display_order) VALUES (?, ?, ?, ?)'
    );
    const cats = db.transaction(() => {
      insertCat.run('Kurtas', 'kurtas', 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80', 1);
      insertCat.run('T-Shirts', 't-shirts', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80', 2);
      insertCat.run('Dresses', 'dresses', 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=1000&q=80', 3);
      insertCat.run('Accessories', 'accessories', 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1000&q=80', 4);
    });
    cats();
  } else {
    // Update existing categories with realistic images if missing
    db.prepare("UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80' WHERE slug = 'kurtas' AND (image_url IS NULL OR image_url = '')").run();
    db.prepare("UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80' WHERE slug = 't-shirts' AND (image_url IS NULL OR image_url = '')").run();
    db.prepare("UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=1000&q=80' WHERE slug = 'dresses' AND (image_url IS NULL OR image_url = '')").run();
    db.prepare("UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1000&q=80' WHERE slug = 'accessories' AND (image_url IS NULL OR image_url = '')").run();
  }

  // Seed products
  const prodCount = db.prepare('SELECT COUNT(*) as cnt FROM products').get();
  if (prodCount.cnt === 0) {
    const kurta = db.prepare("SELECT id FROM categories WHERE slug = 'kurtas'").get();
    const tshirt = db.prepare("SELECT id FROM categories WHERE slug = 't-shirts'").get();
    const dress = db.prepare("SELECT id FROM categories WHERE slug = 'dresses'").get();
    const accessory = db.prepare("SELECT id FROM categories WHERE slug = 'accessories'").get();

    const insertProd = db.prepare(`
      INSERT INTO products (title, slug, description, price, compare_price, sizes, images, category_id, stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const products = db.transaction(() => {
      insertProd.run(
        'Classic White Kurta',
        'classic-white-kurta',
        '<p>A timeless white kurta crafted from breathable 100% fine cotton. Features delicate hand-chikan embroidery around the neckline and side vents for ultimate summer comfort.</p><ul><li>100% premium long-staple cotton</li><li>Mandarin collar with subtle mother-of-pearl buttons</li><li>Machine washable / Gentle cycle</li><li>Regular fit</li></ul>',
        999, 1499, '["S","M","L","XL","XXL"]',
        JSON.stringify([
          'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=80'
        ]),
        kurta?.id || null, 50
      );
      insertProd.run(
        'Indigo Block Printed Kurta',
        'indigo-printed-kurta',
        '<p>Beautiful artisanal indigo blue kurta handcrafted using authentic Bagru block printing techniques. Designed for festive celebrations and elegant daywear.</p><ul><li>Cotton-silk breathable weave</li><li>Rich natural indigo dyes</li><li>Dry clean recommended</li><li>Slim contemporary fit</li></ul>',
        1299, 1999, '["S","M","L","XL"]',
        JSON.stringify([
          'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1583391733975-01e4ec90d56b?auto=format&fit=crop&w=1000&q=80'
        ]),
        kurta?.id || null, 30
      );
      insertProd.run(
        'Heritage Graphic Crew T-Shirt',
        'heritage-graphic-tshirt',
        '<p>Heavyweight 220 GSM organic cotton t-shirt with screen-printed heritage typography. Built for maximum comfort and streetwear styling.</p><ul><li>220 GSM combed cotton</li><li>Pre-shrunk fabric</li><li>Ribbed neckband</li><li>Unisex relaxed fit</li></ul>',
        599, 899, '["XS","S","M","L","XL"]',
        JSON.stringify([
          'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=80'
        ]),
        tshirt?.id || null, 100
      );
      insertProd.run(
        'Floral Botanical Sundress',
        'floral-sundress',
        '<p>Lightweight and breezy floral print dress styled with a sweetheart neckline and tiered flare bottom. Ideal for sunny outings and coastal getaways.</p><ul><li>Premium Rayon-viscose fabric</li><li>Adjustable tie-shoulder straps</li><li>Concealed side zipper</li><li>A-line silhouette</li></ul>',
        1499, 2199, '["XS","S","M","L"]',
        JSON.stringify([
          'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1000&q=80'
        ]),
        dress?.id || null, 25
      );
      insertProd.run(
        'Embroidered Mandarin Collar Kurta',
        'mandarin-collar-kurta',
        '<p>Modern mandarin collar linen kurta featuring delicate tonal embroidery on chest placket. Versatile ethnic wear for weddings and formal events.</p><ul><li>Pure linen blend</li><li>Functional side pockets</li><li>Dry clean recommended</li><li>Structured tailored fit</li></ul>',
        1599, 2399, '["S","M","L","XL","XXL"]',
        JSON.stringify([
          'https://images.unsplash.com/photo-1597983073493-88cd35cf06b0?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80'
        ]),
        kurta?.id || null, 40
      );
      insertProd.run(
        'Vintage Acid Washed T-Shirt',
        'vintage-washed-tshirt',
        '<p>Soft garment-dyed cotton tee with authentic acid wash finish. Provides a comfortable broken-in look with durable stitching.</p><ul><li>100% vintage washed cotton</li><li>Reinforced shoulder seams</li><li>Relaxed everyday fit</li></ul>',
        699, 999, '["S","M","L","XL"]',
        JSON.stringify([
          'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1527719327859-c6ce80353573?auto=format&fit=crop&w=1000&q=80'
        ]),
        tshirt?.id || null, 80
      );
      insertProd.run(
        'Handcrafted Genuine Leather Belt',
        'handcrafted-leather-belt',
        '<p>Full-grain genuine leather belt with antique brass buckle. Meticulously burnished edge detailing for long-lasting sophistication.</p><ul><li>100% full-grain leather</li><li>Solid brass buckle</li><li>38mm width</li><li>Handcrafted finish</li></ul>',
        899, 1299, '["30","32","34","36","38"]',
        JSON.stringify([
          'https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=80'
        ]),
        accessory?.id || null, 60
      );
      insertProd.run(
        'Classic Polarized Aviator Sunglasses',
        'classic-aviator-sunglasses',
        '<p>Timeless aviator frame engineered with UV400 polarized lenses for crystal-clear vision and maximum sun protection.</p><ul><li>Lightweight metal alloy frame</li><li>UV400 polarized anti-glare protection</li><li>Includes hard protective leatherette case</li></ul>',
        1199, 1799, '["Free Size"]',
        JSON.stringify([
          'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=1000&q=80'
        ]),
        accessory?.id || null, 45
      );
    });
    products();
  }

  // Auto-migrate existing products if their images are empty array [] or invalid
  const allProds = db.prepare('SELECT id, slug, images FROM products').all();
  for (const p of allProds) {
    let imgArr = [];
    try { imgArr = JSON.parse(p.images || '[]'); } catch (e) { imgArr = []; }
    if (!Array.isArray(imgArr) || imgArr.length === 0) {
      let defaultImgs = [
        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=80'
      ];
      const slug = p.slug || '';
      if (slug.includes('tshirt') || slug.includes('t-shirt') || slug.includes('tee')) {
        defaultImgs = [
          'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=80'
        ];
      } else if (slug.includes('dress') || slug.includes('gown')) {
        defaultImgs = [
          'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1000&q=80'
        ];
      } else if (slug.includes('belt') || slug.includes('glass') || slug.includes('accessory')) {
        defaultImgs = [
          'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1000&q=80'
        ];
      }
      db.prepare('UPDATE products SET images = ? WHERE id = ?').run(JSON.stringify(defaultImgs), p.id);
    }
  }

  // Seed static pages
  const pageCount = db.prepare('SELECT COUNT(*) as cnt FROM pages').get();
  if (pageCount.cnt === 0) {
    const insertPage = db.prepare(
      'INSERT INTO pages (title, slug, content) VALUES (?, ?, ?)'
    );
    const pages = db.transaction(() => {
      insertPage.run(
        'Privacy Policy',
        'privacy-policy',
        '<h2>Privacy Policy</h2><p>At ShopIndia, we take your privacy seriously. This policy describes how we collect, use, and protect your personal information.</p><h3>Information We Collect</h3><p>We collect information you provide directly to us, such as your name, email address, phone number, and shipping address when you place an order.</p><h3>How We Use Your Information</h3><p>We use your information to process orders, communicate with you about your orders, and improve our services.</p><h3>Contact Us</h3><p>If you have questions about this policy, email us at hello@shopindia.com or WhatsApp us at +91 98765 43210.</p>'
      );
      insertPage.run(
        'Terms & Conditions',
        'terms-conditions',
        '<h2>Terms & Conditions</h2><p>By using ShopIndia, you agree to these terms and conditions. Please read them carefully.</p><h3>Orders & Payment</h3><p>All orders are subject to product availability. We reserve the right to refuse or cancel orders at our discretion.</p><h3>Shipping & Delivery</h3><p>We process orders within 1-2 business days. Delivery typically takes 5-7 business days depending on your location.</p><h3>Returns & Refunds</h3><p>We accept returns within 7 days of delivery for unused items in original condition. Contact us to initiate a return.</p>'
      );
      insertPage.run(
        'Return Policy',
        'return-policy',
        '<h2>Return Policy</h2><p>We want you to love every purchase. If you\'re not completely satisfied, we\'re here to help.</p><h3>Return Window</h3><p>You have 7 days from the date of delivery to return an item.</p><h3>Eligibility</h3><ul><li>Items must be unused and in original condition</li><li>Tags must be intact</li><li>Items must be in original packaging</li></ul><h3>How to Return</h3><p>Contact us via WhatsApp at +91 98765 43210 with your order number and reason for return.</p><h3>Refund Timeline</h3><p>Refunds are processed within 5-7 business days after we receive the returned item.</p>'
      );
      insertPage.run(
        'Shipping Policy',
        'shipping-policy',
        '<h2>Shipping Policy</h2><p>We offer shipping across India.</p><h3>Processing Time</h3><p>Orders are processed within 1-2 business days (Monday-Saturday).</p><h3>Shipping Rates</h3><ul><li>Free shipping on orders above ₹999</li><li>Flat ₹99 shipping fee for orders below ₹999</li></ul><h3>Delivery Time</h3><p>5-7 business days for most locations. Remote areas may take up to 10 business days.</p><h3>Tracking</h3><p>You will receive a tracking link via WhatsApp/email once your order is shipped.</p>'
      );
    });
    pages();
  }
}

seedIfEmpty();

module.exports = db;
