import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ordersAPI } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import StorefrontLayout from '../../components/StorefrontLayout';
import ProductImage from '../../components/ProductImage';

export default function OrderConfirmationPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const settings = useSettings();
  const toast = useToast();

  useEffect(() => {
    document.title = 'Order Details & Receipt — ShopIndia';
    ordersAPI.getByNumber(orderId)
      .then(res => setOrder(res.data.order))
      .catch(() => {
        return ordersAPI.get(orderId)
          .then(res => setOrder(res.data.order));
      })
      .catch(err => console.error('Error fetching order details', err))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleDownloadReceipt = async () => {
    if (!order) return;
    setDownloading(true);
    try {
      const response = await ordersAPI.downloadReceipt(order.id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${order.order_number || order.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Receipt PDF downloaded!');
    } catch (err) {
      toast.error('Failed to download receipt PDF.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <StorefrontLayout>
        <div className="container loading-container">
          <div className="spinner lg"></div>
        </div>
      </StorefrontLayout>
    );
  }

  if (!order) {
    return (
      <StorefrontLayout>
        <div className="container" style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-12)' }}>
          <div className="empty-state">
            <h1 className="empty-state__title">Order Not Found</h1>
            <p className="empty-state__text">We couldn't retrieve the details for order "{orderId}".</p>
            <Link to="/" className="btn btn-primary">Go to Home</Link>
          </div>
        </div>
      </StorefrontLayout>
    );
  }

  const isCOD = order.payment_method === 'cod';
  const whatsappNumber = settings.whatsapp_number || '919876543210';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Hi%20ShopIndia%2C%20I%20have%20a%20query%20about%20my%20order%20%23${order.order_number}`;

  return (
    <StorefrontLayout>
      <div className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-12)', maxWidth: '720px' }}>
        <div className="card" style={{ borderTop: '6px solid var(--color-success)', textAlign: 'center', padding: 'var(--space-8) var(--space-6)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-3)' }}>🎉</div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', marginBottom: 'var(--space-2)' }}>Order Confirmed!</h1>
          <p style={{ color: 'var(--color-text-2)', fontSize: '1.1rem', marginBottom: 'var(--space-6)' }}>
            Your order number is <strong style={{ color: 'var(--color-text)' }}>#{order.order_number}</strong>
          </p>

          <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 'var(--radius-lg)', padding: '16px 20px', textAlign: 'left', marginBottom: 'var(--space-6)' }}>
            <strong style={{ color: '#065f46' }}>✓ Order Received Successfully</strong>
            <p style={{ fontSize: '0.85rem', color: '#064e3b', marginTop: '4px' }}>
              {isCOD
                ? 'Our team will contact you shortly to confirm dispatch. Please keep cash ready upon delivery.'
                : 'Your payment was verified. We are preparing your items for packaging.'}
            </p>
          </div>

          {/* Delivery Address */}
          <div style={{ textAlign: 'left', marginBottom: 'var(--space-6)' }}>
            <h3 style={{ marginBottom: 'var(--space-3)' }}>Delivery Address</h3>
            <div style={{ padding: 'var(--space-4)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              <strong>{order.shipping_address.name}</strong><br />
              {order.shipping_address.address}<br />
              {order.shipping_address.city}, {order.shipping_address.state} — {order.shipping_address.pincode}<br />
              Phone: {order.shipping_address.phone}
            </div>
          </div>

          {/* Order Summary Table */}
          <div style={{ textAlign: 'left', marginBottom: 'var(--space-6)' }}>
            <h3 style={{ marginBottom: 'var(--space-3)' }}>Order Summary</h3>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              {order.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-4)', borderBottom: idx < order.items.length - 1 ? '1px solid var(--color-border)' : 'none', alignItems: 'center' }}>
                  <div style={{ width: '50px', height: '65px', borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0 }}>
                    <ProductImage src={item.image || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=200&q=80'} alt={item.title} aspectRatio="4/5" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-2)' }}>
                      {item.size ? `Size: ${item.size} | ` : ''}Qty: {item.quantity}
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>₹{(item.price * item.quantity).toLocaleString('en-IN')}</div>
                </div>
              ))}
              <div style={{ padding: 'var(--space-4)', background: 'var(--color-surface-2)', borderTop: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 'var(--space-2)' }}>
                  <span>Subtotal</span>
                  <span>₹{order.subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 'var(--space-2)' }}>
                  <span>Shipping</span>
                  <span>{order.shipping_total === 0 ? 'FREE' : `₹${order.shipping_total}`}</span>
                </div>
                <div className="divider" style={{ margin: 'var(--space-2) 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem' }}>
                  <span>Total Amount</span>
                  <span>₹{order.total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-accent" onClick={handleDownloadReceipt} disabled={downloading}>
              {downloading ? '⏳ Generating PDF…' : '📄 Download PDF Receipt'}
            </button>
            <Link to="/account/orders" className="btn btn-primary">
              📦 View My Orders
            </Link>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              💬 Support
            </a>
          </div>
        </div>
      </div>
    </StorefrontLayout>
  );
}
