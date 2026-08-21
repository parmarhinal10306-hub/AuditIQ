import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState('');

  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!password.trim() || !confirmPassword.trim()) {
      setNotice('Please enter and confirm your new password.');
      return;
    }

    if (password !== confirmPassword) {
      setNotice('Passwords do not match.');
      return;
    }

    setNotice('Loading...');
    try {
      const response = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setNotice(data.message || 'Something went wrong.');
      } else {
        setNotice(data.message + ' Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      setNotice('Network error: Unable to connect to the server.');
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-panel-wrap">
        <div className="auth-panel">
          <div className="auth-header">
            <div className="page-kicker">Account Access</div>
            <h1>Reset Password</h1>
            <p className="auth-subtitle">Enter your new password below.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <div className="label-row">
                <label htmlFor="new-password">New Password</label>
              </div>
              <div className="password-field">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength="6"
                />
                <button type="button" className="show-hide-button" onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="confirm-password">Confirm Password</label>
              <div className="password-field">
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength="6"
                />
              </div>
            </div>

            {notice && (
              <div className="auth-notice">
                <span aria-hidden="true">i</span>
                <span>{notice}</span>
              </div>
            )}

            <button type="submit" className="btn-primary auth-button">Reset Password</button>
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
