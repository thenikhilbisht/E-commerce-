import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Storefront Pages
import HomePage from './pages/storefront/HomePage';
import CategoryPage from './pages/storefront/CategoryPage';
import ProductDetailPage from './pages/storefront/ProductDetailPage';
import CartPage from './pages/storefront/CartPage';
import CheckoutPage from './pages/storefront/CheckoutPage';
import OrderConfirmationPage from './pages/storefront/OrderConfirmationPage';
import LoginPage from './pages/storefront/LoginPage';
import SignupPage from './pages/storefront/SignupPage';
import ForgotPasswordPage from './pages/storefront/ForgotPasswordPage';
import ResetPasswordPage from './pages/storefront/ResetPasswordPage';
import MyOrdersPage from './pages/storefront/MyOrdersPage';
import StaticPage from './pages/storefront/StaticPage';
import WishlistPage from './pages/storefront/WishlistPage';

// Admin Pages
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminPagesPage from './pages/admin/AdminPagesPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';

// Protected Route wrappers
function RequireAdmin({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh' }}>
        <div className="spinner lg"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Storefront Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/category/:slug" element={<CategoryPage />} />
      <Route path="/product/:id" element={<ProductDetailPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />

      {/* Order Routes (Multiple URL aliases for seamless UX) */}
      <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
      <Route path="/orders" element={<MyOrdersPage />} />
      <Route path="/orders/:orderId" element={<OrderConfirmationPage />} />
      <Route path="/account/orders" element={<MyOrdersPage />} />
      <Route path="/account/orders/:orderId" element={<OrderConfirmationPage />} />

      {/* Auth Routes */}
      <Route path="/account/login" element={<LoginPage />} />
      <Route path="/account/signup" element={<SignupPage />} />
      <Route path="/account/register" element={<SignupPage />} />
      <Route path="/account/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/account/reset-password" element={<ResetPasswordPage />} />
      <Route path="/wishlist" element={<WishlistPage />} />
      <Route path="/page/:slug" element={<StaticPage />} />

      {/* Admin Routes */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        path="/admin/orders"
        element={
          <RequireAdmin>
            <AdminOrdersPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/products"
        element={
          <RequireAdmin>
            <AdminProductsPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/pages"
        element={
          <RequireAdmin>
            <AdminPagesPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <RequireAdmin>
            <AdminSettingsPage />
          </RequireAdmin>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
