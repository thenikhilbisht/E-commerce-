import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useWishlist } from "../context/WishlistContext";
import { useToast } from "../context/ToastContext";
import { productsAPI } from "../services/api";

export default function StorefrontLayout({ children }) {
  const { itemCount } = useCart();
  const { user, logout } = useAuth();
  const settings = useSettings();
  const { count: wishlistCount } = useWishlist();
  const toast = useToast();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const accountRef = useRef(null);
  const searchRef = useRef(null);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/category/all?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setSearchFocused(false);
    }
  };

  // Instant live search debounced query
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      productsAPI.list({ search: searchQuery.trim(), limit: 5 })
        .then(res => setSearchResults(res.data.products || []))
        .catch(() => setSearchResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClick = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    setAccountOpen(false);
    setIsLoggingOut(true);
    toast.info("Logging out cleanly...");
    setTimeout(async () => {
      try {
        await logout();
        toast.success("Signed out successfully. See you again!");
      } catch {
        toast.error("Logout completed.");
      } finally {
        setIsLoggingOut(false);
        navigate("/");
      }
    }, 300);
  };

  const whatsappUrl = settings.whatsapp_number
    ? `https://wa.me/${settings.whatsapp_number}`
    : "#";

  const siteName = settings.site_name || "ShopIndia";

  let navLinks = [];
  try {
    navLinks = settings.navigation_links ? JSON.parse(settings.navigation_links) : [
      { label: "All Products", url: "/category/all" },
      { label: "Kurtas", url: "/category/kurtas" },
      { label: "T-Shirts", url: "/category/t-shirts" },
      { label: "Dresses", url: "/category/dresses" },
      { label: "Accessories", url: "/category/accessories" },
    ];
  } catch (e) {
    navLinks = [];
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", opacity: isLoggingOut ? 0.7 : 1, transition: "opacity 0.3s ease" }}>
      {/* Announcement Bar */}
      {settings.announcement_bar_enabled === "true" && !announcementDismissed && settings.announcement_bar_text && (
        <div className="announcement-bar" style={{ background: "var(--color-primary-dark)", color: "white" }}>
          <span>{settings.announcement_bar_text}</span>
          <button
            className="announcement-bar__close"
            onClick={() => setAnnouncementDismissed(true)}
            aria-label="Dismiss announcement"
          >×</button>
        </div>
      )}

      {/* Header */}
      <header className="header" style={{ position: "sticky", top: 0, background: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--color-border)", zIndex: "var(--z-header)" }}>
        <div className="container">
          <div className="header-inner" style={{ height: "72px" }}>
            {/* Hamburger */}
            <button
              className="header__hamburger"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>

            {/* Brand Logo */}
            <Link to="/" className="header__brand" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
              {settings.site_logo ? (
                <img src={settings.site_logo} alt={siteName} style={{ height: "36px", objectFit: "contain" }} />
              ) : (
                <span className="brand-text" style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "1.45rem", color: "var(--color-primary)", letterSpacing: "-0.02em" }}>
                  {siteName}
                </span>
              )}
            </Link>

            {/* Desktop Navigation */}
            <nav className="header__nav" aria-label="Main Navigation">
              {navLinks.map((link, idx) => (
                <NavLink
                  key={idx}
                  to={link.url}
                  className={({ isActive }) => `header__nav-link${isActive ? " active" : ""}`}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {/* Live Autocomplete Search Bar */}
            <div className="header__search-wrap" ref={searchRef} style={{ position: "relative", flex: "1", maxWidth: "300px", margin: "0 16px" }}>
              <form onSubmit={handleSearchSubmit} className="header__search-form">
                <input
                  type="text"
                  className="header__search-input"
                  placeholder="Search kurtas, t-shirts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  aria-label="Search products"
                />
                <button type="submit" className="header__search-submit" aria-label="Submit search">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </button>
              </form>

              {/* Instant Search Results Dropdown */}
              {searchFocused && searchResults.length > 0 && (
                <div className="search-dropdown" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "white", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-xl)", zIndex: 100, overflow: "hidden" }}>
                  {searchResults.map(p => (
                    <Link
                      key={p.id}
                      to={`/product/${p.id}`}
                      className="search-dropdown__item"
                      onClick={() => { setSearchFocused(false); setSearchQuery(""); }}
                      style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", textDecoration: "none", color: "var(--color-text)", borderBottom: "1px solid #f1f5f9" }}
                    >
                      <img src={JSON.parse(p.images || '[]')[0] || ''} alt={p.title} style={{ width: "32px", height: "40px", objectFit: "cover", borderRadius: "4px" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-accent)", fontWeight: 700 }}>₹{p.price.toLocaleString('en-IN')}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Header Action Icons */}
            <div className="header__actions" style={{ gap: "16px" }}>
              {/* Wishlist Icon */}
              <Link to="/wishlist" className="header__icon-btn" title="Wishlist" aria-label="Wishlist" style={{ position: "relative" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                {wishlistCount > 0 && <span className="header__cart-count">{wishlistCount > 9 ? "9+" : wishlistCount}</span>}
              </Link>

              {/* User Account Dropdown */}
              <div className="header__account" ref={accountRef} style={{ position: "relative" }}>
                <button
                  className="header__icon-btn"
                  onClick={() => setAccountOpen(v => !v)}
                  aria-label="Account"
                  aria-expanded={accountOpen}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </button>
                {accountOpen && (
                  <div className="account-dropdown" role="menu">
                    {user ? (
                      <>
                        <div className="account-dropdown__user">
                          <div className="account-dropdown__avatar">{user.name ? user.name[0].toUpperCase() : "U"}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{user.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)" }}>{user.email}</div>
                          </div>
                        </div>
                        <div className="account-dropdown__divider" />
                        <Link to="/account/orders" className="account-dropdown__item" onClick={() => setAccountOpen(false)} role="menuitem">
                          📦 My Orders & Tracking
                        </Link>
                        <Link to="/wishlist" className="account-dropdown__item" onClick={() => setAccountOpen(false)} role="menuitem">
                          ❤️ My Wishlist
                        </Link>
                        {user.role === "admin" && (
                          <Link to="/admin/orders" className="account-dropdown__item" onClick={() => setAccountOpen(false)} role="menuitem">
                            ⚡ Admin Dashboard
                          </Link>
                        )}
                        <div className="account-dropdown__divider" />
                        <button className="account-dropdown__item account-dropdown__item--danger" onClick={handleLogout} role="menuitem">
                          🚪 Logout
                        </button>
                      </>
                    ) : (
                      <>
                        <Link to="/account/login" className="account-dropdown__item" onClick={() => setAccountOpen(false)} role="menuitem">Sign In</Link>
                        <Link to="/account/register" className="account-dropdown__item account-dropdown__item--accent" onClick={() => setAccountOpen(false)} role="menuitem">Create Account</Link>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Cart Shopping Bag */}
              <Link to="/cart" className="header__icon-btn" aria-label={`Cart, ${itemCount} items`} style={{ position: "relative" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                {itemCount > 0 && (
                  <span className="header__cart-count">{itemCount > 9 ? "9+" : itemCount}</span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {drawerOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setDrawerOpen(false)} />
      )}
      <div className={`mobile-drawer${drawerOpen ? " open" : ""}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--color-border)" }}>
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "1.2rem", color: "var(--color-primary)" }}>
            {siteName}
          </span>
          <button onClick={() => setDrawerOpen(false)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer" }}>✕</button>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", padding: "16px" }}>
          {navLinks.map((link, idx) => (
            <Link
              key={idx}
              to={link.url}
              onClick={() => setDrawerOpen(false)}
              style={{ padding: "12px 16px", textDecoration: "none", color: "var(--color-text)", fontWeight: 600, borderBottom: "1px solid #f1f5f9" }}
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link to="/account/orders" onClick={() => setDrawerOpen(false)} style={{ padding: "12px 16px", textDecoration: "none", color: "var(--color-text)", fontWeight: 600 }}>📦 My Orders & Tracking</Link>
              <button onClick={() => { setDrawerOpen(false); handleLogout(); }} style={{ padding: "12px 16px", textAlign: "left", background: "none", border: "none", color: "var(--color-error)", fontWeight: 600, cursor: "pointer" }}>🚪 Logout</button>
            </>
          ) : (
            <>
              <Link to="/account/login" onClick={() => setDrawerOpen(false)} style={{ padding: "12px 16px", textDecoration: "none", color: "var(--color-primary)", fontWeight: 700 }}>Sign In</Link>
              <Link to="/account/signup" onClick={() => setDrawerOpen(false)} style={{ padding: "12px 16px", textDecoration: "none", color: "var(--color-accent)", fontWeight: 700 }}>Create Account</Link>
            </>
          )}
        </nav>
      </div>

      {/* Main Page Content */}
      <main style={{ flex: 1, animation: "pageFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ background: "var(--color-surface-dark)", color: "#94a3b8", paddingTop: "var(--space-12)", paddingBottom: "var(--space-8)", borderTop: "1px solid #1e293b", marginTop: "auto" }}>
        <div className="container">
          <div className="footer-grid">
            <div>
              <h3 style={{ color: "white", fontFamily: "var(--font-heading)", fontSize: "1.3rem", marginBottom: "var(--space-4)" }}>{siteName}</h3>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "var(--space-4)" }}>
                Curating India's finest ethnic and contemporary fashion. Exceptional craftsmanship, authentic fabrics, and timeless design.
              </p>
            </div>
            <div>
              <h4 style={{ color: "white", fontSize: "1rem", marginBottom: "var(--space-4)" }}>Quick Links</h4>
              <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)", fontSize: "0.9rem" }}>
                <li><Link to="/category/all" style={{ color: "inherit", textDecoration: "none" }}>All Collections</Link></li>
                <li><Link to="/account/orders" style={{ color: "inherit", textDecoration: "none" }}>Track Order</Link></li>
                <li><Link to="/wishlist" style={{ color: "inherit", textDecoration: "none" }}>Wishlist</Link></li>
              </ul>
            </div>
            <div>
              <h4 style={{ color: "white", fontSize: "1rem", marginBottom: "var(--space-4)" }}>Customer Support</h4>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>
                Email: {settings.contact_email || "support@shopindia.com"}<br />
                Phone: {settings.contact_phone || "+91 98765 43210"}<br />
                Mon – Sat: 9:00 AM – 7:00 PM IST
              </p>
              {settings.whatsapp_number && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-accent" style={{ marginTop: "var(--space-3)", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  💬 WhatsApp Support
                </a>
              )}
            </div>
          </div>
          <div className="divider" style={{ background: "#334155", margin: "var(--space-8) 0 var(--space-6) 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-4)", fontSize: "0.85rem" }}>
            <div>© {new Date().getFullYear()} {siteName}. All rights reserved. Built with 💎 precision.</div>
            <div style={{ display: "flex", gap: "var(--space-4)" }}>
              <span>🔒 256-Bit SSL Encrypted</span>
              <span>⚡ Fast Shipping</span>
              <span>🔄 7-Day Returns</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
