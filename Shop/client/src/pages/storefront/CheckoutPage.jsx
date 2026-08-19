import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { ordersAPI } from '../../services/api';
import StorefrontLayout from '../../components/StorefrontLayout';

const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Puducherry'];

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const settings = useSettings();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    state: 'Maharashtra',
    pincode: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [placing, setPlacing] = useState(false);
  const [errors, setErrors] = useState({});

  const codEnabled = settings.cod_enabled === 'true';
  const shipping = subtotal >= parseFloat(settings.shipping_free_above || 999) ? 0 : parseFloat(settings.shipping_flat_fee || 99);
  const total = subtotal + shipping;

  useEffect(() => {
    document.title = 'Checkout — ShopIndia';
    if (!codEnabled && paymentMethod === 'cod') setPaymentMethod('razorpay');
  }, [codEnabled, paymentMethod]);

  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    if (items.length === 0) navigate('/cart');
  }, [items, navigate]);

  if (authLoading) {
    return (
      <StorefrontLayout>
        <div className="container loading-container" style={{ minHeight: '60vh' }}>
          <div className="spinner lg"></div>
        </div>
      </StorefrontLayout>
    );
  }

  // GUEST CHECKOUT PREVENTION UI GATE
  if (!user) {
    return (
      <StorefrontLayout>
        <div className="container" style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-12)', maxWidth: '480px' }}>
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: '36px 24px' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '12px' }}>Please Sign In to Continue</h2>
              <p style={{ color: 'var(--color-text-2)', fontSize: '0.95rem', marginBottom: '28px', lineHeight: 1.6 }}>
                Account authentication is required to place orders, receive status updates, and download official PDF tax invoices. Your cart will remain saved!
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Link to="/account/login?redirect=/checkout" className="btn btn-primary btn-full btn-lg">
                  Sign In to Account →
                </Link>
                <Link to="/account/signup?redirect=/checkout" className="btn btn-ghost btn-full btn-lg">
                  Create New Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </StorefrontLayout>
    );
  }

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    if (!form.phone.trim() || !/^\d{10}$/.test(form.phone.trim())) e.phone = 'Valid 10-digit phone number required';
    if (!form.address.trim()) e.address = 'Street address is required';
    if (!form.city.trim()) e.city = 'City is required';
    if (!form.state.trim()) e.state = 'State is required';
    if (!form.pincode.trim() || !/^\d{6}$/.test(form.pincode.trim())) e.pincode = 'Valid 6-digit pincode required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const placeOrder = async () => {
    if (placing) return;
    if (!validate()) return;
    setPlacing(true);

    const orderPayload = {
      items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity, size: i.size, title: i.title })),
      shipping_address: { name: form.name, phone: form.phone, address: form.address, city: form.city, state: form.state, pincode: form.pincode, email: form.email },
      payment_method: paymentMethod,
    };

    try {
      const res = await ordersAPI.place(orderPayload);
      const { order, razorpay } = res.data;

      if (paymentMethod === 'cod') {
        clearCart();
        toast.success('Order placed successfully!');
        navigate(`/order-confirmation/${order.order_number}`);
        return;
      }

      // Razorpay online payment flow
      if (razorpay) {
        const rzp = new window.Razorpay({
          key: razorpay.key_id,
          amount: razorpay.amount,
          currency: razorpay.currency,
          name: razorpay.name,
          order_id: razorpay.order_id,
          handler: async (response) => {
            try {
              const verifyRes = await ordersAPI.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              clearCart();
              toast.success('Payment verified & order confirmed!');
              navigate(`/order-confirmation/${verifyRes.data.order.order_number}`);
            } catch {
              toast.error('Payment verification failed. Please contact store support.');
            }
          },
          prefill: { name: form.name, email: form.email, contact: form.phone },
          theme: { color: '#0f172a' },
          modal: {
            ondismiss: () => {
              toast.info('Payment cancelled. Your cart remains safe.');
              setPlacing(false);
            },
          },
        });
        rzp.open();
        setPlacing(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to place order. Please try again.');
      setPlacing(false);
    }
  };

  return (
    <StorefrontLayout>
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />

      <div className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-12)' }}>
        <h1 style={{ marginBottom: 'var(--space-8)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}>Checkout</h1>

        <div className="checkout-grid">
          {/* Left Column: Delivery & Payment Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Contact Details */}
            <div className="card">
              <div className="card-body">
                <h3 style={{ marginBottom: 'var(--space-5)' }}>Contact Details</h3>
                <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                  <div className="form-row form-row-2">
                    <div className="form-group">
                      <label className="form-label required" htmlFor="checkout-name">Full Name</label>
                      <input id="checkout-name" type="text" className="form-input" placeholder="Rahul Sharma" value={form.name} onChange={e => handleChange('name', e.target.value)} autoComplete="name" />
                      {errors.name && <span className="form-error">{errors.name}</span>}
                    </div>
                    <div className="form-group">
                      <label className="form-label required" htmlFor="checkout-phone">Phone Number</label>
                      <input id="checkout-phone" type="tel" className="form-input" placeholder="98765 43210" value={form.phone} onChange={e => handleChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} autoComplete="tel" />
                      {errors.phone && <span className="form-error">{errors.phone}</span>}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label required" htmlFor="checkout-email">Email Address</label>
                    <input id="checkout-email" type="email" className="form-input" placeholder="rahul@example.com" value={form.email} onChange={e => handleChange('email', e.target.value)} autoComplete="email" />
                    {errors.email && <span className="form-error">{errors.email}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="card">
              <div className="card-body">
                <h3 style={{ marginBottom: 'var(--space-5)' }}>Shipping Address</h3>
                <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                  <div className="form-group">
                    <label className="form-label required" htmlFor="checkout-address">Street Address</label>
                    <textarea id="checkout-address" className="form-textarea" placeholder="Flat / House No., Street, Area, Landmark" value={form.address} onChange={e => handleChange('address', e.target.value)} rows={3} autoComplete="street-address" />
                    {errors.address && <span className="form-error">{errors.address}</span>}
                  </div>
                  <div className="form-row form-row-3">
                    <div className="form-group">
                      <label className="form-label required" htmlFor="checkout-city">City</label>
                      <input id="checkout-city" type="text" className="form-input" placeholder="Mumbai" value={form.city} onChange={e => handleChange('city', e.target.value)} autoComplete="address-level2" />
                      {errors.city && <span className="form-error">{errors.city}</span>}
                    </div>
                    <div className="form-group">
                      <label className="form-label required" htmlFor="checkout-state">State</label>
                      <select id="checkout-state" className="form-select" value={form.state} onChange={e => handleChange('state', e.target.value)}>
                        {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label required" htmlFor="checkout-pincode">Pincode</label>
                      <input id="checkout-pincode" type="text" className="form-input" placeholder="400001" value={form.pincode} onChange={e => handleChange('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} autoComplete="postal-code" />
                      {errors.pincode && <span className="form-error">{errors.pincode}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="card">
              <div className="card-body">
                <h3 style={{ marginBottom: 'var(--space-5)' }}>Payment Method</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <button
                    type="button"
                    className={`payment-option${paymentMethod === 'razorpay' ? ' selected' : ''}`}
                    onClick={() => setPaymentMethod('razorpay')}
                    aria-pressed={paymentMethod === 'razorpay'}
                    id="payment-razorpay"
                  >
                    <div className="payment-option__radio" />
                    <div>
                      <div style={{ fontWeight: 600 }}>💳 Pay Online (Razorpay)</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-2)' }}>Cards, UPI, NetBanking & Wallets</div>
                    </div>
                  </button>

                  {codEnabled && (
                    <button
                      type="button"
                      className={`payment-option${paymentMethod === 'cod' ? ' selected' : ''}`}
                      onClick={() => setPaymentMethod('cod')}
                      aria-pressed={paymentMethod === 'cod'}
                      id="payment-cod"
                    >
                      <div className="payment-option__radio" />
                      <div>
                        <div style={{ fontWeight: 600 }}>💵 Cash on Delivery (COD)</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-2)' }}>Pay cash upon doorstep delivery</div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="checkout-summary" style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '24px', height: 'fit-content' }}>
            <h3 style={{ marginBottom: 'var(--space-4)' }}>Order Summary</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {items.map(item => (
                <div key={`${item.product_id}-${item.size}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--color-text-2)' }}>
                    {item.title} {item.size && `(${item.size})`} × {item.quantity}
                  </span>
                  <span style={{ fontWeight: 600 }}>₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            <div className="divider" style={{ height: '1px', background: 'var(--color-border)', margin: '12px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '12px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-2)' }}>Subtotal</span>
                <span style={{ fontWeight: 600 }}>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-2)' }}>Shipping</span>
                <span style={{ fontWeight: 600, color: shipping === 0 ? 'var(--color-success)' : 'inherit' }}>
                  {shipping === 0 ? 'FREE ✨' : `₹${shipping}`}
                </span>
              </div>
              <div className="divider" style={{ height: '1px', background: 'var(--color-border)', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Total Amount</span>
                <span style={{ fontWeight: 800, fontSize: '1.35rem', fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}>₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              className={`btn btn-primary btn-full btn-lg${placing ? ' btn-loading' : ''}`}
              onClick={placeOrder}
              disabled={placing}
              id="place-order-btn"
              style={{ marginTop: '16px' }}
            >
              {placing ? <><span className="btn-spinner" /> Processing Order...</> : paymentMethod === 'cod' ? '✅ Complete Order (COD)' : '💳 Proceed to Payment'}
            </button>

            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', textAlign: 'center', marginTop: '12px' }}>
              🔒 256-bit SSL Secure Checkout
            </p>
          </div>
        </div>
      </div>
    </StorefrontLayout>
  );
}
