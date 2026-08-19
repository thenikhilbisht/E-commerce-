import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { productsAPI, categoriesAPI } from '../../services/api';
import StorefrontLayout from '../../components/StorefrontLayout';
import ProductImage from '../../components/ProductImage';
import QuickViewModal from '../../components/QuickViewModal';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';

function WishlistBtn({ product }) {
  const { toggleWishlist, isWishlisted } = useWishlist();
  const active = isWishlisted(product.id);
  return (
    <button
      className={`product-card__wishlist${active ? ' active' : ''}`}
      onClick={e => {
        e.stopPropagation();
        toggleWishlist(product);
      }}
      aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
      title={active ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </button>
  );
}

function ProductCard({ product, onQuickView }) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const discountPct = product.compare_price && product.compare_price > product.price
    ? Math.round((1 - product.price / product.compare_price) * 100)
    : null;

  const mainImage = product.images?.[0] || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80';
  const secondaryImage = product.images?.[1] || null;

  return (
    <article
      className="product-card"
      onClick={() => navigate(`/product/${product.id}`)}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && navigate(`/product/${product.id}`)}
      aria-label={`${product.title}, ₹${product.price}`}
    >
      <div className="product-card__image-wrap">
        <ProductImage
          src={mainImage}
          secondarySrc={secondaryImage}
          alt={product.title}
          aspectRatio="4/5"
        />

        {discountPct && <span className="product-card__badge">{discountPct}% OFF</span>}
        <WishlistBtn product={product} />

        {/* Hover Quick Actions */}
        <div className="product-card__quick-add" style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem' }}
            onClick={e => {
              e.stopPropagation();
              onQuickView(product);
            }}
          >
            Quick View
          </button>
          <button
            className="btn btn-primary btn-sm"
            style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem' }}
            onClick={e => {
              e.stopPropagation();
              addItem(product, 1);
            }}
            aria-label={`Add ${product.title} to cart`}
          >
            Add to Cart
          </button>
        </div>
      </div>

      <div className="product-card__body">
        {product.category_name && <div className="product-card__category">{product.category_name}</div>}
        <h3 className="product-card__title">{product.title}</h3>

        {/* Rating Display */}
        <div className="rating-stars" style={{ marginBottom: '6px' }}>
          <span>★</span>
          <span>4.8</span>
          <span style={{ color: 'var(--color-text-3)', fontWeight: 400, fontSize: '0.75rem' }}>(124)</span>
        </div>

        <div className="product-card__prices">
          <span className="product-card__price">₹{product.price.toLocaleString('en-IN')}</span>
          {product.compare_price && (
            <span className="product-card__compare">₹{product.compare_price.toLocaleString('en-IN')}</span>
          )}
          {discountPct && <span className="product-card__discount">{discountPct}% off</span>}
        </div>
      </div>
    </article>
  );
}

const PRICE_RANGES = [
  { label: 'All Prices', min: '', max: '' },
  { label: 'Under ₹500', min: '', max: '500' },
  { label: '₹500 – ₹999', min: '500', max: '999' },
  { label: '₹1000 – ₹2000', min: '1000', max: '2000' },
  { label: 'Over ₹2000', min: '2000', max: '' },
];

export default function CategoryPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const LIMIT = 12;

  const search = searchParams.get('search') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const categoryFilter = slug === 'all' ? '' : slug;

  const fetchProducts = useCallback(() => {
    setLoading(true);
    const params = {
      limit: LIMIT,
      page,
      ...(categoryFilter && { category: categoryFilter }),
      ...(search && { search }),
      ...(minPrice && { minPrice }),
      ...(maxPrice && { maxPrice }),
    };
    productsAPI.list(params)
      .then(res => {
        setProducts(res.data.products || []);
        setTotal(res.data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [categoryFilter, search, minPrice, maxPrice, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { categoriesAPI.list().then(r => setCategories(r.data.categories || [])); }, []);
  useEffect(() => { setPage(1); }, [slug, search, minPrice, maxPrice]);

  useEffect(() => {
    const catName = categories.find(c => c.slug === slug)?.name || (slug === 'all' ? 'All Products' : slug);
    document.title = `${catName} — ShopIndia`;
  }, [slug, categories]);

  const setPriceRange = ({ min, max }) => {
    const next = new URLSearchParams(searchParams);
    if (min) next.set('minPrice', min); else next.delete('minPrice');
    if (max) next.set('maxPrice', max); else next.delete('maxPrice');
    setSearchParams(next);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const totalPages = Math.ceil(total / LIMIT);
  const heading = slug === 'all'
    ? (search ? `Search results for "${search}"` : 'All Products')
    : (categories.find(c => c.slug === slug)?.name || slug);

  return (
    <StorefrontLayout>
      <div className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-12)' }}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ fontSize: '0.85rem', color: 'var(--color-text-3)', marginBottom: 'var(--space-6)' }}>
          <Link to="/" style={{ color: 'var(--color-text-2)' }}>Home</Link> / <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{heading}</span>
        </nav>

        {/* Page Heading & Filters Header */}
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800 }}>{heading}</h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-2)', marginTop: '4px' }}>
              Showing {total} product{total === 1 ? '' : 's'}
            </p>
          </div>

          {/* Category Quick Pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Link to="/category/all" className={`btn btn-sm ${slug === 'all' ? 'btn-primary' : 'btn-ghost'}`}>All</Link>
            {categories.map(c => (
              <Link key={c.id} to={`/category/${c.slug}`} className={`btn btn-sm ${slug === c.slug ? 'btn-primary' : 'btn-ghost'}`}>
                {c.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center', background: 'var(--color-surface-2)', padding: '12px 16px', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-8)' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-2)' }}>Filter by Price:</span>
          {PRICE_RANGES.map(r => (
            <button
              key={r.label}
              className={`btn btn-sm ${minPrice === r.min && maxPrice === r.max ? 'btn-accent' : 'btn-ghost'}`}
              onClick={() => setPriceRange(r)}
              style={{ background: minPrice === r.min && maxPrice === r.max ? 'var(--color-accent)' : 'white' }}
            >
              {r.label}
            </button>
          ))}
          {(minPrice || maxPrice || search) && (
            <button className="btn btn-sm btn-ghost" onClick={clearFilters} style={{ marginLeft: 'auto', color: 'var(--color-error)' }}>
              ✕ Clear Filters
            </button>
          )}
        </div>

        {/* Products Grid */}
        <div>
          {loading ? (
            <div className="product-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="product-card" style={{ pointerEvents: 'none' }}>
                  <div style={{ aspectRatio: '4/5', position: 'relative' }}>
                    <div className="skeleton-shimmer" style={{ width: '100%', height: '100%' }} />
                  </div>
                  <div className="product-card__body">
                    <div className="skeleton-shimmer" style={{ height: 16, width: '80%', marginBottom: 8, borderRadius: 4 }} />
                    <div className="skeleton-shimmer" style={{ height: 16, width: '40%', borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-16) 0', textAlign: 'center' }}>
              <h2 className="empty-state__title" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>No products match your criteria</h2>
              <p className="empty-state__text" style={{ color: 'var(--color-text-2)', marginBottom: '24px' }}>Try selecting a different price range or clearing search filters.</p>
              <button onClick={clearFilters} className="btn btn-primary">Clear All Filters</button>
            </div>
          ) : (
            <div className="product-grid">
              {products.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onQuickView={prod => setQuickViewProduct(prod)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: 'var(--space-12)' }}>
              <button className="pagination__btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`pagination__btn${page === p ? ' active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button className="pagination__btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          )}
        </div>
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </StorefrontLayout>
  );
}
