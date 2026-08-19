import { useState, useEffect } from 'react';
import { settingsAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import AdminLayout from '../../components/AdminLayout';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    document.title = 'Store Settings — Admin';
    loadSettings();
  }, []);

  const loadSettings = () => {
    setLoading(true);
    settingsAPI.getAll()
      .then(res => {
        setSettings(res.data.settings || {});
      })
      .catch(() => {
        toast.error('Failed to load store settings');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleFieldChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  let navLinks = [];
  try {
    navLinks = settings.navigation_links ? JSON.parse(settings.navigation_links) : [
      { label: 'All Products', url: '/category/all' },
      { label: 'Kurtas', url: '/category/kurtas' },
      { label: 'T-Shirts', url: '/category/t-shirts' }
    ];
  } catch (e) {
    navLinks = [];
  }

  const handleNavChange = (idx, field, val) => {
    const newLinks = [...navLinks];
    newLinks[idx][field] = val;
    handleFieldChange('navigation_links', JSON.stringify(newLinks));
  };

  const addNavLink = () => {
    const newLinks = [...navLinks, { label: 'New Link', url: '/' }];
    handleFieldChange('navigation_links', JSON.stringify(newLinks));
  };

  const removeNavLink = (idx) => {
    const newLinks = navLinks.filter((_, i) => i !== idx);
    handleFieldChange('navigation_links', JSON.stringify(newLinks));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await settingsAPI.update(settings);
      toast.success('Settings updated successfully!');
      // Reload page context to refresh layouts
      window.location.reload();
    } catch {
      toast.error('Failed to save settings changes');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-page loading-container">
          <div className="spinner lg"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Store Settings</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-3)', marginTop: '2px' }}>
              Configure checkout, payments, contact information and layout elements
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* General branding */}
          <div className="card">
            <div className="card-body">
              <h3 style={{ marginBottom: 'var(--space-4)' }}>Store Profile</h3>
              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label required" htmlFor="setting-site-name">Store Name</label>
                  <input
                    id="setting-site-name"
                    type="text"
                    className="form-input"
                    value={settings.site_name || ''}
                    onChange={e => handleFieldChange('site_name', e.target.value)}
                    required
                  />
                </div>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="setting-email">Support Email</label>
                    <input
                      id="setting-email"
                      type="email"
                      className="form-input"
                      value={settings.contact_email || ''}
                      onChange={e => handleFieldChange('contact_email', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="setting-phone">Support Phone</label>
                    <input
                      id="setting-phone"
                      type="text"
                      className="form-input"
                      value={settings.contact_phone || ''}
                      onChange={e => handleFieldChange('contact_phone', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Checkout & Payments */}
          <div className="card">
            <div className="card-body">
              <h3 style={{ marginBottom: 'var(--space-4)' }}>Payments & Shipping Configuration</h3>
              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <input
                    id="setting-cod"
                    type="checkbox"
                    checked={settings.cod_enabled === 'true'}
                    onChange={e => handleFieldChange('cod_enabled', e.target.checked ? 'true' : 'false')}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <label className="form-label" htmlFor="setting-cod" style={{ cursor: 'pointer', marginBottom: 0 }}>
                    Enable Cash on Delivery (COD)
                  </label>
                </div>

                <div className="divider" />

                <h4 style={{ marginBottom: '4px' }}>Shipping Cost Calculator</h4>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="setting-shipping-free">Free Shipping Threshold (₹)</label>
                    <input
                      id="setting-shipping-free"
                      type="number"
                      className="form-input"
                      value={settings.shipping_free_above || ''}
                      onChange={e => handleFieldChange('shipping_free_above', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="setting-shipping-fee">Flat Shipping Fee (₹)</label>
                    <input
                      id="setting-shipping-fee"
                      type="number"
                      className="form-input"
                      value={settings.shipping_flat_fee || ''}
                      onChange={e => handleFieldChange('shipping_flat_fee', e.target.value)}
                    />
                  </div>
                </div>

                <div className="divider" />

                <h4 style={{ marginBottom: '4px' }}>Razorpay API Credentials</h4>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="setting-rzp-key">Razorpay Key ID</label>
                    <input
                      id="setting-rzp-key"
                      type="text"
                      className="form-input"
                      value={settings.razorpay_key_id || ''}
                      onChange={e => handleFieldChange('razorpay_key_id', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="setting-rzp-secret">Razorpay Key Secret</label>
                    <input
                      id="setting-rzp-secret"
                      type="password"
                      className="form-input"
                      value={settings.razorpay_key_secret || ''}
                      placeholder={settings.razorpay_key_secret ? '••••••••••••••••' : ''}
                      onChange={e => handleFieldChange('razorpay_key_secret', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Social Channels */}
          <div className="card">
            <div className="card-body">
              <h3 style={{ marginBottom: 'var(--space-4)' }}>Contact Channels & Social Media</h3>
              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="setting-whatsapp">WhatsApp Number (with country code, e.g. 919876543210)</label>
                  <input
                    id="setting-whatsapp"
                    type="text"
                    className="form-input"
                    value={settings.whatsapp_number || ''}
                    onChange={e => handleFieldChange('whatsapp_number', e.target.value)}
                  />
                  <span className="form-hint">Enables floating WhatsApp support button on storefront</span>
                </div>
                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="setting-insta">Instagram URL</label>
                    <input
                      id="setting-insta"
                      type="url"
                      className="form-input"
                      value={settings.instagram_url || ''}
                      onChange={e => handleFieldChange('instagram_url', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="setting-fb">Facebook URL</label>
                    <input
                      id="setting-fb"
                      type="url"
                      className="form-input"
                      value={settings.facebook_url || ''}
                      onChange={e => handleFieldChange('facebook_url', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Banner Announcements */}
          <div className="card">
            <div className="card-body">
              <h3 style={{ marginBottom: 'var(--space-4)' }}>Layout & Visual Features</h3>
              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <input
                    id="setting-banner-toggle"
                    type="checkbox"
                    checked={settings.announcement_bar_enabled === 'true'}
                    onChange={e => handleFieldChange('announcement_bar_enabled', e.target.checked ? 'true' : 'false')}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <label className="form-label" htmlFor="setting-banner-toggle" style={{ cursor: 'pointer', marginBottom: 0 }}>
                    Enable Header Announcement Bar
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="setting-banner-text">Announcement Text</label>
                  <input
                    id="setting-banner-text"
                    type="text"
                    className="form-input"
                    value={settings.announcement_bar_text || ''}
                    onChange={e => handleFieldChange('announcement_bar_text', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="card">
            <div className="card-body">
              <h3 style={{ marginBottom: 'var(--space-4)' }}>Navigation Menu</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-3)', marginBottom: 'var(--space-4)' }}>
                Customize the links that appear in the header and mobile menu.
              </p>
              
              <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                {navLinks.map((link, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Link Label (e.g. Kurtas)"
                        value={link.label}
                        onChange={e => handleNavChange(idx, 'label', e.target.value)}
                      />
                    </div>
                    <div style={{ flex: 2 }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="URL (e.g. /category/kurtas)"
                        value={link.url}
                        onChange={e => handleNavChange(idx, 'url', e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ color: 'var(--color-error)' }}
                      onClick={() => removeNavLink(idx)}
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 'var(--space-4)' }}
                onClick={addNavLink}
              >
                ➕ Add Link
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginBottom: 'var(--space-8)' }}>
            <button type="button" className="btn btn-ghost" onClick={loadSettings} disabled={saving}>Reset</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '⏳ Saving Settings…' : '💾 Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
