import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState('');
  const [resetToken, setResetToken] = useState(null);

  const API = import.meta.env.VITE_API_BASE_URL;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email.trim()) {
      setNotice('Please enter your email address.');
      return;
    }
    
    setNotice('Loading...');
    setResetToken(null);
    try {
      const response = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        setNotice(data.message || 'Something went wrong.');
      } else {
        setNotice(data.message);
        if (data.resetToken) {
          setResetToken(data.resetToken);
        }
      }
    } catch (err) {
      setNotice('Unable to connect to the server. Please try again later.');
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-panel-wrap">
        <div className="auth-panel">
          <div className="auth-header">
            <div className="page-kicker">Account Access</div>
            <h1>Forgot Password</h1>
            <p className="auth-subtitle">Enter your email to reset your password.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="reset-email">Email</label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
              />
            </div>

            {notice && (
              <div className="auth-notice">
                <span aria-hidden="true">i</span>
                <span>{notice}</span>
              </div>
            )}

            {resetToken && (
              <div className="auth-notice" style={{ marginTop: '1rem', backgroundColor: '#e8f0fe', color: '#1967d2', border: '1px solid #1967d2' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span><strong>Dev Mode:</strong> Token generated!</span>
                  <Link to={`/reset-password/${resetToken}`} className="btn-primary auth-button" style={{ textAlign: 'center', textDecoration: 'none' }}>
                    Proceed to Reset Password
                  </Link>
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary auth-button">Send Reset Link</button>
          </form>

          <div className="auth-footer">
            <span>Remember your password?</span>
            <Link to="/login" className="text-link">Login here</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
