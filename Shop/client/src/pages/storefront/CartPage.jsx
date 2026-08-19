import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import StorefrontLayout from '../../components/StorefrontLayout';
import ProductImage from '../../components/ProductImage';

export default function CartPage() {
  const { items, updateQty, removeItem, subtotal, itemCount } = useCart();
  const navigate = useNavigate();

  useEffect(() => { document.title = 'Cart — ShopIndia'; }, []);

  if (items.length === 0) {
    return (
      <StorefrontLayout>
        <div className="container" style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-12)' }}>
          <div className="empty-state">
            <h1 className="empty-state__title">Your cart is empty</h1>
            <p className="empty-state__text">Explore our collection and add your favorite styles.</p>
            <Link to="/category/all" className="btn btn-primary">Browse Collections</Link>
          </div>
        </div>
      </StorefrontLayout>
    );
  }

  const shipping = subtotal >= 999 ? 0 : 99;
  const total = subtotal + shipping;

  return (
    <StorefrontLayout>
      <div className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-12)' }}>
        <h1 style={{ marginBottom: 'var(--space-8)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}>Shopping Cart ({itemCount} items)</h1>

        <div style={{ display: 'grid', gap: 'var(--space-8)', gridTemplateColumns: '1fr' }}>
          {/* Cart items */}
          <div className="card">
            <div className="card-body">
              {items.map(item => (
                <div key={`${item.product_id}-${item.size}`} className="cart-item" style={{ display: 'flex', gap: '16px', padding: '16px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ width: '80px', height: '100px', borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0 }}>
                    <ProductImage
                      src={item.image || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=300&q=80'}
                      alt={item.title}
                      aspectRatio="4/5"
                    />
                  </div>
                  <div className="cart-item__info" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <Link to={`/product/${item.product_id}`} className="cart-item__title" style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)' }}>{item.title}</Link>
                      {item.size && <p className="cart-item__size" style={{ fontSize: '0.85rem', color: 'var(--color-text-2)', marginTop: '4px' }}>Size: {item.size}</p>}
                    </div>
                    <div className="cart-item__footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div className="qty-stepper" style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                        <button
                          className="qty-stepper__btn"
                          onClick={() => updateQty(item.product_id, item.size, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          style={{ padding: '4px 12px', background: 'var(--color-surface-2)', fontSize: '1rem' }}
                        >−</button>
                        <span className="qty-stepper__count" aria-live="polite" style={{ padding: '0 12px', fontWeight: 600 }}>{item.quantity}</span>
                        <button
                          className="qty-stepper__btn"
                          onClick={() => updateQty(item.product_id, item.size, item.quantity + 1)}
                          aria-label="Increase quantity"
                          style={{ padding: '4px 12px', background: 'var(--color-surface-2)', fontSize: '1rem' }}
                        >+</button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', fontFamily: 'var(--font-heading)' }}>
                          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                        </span>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => removeItem(item.product_id, item.size)}
                          aria-label={`Remove ${item.title} from cart`}
                          style={{ color: 'var(--color-error)' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="checkout-summary" style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '24px' }}>
            <h3 style={{ marginBottom: 'var(--space-4)', fontSize: '1.25rem' }}>Order Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-2)' }}>Subtotal ({itemCount} items)</span>
                <span style={{ fontWeight: 600 }}>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-2)' }}>Shipping</span>
                <span style={{ fontWeight: 600, color: shipping === 0 ? 'var(--color-success)' : 'inherit' }}>
                  {shipping === 0 ? 'FREE ✨' : `₹${shipping}`}
                </span>
              </div>
              {shipping > 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-3)' }}>
                  Add ₹{(999 - subtotal).toLocaleString('en-IN')} more for free express shipping
                </p>
              )}
              <div className="divider" style={{ height: '1px', background: 'var(--color-border)', margin: '8px 0' }} />
              <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Total</span>
                <span style={{ fontWeight: 800, fontSize: '1.4rem', fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}>
                  ₹{total.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={() => navigate('/checkout')}
              id="proceed-to-checkout"
            >
              Proceed to Checkout →
            </button>
            <div style={{ textAlign: 'center', marginTop: 'var(--space-3)', fontSize: '0.8rem', color: 'var(--color-text-3)' }}>
              🔒 Guaranteed 256-bit SSL Secure Checkout
            </div>
          </div>
        </div>
      </div>
    </StorefrontLayout>
  );
}
