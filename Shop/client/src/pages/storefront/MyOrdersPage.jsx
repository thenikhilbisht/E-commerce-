import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ordersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import StorefrontLayout from '../../components/StorefrontLayout';
import ProductImage from '../../components/ProductImage';

const LIFECYCLE_STEPS = [
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'packed', label: 'Packed' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

function safeParseJSON(input, fallback) {
  if (typeof input === 'object' && input !== null) return input;
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return parsed !== null ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function OrderTimeline({ currentStatus = 'confirmed', history = [] }) {
  const statusStr = (currentStatus || 'confirmed').toLowerCase();
  const safeHistory = safeParseJSON(history, []);

  if (['cancelled', 'returned', 'refunded'].includes(statusStr)) {
    return (
      <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>⚠️</span>
        <span>Order Status: {statusStr.toUpperCase()}</span>
      </div>
    );
  }

  const currentIdx = LIFECYCLE_STEPS.findIndex(s => s.key === statusStr);
  const activeIndex = currentIdx === -1 ? 0 : currentIdx;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Horizontal Steps Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', margin: '16px 0' }}>
        {LIFECYCLE_STEPS.map((step, idx) => {
          const isDone = idx < activeIndex;
          const isActive = idx === activeIndex;

          return (
            <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative', zIndex: 2 }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: isDone || isActive ? 'var(--color-primary)' : 'white',
                  color: isDone || isActive ? 'white' : 'var(--color-text-3)',
                  border: isDone || isActive ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  transition: 'all 0.2s ease'
                }}
              >
                {isDone ? '✓' : idx + 1}
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-2)',
                  marginTop: '6px',
                  textAlign: 'center'
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* History Log Entries */}
      {Array.isArray(safeHistory) && safeHistory.length > 0 && (
        <div style={{ background: 'white', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-3)', marginBottom: '8px' }}>
            Status Updates History
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {safeHistory.map((h, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-text-2)' }}>
                <span>• {h.note || h.status}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>
                  {h.timestamp ? new Date(h.timestamp).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyOrdersPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    document.title = 'My Account & Orders — ShopIndia';
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    ordersAPI.myOrders()
      .then(res => setOrders(res.data.orders || []))
      .catch(err => {
        console.error('Failed to fetch orders', err);
        setOrders([]);
      })
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  const handleDownloadReceipt = async (orderId, orderNum) => {
    setDownloadingId(orderId);
    try {
      const response = await ordersAPI.downloadReceipt(orderId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${orderNum || orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Receipt PDF downloaded!');
    } catch {
      toast.error('Failed to download receipt PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  // 1. Loading State while checking authentication or fetching orders
  if (authLoading || (user && loading)) {
    return (
      <StorefrontLayout>
        <div className="container loading-container" style={{ minHeight: '60vh' }}>
          <div className="spinner lg"></div>
        </div>
      </StorefrontLayout>
    );
  }

  // 2. Unauthenticated User Gate Page (Clean UI prompt instead of blank page or bounce)
  if (!user) {
    return (
      <StorefrontLayout>
        <div className="container" style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-12)', maxWidth: '480px' }}>
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: '36px 24px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📦</div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '12px' }}>Sign In to View Orders</h2>
              <p style={{ color: 'var(--color-text-2)', fontSize: '0.95rem', marginBottom: '28px', lineHeight: 1.6 }}>
                Please sign in to access your purchase history, live order tracking, and official downloadable tax receipts.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Link to="/account/login?redirect=/account/orders" className="btn btn-primary btn-full btn-lg">
                  Sign In to Account →
                </Link>
                <Link to="/account/signup?redirect=/account/orders" className="btn btn-ghost btn-full btn-lg">
                  Create New Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </StorefrontLayout>
    );
  }

  // 3. Filter orders safely
  const filteredOrders = orders.filter(o => {
    const status = (o.order_status || o.status || 'confirmed').toLowerCase();
    if (activeTab === 'all') return true;
    if (activeTab === 'processing') return ['confirmed', 'processing', 'packed'].includes(status);
    if (activeTab === 'dispatched') return ['dispatched', 'out_for_delivery'].includes(status);
    if (activeTab === 'delivered') return status === 'delivered';
    if (activeTab === 'cancelled') return ['cancelled', 'returned', 'refunded'].includes(status);
    return true;
  });

  return (
    <StorefrontLayout>
      <div className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-12)' }}>
        <h1 style={{ marginBottom: 'var(--space-6)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}>My Account & Orders</h1>

        {/* User Profile Card */}
        <div className="card" style={{ marginBottom: 'var(--space-8)' }}>
          <div className="card-body" style={{ padding: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 700 }}>
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '2px' }}>{user.name}</h2>
                <div style={{ color: 'var(--color-text-2)', fontSize: '0.9rem' }}>{user.email}</div>
                {user.role === 'admin' && <div style={{ marginTop: '4px' }}><span className="badge badge-primary">Store Admin</span></div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              {user.role === 'admin' && (
                <Link to="/admin/orders" className="btn btn-secondary btn-sm">Admin Dashboard</Link>
              )}
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--color-error)' }}
                onClick={() => { logout(); navigate('/'); }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-8)', overflowX: 'auto', paddingBottom: '8px' }}>
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'processing', label: 'Processing & Packed' },
            { id: 'dispatched', label: 'Dispatched' },
            { id: 'delivered', label: 'Delivered' },
            { id: 'cancelled', label: 'Cancelled / Returned' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`btn btn-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: '999px', padding: '6px 16px' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filteredOrders.length === 0 ? (
          <div className="empty-state">
            <h2 className="empty-state__title">No orders found</h2>
            <p className="empty-state__text">
              {orders.length === 0
                ? "You haven't placed any orders with this account yet."
                : "You have no orders matching the selected filter category."
              }
            </p>
            <Link to="/category/all" className="btn btn-primary">Start Shopping</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {filteredOrders.map(order => {
              const items = safeParseJSON(order.items, []);
              const history = safeParseJSON(order.status_history, []);
              const totalVal = typeof order.total === 'number' ? order.total : parseFloat(order.total || 0);

              return (
                <div key={order.id} className="card">
                  <div className="card-body" style={{ padding: 'var(--space-6)' }}>
                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', textTransform: 'uppercase', fontWeight: 700 }}>Order Number</div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', fontFamily: 'var(--font-heading)' }}>#{order.order_number || ('ORD-' + order.id)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', textTransform: 'uppercase', fontWeight: 700 }}>Date Placed</div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', textTransform: 'uppercase', fontWeight: 700 }}>Total Amount</div>
                        <div style={{ fontWeight: 800, color: 'var(--color-text)', fontSize: '1.1rem' }}>₹{totalVal.toLocaleString('en-IN')}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', textTransform: 'uppercase', fontWeight: 700 }}>Payment Method</div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase' }}>
                          {(order.payment_method || 'COD').toUpperCase()} ({(order.payment_status || 'Pending').toUpperCase()})
                        </div>
                      </div>
                    </div>

                    {/* Items List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: 'var(--space-6)' }}>
                      {Array.isArray(items) && items.map((item, idx) => {
                        const price = typeof item.price === 'number' ? item.price : parseFloat(item.price || 0);
                        const qty = parseInt(item.quantity) || 1;

                        return (
                          <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <div style={{ width: '48px', height: '60px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0 }}>
                              <ProductImage src={item.image || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=200&q=80'} alt={item.title || 'Product'} aspectRatio="4/5" />
                            </div>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' }}>{item.title || 'Product Item'}</span>
                              {item.size && <span style={{ fontSize: '0.85rem', color: 'var(--color-text-2)', marginLeft: '12px' }}>Size: {item.size}</span>}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-2)' }}>Qty: {qty}</div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', minWidth: '70px', textAlign: 'right' }}>₹{(price * qty).toLocaleString('en-IN')}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Timeline */}
                    <div style={{ background: 'var(--color-surface-2)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', marginBottom: '16px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px' }}>Order & Delivery Lifecycle</div>
                      <OrderTimeline currentStatus={order.order_status || order.status} history={history} />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDownloadReceipt(order.id, order.order_number)}
                        disabled={downloadingId === order.id}
                      >
                        {downloadingId === order.id ? '⏳ Downloading…' : '📄 Download PDF Receipt'}
                      </button>
                      <Link to={`/order-confirmation/${order.order_number || order.id}`} className="btn btn-primary btn-sm">
                        View Full Receipt →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </StorefrontLayout>
  );
}
