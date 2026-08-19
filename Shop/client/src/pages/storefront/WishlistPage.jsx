import { Link, useNavigate } from "react-router-dom";
import { useWishlist } from "../../context/WishlistContext";
import { useCart } from "../../context/CartContext";
import StorefrontLayout from "../../components/StorefrontLayout";
import ProductImage from "../../components/ProductImage";

export default function WishlistPage() {
  const { wishlist, toggleWishlist } = useWishlist();
  const { addItem } = useCart();
  const navigate = useNavigate();

  return (
    <StorefrontLayout>
      <div className="container wishlist-page" style={{ paddingTop: "var(--space-8)", paddingBottom: "var(--space-12)" }}>
        <h1 style={{ marginBottom: "var(--space-2)", fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>My Wishlist</h1>
        <p style={{ color: "var(--color-text-2)", marginBottom: "var(--space-8)" }}>
          {wishlist.length} item{wishlist.length !== 1 ? "s" : ""} saved
        </p>

        {wishlist.length === 0 ? (
          <div className="empty-state">
            <h2 className="empty-state__title">Your wishlist is empty</h2>
            <p className="empty-state__text">Save items you love by tapping the heart icon on any product.</p>
            <Link to="/category/all" className="btn btn-primary">Browse Collections</Link>
          </div>
        ) : (
          <div className="product-grid">
            {wishlist.map(product => {
              const discountPct = product.compare_price && product.compare_price > product.price
                ? Math.round((1 - product.price / product.compare_price) * 100) : null;
              return (
                <article
                  key={product.id}
                  className="product-card"
                  onClick={() => navigate(`/product/${product.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="product-card__image-wrap">
                    <ProductImage
                      src={product.images?.[0] || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80'}
                      alt={product.title}
                      aspectRatio="4/5"
                    />
                    {discountPct && <span className="product-card__badge">{discountPct}% OFF</span>}
                    <button
                      className="product-card__wishlist active"
                      onClick={e => { e.stopPropagation(); toggleWishlist(product); }}
                      aria-label="Remove from wishlist"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </button>
                    <div className="product-card__quick-add">
                      <button
                        className="btn btn-primary btn-sm btn-full"
                        onClick={e => { e.stopPropagation(); addItem(product, 1); }}
                      >Move to Cart</button>
                    </div>
                  </div>
                  <div className="product-card__body">
                    {product.category_name && <div className="product-card__category">{product.category_name}</div>}
                    <h3 className="product-card__title">{product.title}</h3>
                    <div className="product-card__prices">
                      <span className="product-card__price">₹{product.price?.toLocaleString("en-IN")}</span>
                      {product.compare_price && (
                        <span className="product-card__compare">₹{product.compare_price?.toLocaleString("en-IN")}</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </StorefrontLayout>
  );
}
