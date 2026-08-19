const axios = require('axios');

// Curated high quality royalty-free fashion photography fallbacks mapped by keyword
const CURATED_IMAGES = {
  kurta: [
    'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1583391733975-01e4ec90d56b?auto=format&fit=crop&w=1000&q=80',
  ],
  tshirt: [
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1527719327859-c6ce80353573?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=1000&q=80',
  ],
  dress: [
    'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=80',
  ],
  accessory: [
    'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=1000&q=80',
  ]
};

/**
 * Fetch dynamic images for a search query using Unsplash API if UNSPLASH_ACCESS_KEY is provided,
 * or return high-quality curated fashion images as fallback.
 */
async function fetchProductImages(query, count = 2) {
  const apiKey = process.env.UNSPLASH_ACCESS_KEY;
  if (apiKey) {
    try {
      const response = await axios.get('https://api.unsplash.com/search/photos', {
        params: { query, per_page: count, orientation: 'portrait' },
        headers: { Authorization: `Client-ID ${apiKey}` },
        timeout: 4000
      });
      if (response.data?.results?.length > 0) {
        return response.data.results.map(item => item.urls.regular);
      }
    } catch (err) {
      console.warn('Unsplash API fetch failed or key invalid, using curated fallback images:', err.message);
    }
  }

  // Fallback matching
  const q = (query || '').toLowerCase();
  let key = 'kurta';
  if (q.includes('tshirt') || q.includes('t-shirt') || q.includes('tee')) key = 'tshirt';
  else if (q.includes('dress') || q.includes('sundress') || q.includes('gown')) key = 'dress';
  else if (q.includes('accessory') || q.includes('belt') || q.includes('glass') || q.includes('jewel')) key = 'accessory';

  const list = CURATED_IMAGES[key];
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push(list[i % list.length]);
  }
  return results;
}

module.exports = {
  fetchProductImages,
  CURATED_IMAGES
};
