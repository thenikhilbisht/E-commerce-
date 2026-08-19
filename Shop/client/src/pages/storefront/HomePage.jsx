import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { productsAPI, categoriesAPI } from "../../services/api";
import { useSettings } from "../../context/SettingsContext";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import StorefrontLayout from "../../components/StorefrontLayout";
import ProductImage from "../../components/ProductImage";
import QuickViewModal from "../../components/QuickViewModal";

function WishlistBtn({ product }) {
  const { toggleWishlist, isWishlisted } = useWishlist();
  const active = isWishlisted(product.id);
  return (
    <button
      className={`product-card__wishlist${active ? " active" : ""}`}
      onClick={e => {
        e.stopPropagation();
        toggleWishlist(product);
      }}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      title={active ? "Remove from wishlist" : "Add to wishlist"}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
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

  const mainImage = product.images?.[0] || "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80";
  const secondaryImage = product.images?.[1] || null;

  return (
    <article
      className="product-card"
      onClick={() => navigate(`/product/${product.id}`)}
      tabIndex={0}
      onKeyDown={e => e.key === "Enter" && navigate(`/product/${product.id}`)}
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

        {/* Quick Actions Hover Overlay */}
        <div className="product-card__quick-add" style={{ display: "flex", gap: "8px" }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ flex: 1, padding: "6px 10px", fontSize: "0.8rem" }}
            onClick={e => {
              e.stopPropagation();
              onQuickView(product);
            }}
          >
            Quick View
          </button>
          <button
            className="btn btn-primary btn-sm"
            style={{ flex: 1, padding: "6px 10px", fontSize: "0.8rem" }}
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
        <div className="rating-stars" style={{ marginBottom: "6px" }}>
          <span>★</span>
          <span>4.8</span>
          <span style={{ color: "var(--color-text-3)", fontWeight: 400, fontSize: "0.75rem" }}>(124)</span>
        </div>

        <div className="product-card__prices">
          <span className="product-card__price">₹{product.price.toLocaleString("en-IN")}</span>
          {product.compare_price && (
            <span className="product-card__compare">₹{product.compare_price.toLocaleString("en-IN")}</span>
          )}
          {discountPct && <span className="product-card__discount">{discountPct}% off</span>}
        </div>
      </div>
    </article>
  );
}

function ProductSkeleton() {
  return (
    <div className="product-card" style={{ pointerEvents: "none" }}>
      <div style={{ aspectRatio: "4/5", position: "relative" }}>
        <div className="skeleton-shimmer" style={{ width: "100%", height: "100%" }} />
      </div>
      <div className="product-card__body">
        <div className="skeleton-shimmer" style={{ height: 12, width: "50%", marginBottom: 8, borderRadius: 4 }} />
        <div className="skeleton-shimmer" style={{ height: 16, width: "80%", marginBottom: 8, borderRadius: 4 }} />
        <div className="skeleton-shimmer" style={{ height: 20, width: "40%", borderRadius: 4 }} />
      </div>
    </div>
  );
}

function CategoryCard({ cat }) {
  const fallbackCatImages = {
    kurtas: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80",
    "t-shirts": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80",
    dresses: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=1000&q=80",
    accessories: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1000&q=80",
  };

  const imageUrl = cat.image_url || fallbackCatImages[cat.slug] || fallbackCatImages.kurtas;

  return (
    <Link to={`/category/${cat.slug}`} className="category-card" aria-label={`Shop ${cat.name}`}>
      <ProductImage src={imageUrl} alt={cat.name} aspectRatio="3/4" />
      <div className="category-card__overlay">
        <span className="category-card__name">{cat.name}</span>
        <span className="category-card__desc">Explore Collection →</span>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const settings = useSettings();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  useEffect(() => {
    document.title = `${settings.site_name || "ShopIndia"} — Premium Indian Fashion`;
  }, [settings]);

  useEffect(() => {
    Promise.all([
      productsAPI.list({ limit: 8 }),
      categoriesAPI.list(),
    ])
      .then(([prodRes, catRes]) => {
        setProducts(prodRes.data.products || []);
        setCategories(catRes.data.categories || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const heroBannerImg = settings.hero_image_url || "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1200&q=80";

  return (
    <StorefrontLayout>
      {/* ── Hero Section ──────────────────────────────── */}
      <section className="hero" aria-label="Hero banner" style={{ position: "relative", overflow: "hidden", minHeight: "560px", display: "flex", alignItems: "center" }}>
        <img
          src={heroBannerImg}
          alt="Luxury Fashion Banner"
          className="hero__bg"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "brightness(0.55)"
          }}
        />
        <div className="container" style={{ position: "relative", zIndex: 2, color: "white" }}>
          <div className="hero__content" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--space-8)" }}>
            <div className="hero__left" style={{ maxWidth: "620px" }}>
              <span className="hero__tag" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.3)", padding: "6px 14px", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600, display: "inline-block", marginBottom: "16px" }}>
                ✦ Festive & Casual Collection 2026
              </span>
              <h1 className="hero__title" style={{ color: "#ffffff", fontSize: "clamp(2.2rem, 5vw, 3.6rem)", fontWeight: 800, lineHeight: 1.1, marginBottom: "16px" }}>
                Crafted Elegance.<br />
                <span className="hero__title-accent" style={{ color: "#f97316" }}>Designed for India.</span>
              </h1>
              <p className="hero__subtitle" style={{ color: "rgba(255,255,255,0.9)", fontSize: "1.1rem", marginBottom: "28px", lineHeight: 1.6 }}>
                {settings.hero_subtitle || "Discover premium ethnic kurtas, contemporary apparel & handcrafted accessories delivered to your doorstep."}
              </p>
              <div className="hero__actions" style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <Link to="/category/all" className="btn btn-accent btn-lg">Shop Collection →</Link>
                <Link to="/category/kurtas" className="btn btn-secondary btn-lg" style={{ background: "rgba(255,255,255,0.15)", color: "white", borderColor: "white", backdropFilter: "blur(6px)" }}>Explore Kurtas</Link>
              </div>

              <div className="hero__stats" style={{ display: "flex", gap: "24px", marginTop: "36px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.2)" }}>
                <div className="hero__stat"><strong style={{ fontSize: "1.3rem", display: "block" }}>10k+</strong><span style={{ fontSize: "0.8rem", opacity: 0.8 }}>Happy Customers</span></div>
                <div className="hero__stat-divider" style={{ width: "1px", background: "rgba(255,255,255,0.2)" }} />
                <div className="hero__stat"><strong style={{ fontSize: "1.3rem", display: "block" }}>500+</strong><span style={{ fontSize: "0.8rem", opacity: 0.8 }}>Authentic Styles</span></div>
                <div className="hero__stat-divider" style={{ width: "1px", background: "rgba(255,255,255,0.2)" }} />
                <div className="hero__stat"><strong style={{ fontSize: "1.3rem", display: "block" }}>4.9★</strong><span style={{ fontSize: "0.8rem", opacity: 0.8 }}>Rated Store</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Category Strip ────────────────────────────── */}
      {categories.length > 0 && (
        <section className="section" style={{ paddingTop: "var(--space-16)", paddingBottom: "var(--space-12)" }}>
          <div className="container">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "var(--space-8)" }}>
              <div>
                <p style={{ color: "var(--color-accent)", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>Categories</p>
                <h2 style={{ margin: 0, fontSize: "clamp(1.5rem, 3vw, 2.2rem)" }}>Shop by Category</h2>
              </div>
              <Link to="/category/all" className="btn btn-ghost btn-sm">View All Categories →</Link>
            </div>
            <div className="category-grid">
              {categories.slice(0, 4).map(cat => (
                <CategoryCard key={cat.id} cat={cat} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured Products ─────────────────────────── */}
      <section className="section" style={{ background: "var(--color-surface-2)" }}>
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "var(--space-8)" }}>
            <div>
              <p style={{ color: "var(--color-accent)", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>Curated Selection</p>
              <h2 style={{ margin: 0, fontSize: "clamp(1.5rem, 3vw, 2.2rem)" }}>Trending Products</h2>
            </div>
            <Link to="/category/all" className="btn btn-ghost btn-sm">Browse All Products →</Link>
          </div>
          <div className="product-grid">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)
              : products.map(p => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onQuickView={prod => setQuickViewProduct(prod)}
                  />
                ))
            }
          </div>
          {!loading && products.length === 0 && (
            <div className="empty-state">
              <h3 className="empty-state__title">Products Coming Soon</h3>
              <p className="empty-state__text">We are adding new arrival items. Please check back shortly!</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Promo Banner ─────────────────────────────── */}
      <section className="promo-banner" style={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
        <div className="container">
          <div className="promo-banner__inner" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--space-8)" }}>
            <div style={{ maxWidth: "600px" }}>
              <p style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-accent)", fontWeight: 700, marginBottom: "8px" }}>Limited Season Offer</p>
              <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", color: "white", marginBottom: "var(--space-3)", fontWeight: 800 }}>Up to 40% Off Handcrafted Ethnicwear</h2>
              <p style={{ opacity: 0.85, color: "#cbd5e1", marginBottom: "var(--space-6)", fontSize: "1rem", lineHeight: 1.6 }}>Experience authentic block-prints and hand-embroidered cotton kurtas tailored for comfort and distinction.</p>
              <Link to="/category/kurtas" className="btn btn-accent btn-lg">Explore Festive Kurtas</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Signals ─────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="trust-grid">
            {[
              { title: "Free Express Shipping", desc: `On all orders above ₹${settings.shipping_free_above || 999}` },
              { title: "7-Day Hassle-Free Returns", desc: "Easy doorstep pickup & instant refund" },
              { title: "100% Authentic Quality", desc: "Crafted with premium natural fabrics" },
              { title: "Instant WhatsApp Support", desc: "Get help from our team in minutes" },
            ].map(({ title, desc }) => (
              <div key={title} className="trust-card">
                <h4 className="trust-card__title">{title}</h4>
                <p className="trust-card__desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Newsletter ────────────────────────────────── */}
      <section className="newsletter-section">
        <div className="container">
          <div className="newsletter-inner">
            <div>
              <h2 style={{ marginBottom: "var(--space-2)" }}>Stay in the Loop</h2>
              <p style={{ opacity: 0.85, color: "var(--color-text-2)" }}>Subscribe to get exclusive preview sales, new arrivals, and style updates.</p>
            </div>
            <form className="newsletter-form" onSubmit={e => e.preventDefault()}>
              <input type="email" className="newsletter-input" placeholder="Enter your email address" aria-label="Email address" />
              <button type="submit" className="btn btn-accent">Subscribe</button>
            </form>
          </div>
        </div>
      </section>

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </StorefrontLayout>
  );
}
