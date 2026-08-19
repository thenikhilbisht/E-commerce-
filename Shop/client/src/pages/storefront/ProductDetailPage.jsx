import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { productsAPI } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '../../context/ToastContext';
import StorefrontLayout from '../../components/StorefrontLayout';
import ProductImage from '../../components/ProductImage';

function ImageGallery({ images, title }) {
  const [selected, setSelected] = useState(0);

  const galleryImages = images && images.length > 0
    ? images
    : ['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80'];

  return (
    <div className="image-gallery">
      <div className="image-gallery__main" style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <ProductImage
          src={galleryImages[selected]}
          alt={title}
          aspectRatio="4/5"
        />
      </div>

      {galleryImages.length > 1 && (
        <div className="image-gallery__thumbs" style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          {galleryImages.map((img, i) => (
            <button
              key={i}
              className={`image-gallery__thumb${selected === i ? ' active' : ''}`}
              onClick={() => setSelected(i)}
              aria-label={`View image ${i + 1}`}
              style={{
                width: '72px',
                height: '90px',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: selected === i ? '2px solid var(--color-primary)' : '2px solid transparent',
                padding: 0,
                cursor: 'pointer',
                transition: 'border-color 0.2s ease'
              }}
            >
              <img src={img} alt={`${title} view ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { toggleWishlist, isWishlisted } = useWishlist();
  const toast = useToast();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('');
  const [sizeError, setSizeError] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [activeTab, setActiveTab] = useState('description');

  useEffect(() => {
    setLoading(true);
    setSelectedSize('');
    productsAPI.get(id)
      .then(res => {
        setProduct(res.data.product);
        setRelated(res.data.related || []);
        document.title = `${res.data.product.title} — ShopIndia`;
      })
      .catch(() => navigate('/category/all'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleAddToCart = (buyNow = false) => {
    if (product.sizes?.length > 0 && !selectedSize) {
      setSizeError(true);
      return;
    }
    setSizeError(false);
    setAddingToCart(true);
    addItem(product, selectedSize || null);
    toast.success('Added to cart!');
    setAddingToCart(false);
    if (buyNow) navigate('/checkout');
  };

  if (loading) {
    return (
      <StorefrontLayout>
        <div className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-12)' }}>
          <div style={{ display: 'grid', gap: 'var(--space-8)', gridTemplateColumns: '1fr 1fr' }}>
            <div className="skeleton-shimmer" style={{ aspectRatio: '4/5', borderRadius: 'var(--radius-xl)' }} />
            <div>
              <div className="skeleton-shimmer" style={{ height: 36, width: '75%', marginBottom: 16, borderRadius: 6 }} />
              <div className="skeleton-shimmer" style={{ height: 32, width: '35%', marginBottom: 24, borderRadius: 6 }} />
              <div className="skeleton-shimmer" style={{ height: 16, width: '100%', marginBottom: 12, borderRadius: 4 }} />
              <div className="skeleton-shimmer" style={{ height: 16, width: '85%', marginBottom: 12, borderRadius: 4 }} />
            </div>
          </div>
        </div>
      </StorefrontLayout>
    );
  }

  if (!product) return null;

  const discountPct = product.compare_price && product.compare_price > product.price
    ? Math.round((1 - product.price / product.compare_price) * 100)
    : null;

  const wishlisted = isWishlisted(product.id);

  return (
    <StorefrontLayout>
      <div className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-12)' }}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ fontSize: '0.85rem', color: 'var(--color-text-3)', marginBottom: 'var(--space-6)' }}>
          <Link to="/" style={{ color: 'var(--color-text-2)' }}>Home</Link> / <Link to={`/category/${product.category_slug || 'all'}`} style={{ color: 'var(--color-text-2)' }}>{product.category_name || 'Products'}</Link> / <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{product.title}</span>
        </nav>

        {/* PDP Main Layout Grid */}
        <div className="pdp-grid" style={{ display: 'grid', gap: 'var(--space-10)', gridTemplateColumns: '1fr' }}>
          <div style={{ display: 'grid', gap: 'var(--space-10)' }} className="pdp-grid-wrapper">
            {/* Gallery Left */}
            <ImageGallery images={product.images} title={product.title} />

            {/* Info Right */}
            <div>
              {product.category_name && (
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-accent)', fontWeight: 700 }}>
                  {product.category_name}
                </span>
              )}
              <h1 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 800, marginTop: '4px', marginBottom: 'var(--space-3)' }}>
                {product.title}
              </h1>

              {/* Rating & Stock */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: 'var(--space-5)' }}>
                <div className="rating-stars">
                  <span>★</span><span>4.8</span>
                  <span style={{ color: 'var(--color-text-3)', fontWeight: 400, fontSize: '0.8rem' }}>(124 reviews)</span>
                </div>
                <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ✓ In Stock
                </span>
              </div>

              {/* Price Block */}
              <div className="price-display" style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: 'var(--space-6)', padding: '16px 20px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)' }}>
                <span className="price-display__current" style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
                {product.compare_price && (
                  <span className="price-display__compare" style={{ fontSize: '1.1rem', color: 'var(--color-text-3)', textDecoration: 'line-through' }}>
                    ₹{product.compare_price.toLocaleString('en-IN')}
                  </span>
                )}
                {discountPct && (
                  <span className="price-display__discount" style={{ background: '#fee2e2', color: 'var(--color-error)', fontWeight: 700, fontSize: '0.85rem', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>
                    SAVE {discountPct}%
                  </span>
                )}
              </div>

              {/* Size Selector */}
              {product.sizes?.length > 0 && (
                <div style={{ marginBottom: 'var(--space-6)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      Select Size {selectedSize && <span style={{ color: 'var(--color-accent)' }}>— {selectedSize}</span>}
                    </label>
                  </div>
                  <div className="size-grid" role="group" aria-label="Select size" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {product.sizes.map(size => (
                      <button
                        key={size}
                        className={`size-option${selectedSize === size ? ' selected' : ''}`}
                        onClick={() => { setSelectedSize(size); setSizeError(false); }}
                        aria-pressed={selectedSize === size}
                        aria-label={`Size ${size}`}
                        style={{
                          minWidth: '48px',
                          height: '48px',
                          padding: '0 16px',
                          borderRadius: 'var(--radius-md)',
                          border: selectedSize === size ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                          background: selectedSize === size ? 'var(--color-primary)' : 'white',
                          color: selectedSize === size ? 'white' : 'var(--color-text)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  {sizeError && (
                    <p className="form-error" style={{ marginTop: 'var(--space-2)' }}>
                      ⚠ Please select a size to proceed
                    </p>
                  )}
                </div>
              )}

              {/* Desktop CTA Buttons */}
              <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }} className="pdp-desktop-cta">
                <button
                  className={`btn btn-secondary btn-lg${addingToCart ? ' btn-loading' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => handleAddToCart(false)}
                  disabled={addingToCart}
                  id="add-to-cart-btn"
                >
                  {addingToCart ? <><span className="btn-spinner" /> Adding...</> : '🛒 Add to Cart'}
                </button>
                <button
                  className="btn btn-primary btn-lg"
                  style={{ flex: 1 }}
                  onClick={() => handleAddToCart(true)}
                  id="buy-now-btn"
                >
                  Buy Now ⚡
                </button>
                <button
                  className={`btn btn-ghost btn-lg${wishlisted ? ' active' : ''}`}
                  onClick={() => toggleWishlist(product)}
                  aria-label="Wishlist"
                  title="Save to Wishlist"
                  style={{ minWidth: '56px', padding: 0 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={wishlisted ? 'var(--color-error)' : 'none'} stroke={wishlisted ? 'var(--color-error)' : 'currentColor'} strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>
              </div>

              {/* Tabbed Info Accordion */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-6)' }}>
                <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--color-border)', marginBottom: '16px' }}>
                  {['description', 'specifications', 'shipping'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        paddingBottom: '12px',
                        borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                        color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-2)',
                        fontWeight: activeTab === tab ? 700 : 500,
                        textTransform: 'capitalize',
                        cursor: 'pointer'
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {activeTab === 'description' && product.description && (
                  <div
                    style={{ fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--color-text-2)' }}
                    dangerouslySetInnerHTML={{ __html: product.description }}
                  />
                )}

                {activeTab === 'specifications' && (
                  <ul style={{ fontSize: '0.9rem', color: 'var(--color-text-2)', display: 'grid', gap: '8px' }}>
                    <li><strong>Fabric:</strong> 100% Breathable Fine Cotton</li>
                    <li><strong>Occasion:</strong> Festive, Casual & Formal Wear</li>
                    <li><strong>Care Instructions:</strong> Machine wash cold / Gentle cycle</li>
                    <li><strong>Country of Origin:</strong> Proudly Made in India</li>
                  </ul>
                )}

                {activeTab === 'shipping' && (
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-2)', display: 'grid', gap: '8px' }}>
                    <p>🚚 <strong>Express Delivery:</strong> Delivered within 4–6 business days across India.</p>
                    <p>↩️ <strong>7-Day Returns:</strong> Easy doorstep returns and instant exchange.</p>
                    <p>💳 <strong>Prepaid & COD:</strong> Razorpay secure checkout and Cash on Delivery supported.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <section style={{ marginTop: 'var(--space-16)' }} aria-labelledby="related-heading">
            <h2 className="section-title" id="related-heading">You May Also Like</h2>
            <div className="product-grid">
              {related.map(p => (
                <article
                  key={p.id}
                  className="product-card"
                  onClick={() => navigate(`/product/${p.id}`)}
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && navigate(`/product/${p.id}`)}
                >
                  <div className="product-card__image-wrap">
                    <ProductImage
                      src={p.images?.[0] || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80'}
                      alt={p.title}
                      aspectRatio="4/5"
                    />
                  </div>
                  <div className="product-card__body">
                    <h3 className="product-card__title">{p.title}</h3>
                    <span className="product-card__price">₹{p.price.toLocaleString('en-IN')}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Sticky Mobile Add to Cart Bar */}
      <div className="sticky-atc">
        <button
          className="btn btn-secondary"
          style={{ flex: 1 }}
          onClick={() => handleAddToCart(false)}
          id="sticky-add-to-cart"
        >
          🛒 Add to Cart
        </button>
        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={() => handleAddToCart(true)}
          id="sticky-buy-now"
        >
          Buy Now ⚡
        </button>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .pdp-grid-wrapper { grid-template-columns: 1fr 1fr !important; }
          .pdp-desktop-cta { display: flex !important; }
        }
      `}</style>
    </StorefrontLayout>
  );
}
