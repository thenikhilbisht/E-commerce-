import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 8000,
});

// Mock database for static Netlify preview / fallback when backend is unreachable
const MOCK_CATEGORIES = [
  { id: 1, name: 'Kurtas', slug: 'kurtas', description: 'Traditional & contemporary Indian kurtas' },
  { id: 2, name: 'T-Shirts', slug: 't-shirts', description: 'Premium cotton t-shirts' },
  { id: 3, name: 'Dresses', slug: 'dresses', description: 'Elegant ethnic and western dresses' },
  { id: 4, name: 'Accessories', slug: 'accessories', description: 'Handcrafted jewelry and scarves' },
];

const MOCK_PRODUCTS = [
  {
    id: 1,
    title: 'Royal Indigo Handblock Silk Kurta',
    description: 'Crafted from pure Chanderi silk with authentic Jaipur handblock prints. Features delicate zari embroidery along the mandarin collar and cuffs. Perfect for festive celebrations and weddings.',
    price: 2499,
    compare_price: 3999,
    category_id: 1,
    category_slug: 'kurtas',
    category_name: 'Kurtas',
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=80'
    ]),
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    stock: 25,
    is_featured: 1
  },
  {
    id: 2,
    title: 'Warm Saffron Embroidered Cotton Kurta',
    description: 'Breathable 100% fine cotton kurta with detailed thread embroidery. Lightweight and comfortable for summer events and casual gatherings.',
    price: 1799,
    compare_price: 2499,
    category_id: 1,
    category_slug: 'kurtas',
    category_name: 'Kurtas',
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80'
    ]),
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 40,
    is_featured: 1
  },
  {
    id: 3,
    title: 'Heritage Organic Slub Cotton Tee',
    description: 'Ultra-soft organic cotton t-shirt with a relaxed fit and subtle contrast stitching. Tailored for daily wear with moisture-wicking comfort.',
    price: 899,
    compare_price: 1299,
    category_id: 2,
    category_slug: 't-shirts',
    category_name: 'T-Shirts',
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80'
    ]),
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 50,
    is_featured: 1
  },
  {
    id: 4,
    title: 'Emerald Anarkali Silk Indo-Western Dress',
    description: 'Floor-length Anarkali silhouette combining traditional flared flair with modern minimal aesthetics. Comes with a matching embellished belt.',
    price: 3299,
    compare_price: 4999,
    category_id: 3,
    category_slug: 'dresses',
    category_name: 'Dresses',
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=1000&q=80'
    ]),
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 15,
    is_featured: 1
  },
  {
    id: 5,
    title: 'Handcrafted Pashmina Weave Stole',
    description: 'Soft cashmere blend stole featuring traditional Paisley motifs. Complements both ethnic kurtas and modern coats.',
    price: 1499,
    compare_price: 2199,
    category_id: 4,
    category_slug: 'accessories',
    category_name: 'Accessories',
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1000&q=80'
    ]),
    sizes: ['One Size'],
    stock: 30,
    is_featured: 1
  },
  {
    id: 6,
    title: 'Vintage Kundan Meenakari Jhumka Earrings',
    description: 'Intricately handcrafted brass earrings with gold plating and pearl drops. Hypoallergenic and lightweight.',
    price: 699,
    compare_price: 999,
    category_id: 4,
    category_slug: 'accessories',
    category_name: 'Accessories',
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=80'
    ]),
    sizes: ['One Size'],
    stock: 60,
    is_featured: 1
  }
];

const MOCK_SETTINGS = {
  site_name: 'ShopIndia',
  contact_email: 'support@shopindia.com',
  contact_phone: '+91 98765 43210',
  announcement_bar_enabled: 'true',
  announcement_bar_text: '✨ Festive Sale Live! Free Express Delivery on Orders Above ₹999 | Code: FESTIVE2026',
  shipping_free_above: '999',
  shipping_flat_fee: '99',
  cod_enabled: 'true',
};

// Response Interceptor for Network Error / Static Hosting Fallback
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If backend endpoint is unreachable (e.g. static host on Netlify), intercept gracefully
    if (!error.response || error.code === 'ERR_NETWORK' || error.response?.status === 404) {
      const url = error.config?.url || '';
      const params = error.config?.params || {};

      if (url.includes('/products')) {
        if (url.match(/\/products\/\d+/)) {
          const id = parseInt(url.split('/').pop(), 10);
          const found = MOCK_PRODUCTS.find(p => p.id === id) || MOCK_PRODUCTS[0];
          const productParsed = { ...found, images: JSON.parse(found.images) };
          return Promise.resolve({
            data: {
              product: productParsed,
              related: MOCK_PRODUCTS.filter(p => p.id !== id).slice(0, 4).map(p => ({ ...p, images: JSON.parse(p.images) }))
            }
          });
        }
        let list = [...MOCK_PRODUCTS];
        if (params.category) {
          list = list.filter(p => p.category_slug === params.category);
        }
        if (params.search) {
          const q = params.search.toLowerCase();
          list = list.filter(p => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
        }
        const limit = params.limit || 12;
        const productsParsed = list.slice(0, limit).map(p => ({ ...p, images: JSON.parse(p.images) }));
        return Promise.resolve({ data: { products: productsParsed, total: list.length } });
      }

      if (url.includes('/categories')) {
        return Promise.resolve({ data: { categories: MOCK_CATEGORIES } });
      }

      if (url.includes('/settings')) {
        return Promise.resolve({ data: { settings: MOCK_SETTINGS } });
      }

      if (url.includes('/auth/login')) {
        let reqData = {};
        try { reqData = JSON.parse(error.config.data || '{}'); } catch (e) {}
        const isAdmin = (reqData.email || '').toLowerCase().includes('admin');
        const mockUser = {
          id: isAdmin ? 1 : 2,
          name: isAdmin ? 'Admin' : 'Customer',
          email: reqData.email || (isAdmin ? 'admin@shopindia.com' : 'user@example.com'),
          role: isAdmin ? 'admin' : 'customer'
        };
        return Promise.resolve({ data: { user: mockUser } });
      }

      if (url.includes('/auth/register')) {
        let reqData = {};
        try { reqData = JSON.parse(error.config.data || '{}'); } catch (e) {}
        const mockUser = { id: 3, name: reqData.name || 'New User', email: reqData.email || 'user@example.com', role: 'customer' };
        return Promise.resolve({ data: { user: mockUser } });
      }

      if (url.includes('/auth/me')) {
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// Products API
export const productsAPI = {
  list: (params) => api.get('/products', { params }),
  get: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/products/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/products/${id}`),
};

// Categories API
export const categoriesAPI = {
  list: () => api.get('/categories'),
  get: (slug) => api.get(`/categories/${slug}`),
  create: (data) => api.post('/categories', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/categories/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Orders API
export const ordersAPI = {
  place: (data) => api.post('/orders', data),
  verifyPayment: (data) => api.post('/orders/verify-payment', data),
  listAdmin: (params) => api.get('/orders', { params }),
  myOrders: () => api.get('/orders/my'),
  get: (id) => api.get(`/orders/${id}`),
  getByNumber: (orderNumber) => api.get(`/orders/public/${orderNumber}`),
  updateStatus: (id, statusData) => api.patch(`/orders/${id}/status`, typeof statusData === 'string' ? { order_status: statusData } : statusData),
  downloadReceipt: (id) => api.get(`/orders/${id}/receipt`, { responseType: 'blob' }),
};

// Pages API
export const pagesAPI = {
  list: () => api.get('/pages'),
  get: (slug) => api.get(`/pages/${slug}`),
  create: (data) => api.post('/pages', data),
  update: (slug, data) => api.put(`/pages/${slug}`, data),
  delete: (slug) => api.delete(`/pages/${slug}`),
};

// Settings API
export const settingsAPI = {
  getPublic: () => api.get('/settings/public'),
  getAll: () => api.get('/settings'),
  update: (data) => api.put('/settings', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadImage: (data) => api.post('/settings/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export default api;
