import { useState, useEffect } from 'react';
import { ordersAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import AdminLayout from '../../components/AdminLayout';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const toast = useToast();

  useEffect(() => {
    document.title = 'Manage Orders — Admin';
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = () => {
    setLoading(true);
    ordersAPI.listAdmin({ status: statusFilter })
      .then(res => {
        setOrders(res.data.orders || []);
        setTotal(res.data.total || 0);
      })
      .catch(err => {
        toast.error('Failed to load orders');
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleStatusUpdate = async (id, newOrderStatus, newPaymentStatus) => {
    setUpdatingId(id);
    try {
      const payload = {
        order_status: newOrderStatus,
        ...(newPaymentStatus && { payment_status: newPaymentStatus }),
        ...(adminNote && { note: adminNote })
      };
      const res = await ordersAPI.updateStatus(id, payload);
      toast.success(`Order status updated to ${newOrderStatus}`);
      setOrders(prev => prev.map(o => o.id === id ? res.data.order : o));
      if (selectedOrder && selectedOrder.id === id) {
        setSelectedOrder(res.data.order);
      }
      setAdminNote('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDownloadReceipt = async (orderId, orderNum) => {
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
    }
  };

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Orders Management</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-3)', marginTop: '2px' }}>
              Track lifecycle, verify payments and manage customer orders ({total} total)
            </p>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <select
              className="form-select btn-sm"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ minHeight: '38px', padding: '6px 36px 6px 12px' }}
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="packed">Packed</option>
              <option value="dispatched">Dispatched</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner lg"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <h2 className="empty-state__title">No orders found</h2>
            <p className="empty-state__text">There are no customer orders matching the selected filter.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order No.</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Order Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td data-label="Order No.">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        style={{ color: 'var(--color-primary)', fontWeight: 700, cursor: 'pointer' }}
                        title="View full order details"
                      >
                        #{order.order_number}
                      </button>
                    </td>
                    <td data-label="Customer">
                      <div style={{ fontWeight: 600 }}>{order.shipping_address?.name || order.customer_name || 'Customer'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-2)' }}>
                        {order.guest_email || order.customer_email || 'No Email'}
                      </div>
                    </td>
                    <td data-label="Date">
                      {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td data-label="Total" style={{ fontWeight: 700 }}>
                      ₹{order.total.toLocaleString('en-IN')}
                    </td>
                    <td data-label="Payment">
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase' }}>
                        {order.payment_method}
                      </div>
                      <span className={`badge ${order.payment_status === 'paid' ? 'badge-delivered' : 'badge-pending'}`}>
                        {order.payment_status || 'Pending'}
                      </span>
                    </td>
                    <td data-label="Order Status">
                      <span className={`badge badge-${order.order_status || order.status}`}>
                        {(order.order_status || order.status).toUpperCase()}
                      </span>
                    </td>
                    <td data-label="Actions">
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <select
                          className="form-select"
                          value={order.order_status || order.status}
                          disabled={updatingId === order.id}
                          onChange={e => handleStatusUpdate(order.id, e.target.value)}
                          style={{ minHeight: '34px', fontSize: '0.8rem', padding: '4px 28px 4px 8px', width: '140px' }}
                          aria-label="Update order status"
                        >
                          <option value="confirmed">Confirmed</option>
                          <option value="processing">Processing</option>
                          <option value="packed">Packed</option>
                          <option value="dispatched">Dispatched</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="returned">Returned</option>
                          <option value="refunded">Refunded</option>
                        </select>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSelectedOrder(order)}
                          style={{ minHeight: '34px', padding: '4px 10px' }}
                          title="View order details"
                        >
                          👁
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Detailed Admin Order Modal */}
        {selectedOrder && (
          <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
            <div className="modal" style={{ maxWidth: '720px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Order Details: #{selectedOrder.order_number}</h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{ fontSize: '1.5rem', padding: '4px', cursor: 'pointer' }}
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                {/* Top Info Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <div style={{ background: 'var(--color-surface-2)', padding: '16px', borderRadius: 'var(--radius-lg)' }}>
                    <h4 style={{ marginBottom: '8px' }}>Customer & Shipping Info</h4>
                    <p style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>
                      <strong>{selectedOrder.shipping_address?.name || selectedOrder.customer_name}</strong><br />
                      Email: {selectedOrder.guest_email || selectedOrder.customer_email || 'N/A'}<br />
                      Phone: {selectedOrder.shipping_address?.phone || 'N/A'}<br />
                      {selectedOrder.shipping_address?.address}, {selectedOrder.shipping_address?.city}, {selectedOrder.shipping_address?.state} — {selectedOrder.shipping_address?.pincode}
                    </p>
                  </div>

                  <div style={{ background: 'var(--color-surface-2)', padding: '16px', borderRadius: 'var(--radius-lg)' }}>
                    <h4 style={{ marginBottom: '8px' }}>Payment & Status Control</h4>
                    <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>Method: <strong>{(selectedOrder.payment_method || 'COD').toUpperCase()}</strong></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Payment Status:</span>
                        <select
                          className="form-select"
                          value={selectedOrder.payment_status || 'pending'}
                          onChange={e => handleStatusUpdate(selectedOrder.id, selectedOrder.order_status, e.target.value)}
                          style={{ minHeight: '30px', fontSize: '0.8rem', padding: '2px 24px 2px 8px', width: 'auto' }}
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="failed">Failed</option>
                          <option value="refunded">Refunded</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Order Lifecycle:</span>
                        <select
                          className="form-select"
                          value={selectedOrder.order_status || selectedOrder.status}
                          onChange={e => handleStatusUpdate(selectedOrder.id, e.target.value, selectedOrder.payment_status)}
                          style={{ minHeight: '30px', fontSize: '0.8rem', padding: '2px 24px 2px 8px', width: 'auto' }}
                        >
                          <option value="confirmed">Confirmed</option>
                          <option value="processing">Processing</option>
                          <option value="packed">Packed</option>
                          <option value="dispatched">Dispatched</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="returned">Returned</option>
                          <option value="refunded">Refunded</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Timeline History */}
                <div>
                  <h4 style={{ marginBottom: '8px' }}>Recorded Status Timeline</h4>
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', background: 'white' }}>
                    {(selectedOrder.status_history || []).map((h, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '4px 0', borderBottom: i < selectedOrder.status_history.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <span><strong>{h.status.toUpperCase()}</strong>: {h.note || 'Status updated'}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>
                          {new Date(h.timestamp).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <h4 style={{ marginBottom: '8px' }}>Purchased Items</h4>
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '12px', padding: '12px', borderBottom: idx < selectedOrder.items.length - 1 ? '1px solid var(--color-border)' : 'none', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-2)' }}>
                            {item.size ? `Size: ${item.size} | ` : ''}Qty: {item.quantity}
                          </div>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>₹{(item.price * item.quantity).toLocaleString('en-IN')}</div>
                      </div>
                    ))}
                    <div style={{ padding: '12px', background: 'var(--color-surface-2)', borderTop: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span>Subtotal</span><span>₹{selectedOrder.subtotal.toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '4px' }}>
                        <span>Shipping Fee</span><span>{selectedOrder.shipping_total === 0 ? 'FREE' : `₹${selectedOrder.shipping_total}`}</span>
                      </div>
                      <div className="divider" style={{ margin: '6px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.05rem' }}>
                        <span>Total Paid</span><span>₹{selectedOrder.total.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setSelectedOrder(null)}>Close</button>
                <button className="btn btn-primary" onClick={() => handleDownloadReceipt(selectedOrder.id, selectedOrder.order_number)}>
                  📄 Download PDF Receipt
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
