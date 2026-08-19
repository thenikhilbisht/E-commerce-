import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const NAV_LINKS = [
  { to: '/admin/orders', icon: '📦', label: 'Orders' },
  { to: '/admin/products', icon: '👕', label: 'Products' },
  { to: '/admin/categories', icon: '🏷️', label: 'Categories' },
  { to: '/admin/pages', icon: '📄', label: 'Pages' },
  { to: '/admin/settings', icon: '⚙️', label: 'Settings' },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const settings = useSettings();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const siteName = settings.site_name || 'ShopIndia';

  return (
    <div className="admin-layout">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setSidebarOpen(false)}
          style={{ zIndex: 'calc(var(--z-sidebar) - 1)' }}
        />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar${sidebarOpen ? ' open' : ''}`} aria-label="Admin navigation">
        <div className="admin-sidebar__header">
          <div className="admin-sidebar__logo">{siteName}</div>
          <div className="admin-sidebar__subtitle">Admin Dashboard</div>
        </div>

        <nav className="admin-sidebar__nav">
          {NAV_LINKS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="admin-nav-link__icon">{icon}</span>
              {label}
            </NavLink>
          ))}

          <div className="divider" />

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-nav-link"
          >
            <span className="admin-nav-link__icon">🛍️</span>
            View Store
          </a>
        </nav>

        <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-3)', marginBottom: 'var(--space-2)' }}>
            Logged in as
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 'var(--space-3)' }}>
            {user?.name}
          </div>
          <button className="btn btn-ghost btn-sm btn-full" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="admin-main">
        {/* Top bar (mobile) */}
        <div className="admin-topbar">
          <button
            className="header__hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open admin menu"
            style={{ display: 'flex' }}
          >
            <span /><span /><span />
          </button>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem' }}>
            Admin
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Link to="/admin/orders" style={{ fontSize: '0.8rem', color: 'var(--color-text-2)' }}>
              📦 Orders
            </Link>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
