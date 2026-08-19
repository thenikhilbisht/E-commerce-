import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import StorefrontLayout from '../../components/StorefrontLayout';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Forgot Password — ShopIndia';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const data = await forgotPassword(email.trim());
      setSuccessData(data);
      toast.success('Password reset instructions generated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StorefrontLayout>
      <div className="container" style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-12)', maxWidth: '460px' }}>
        <div className="card">
          <div className="card-body">
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', marginBottom: 'var(--space-2)', textAlign: 'center' }}>Reset Your Password</h1>
            <p style={{ color: 'var(--color-text-2)', fontSize: '0.9rem', textAlign: 'center', marginBottom: 'var(--space-6)', lineHeight: 1.5 }}>
              Enter the email address associated with your account and we will generate a password reset link.
            </p>

            {successData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', background: 'var(--color-surface-2)', padding: '20px', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ color: '#10b981', fontWeight: 700, fontSize: '0.95rem', textAlign: 'center' }}>
                  ✓ Request Processed Successfully
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-2)', textAlign: 'center' }}>
                  {successData.message}
                </p>

                {/* Developer Direct Link Box for seamless testing */}
                {successData.resetUrl && (
                  <div style={{ marginTop: '12px', padding: '14px', background: 'white', border: '1px dashed var(--color-accent)', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', marginBottom: '6px', textTransform: 'uppercase' }}>
                      ⚡ Instant Reset Link (Dev Mode)
                    </p>
                    <Link
                      to={successData.resetUrl}
                      className="btn btn-accent btn-full btn-sm"
                      style={{ marginTop: '6px', textAlign: 'center' }}
                    >
                      Click Here to Reset Password →
                    </Link>
                  </div>
                )}

                <div className="divider" style={{ margin: 'var(--space-3) 0' }} />
                <Link to="/account/login" className="btn btn-ghost btn-full" style={{ textAlign: 'center' }}>
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label required" htmlFor="forgot-email">Email Address</label>
                  <input
                    id="forgot-email"
                    type="email"
                    className="form-input"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    autoComplete="email"
                    required
                  />
                  {error && <span className="form-error">{error}</span>}
                </div>

                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                  {loading ? '⏳ Generating Link…' : 'Send Reset Link'}
                </button>

                <div className="divider" style={{ margin: 'var(--space-4) 0' }} />

                <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--color-text-2)' }}>
                  Remembered your password? <Link to="/account/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Sign In</Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </StorefrontLayout>
  );
}
