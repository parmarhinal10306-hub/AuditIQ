import { useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL as API } from '../config/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!email.trim()) {
      setNotice('Please enter your email address.')
      return
    }

    setIsLoading(true)
    setNotice('')
    try {
      const response = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        setNotice(data.message || 'Something went wrong. Please try again.')
      } else {
        setIsSubmitted(true)
        setNotice(data.message || 'If an account exists, a password reset link has been sent.')
      }
    } catch {
      setNotice('Unable to connect to the server. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-panel-wrap">
        <div className="auth-panel">
          <div className="auth-header">
            <div className="page-kicker">Account Access</div>
            <h1>Forgot Password</h1>
            <p className="auth-subtitle">Enter your email to receive a password reset link.</p>
          </div>

          {isSubmitted ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#dbeafe',
                  color: '#2563eb',
                  fontSize: '1.75rem',
                  marginBottom: '1rem',
                }}
              >
                ✉
              </div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
                Check Your Inbox
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                If an account with <strong>{email}</strong> exists, we've sent a secure password reset link to your email. The link will expire in 1 hour.
              </p>

              {notice && (
                <div className="auth-notice" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                  <span aria-hidden="true">i</span>
                  <span>{notice}</span>
                </div>
              )}

              <Link to="/login" className="btn-primary auth-button" style={{ display: 'flex', textDecoration: 'none', justifyContent: 'center' }}>
                Back to Login
              </Link>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-field">
                <label htmlFor="reset-email">Email</label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>

              {notice && (
                <div className="auth-notice">
                  <span aria-hidden="true">i</span>
                  <span>{notice}</span>
                </div>
              )}

              <button type="submit" className="btn-primary auth-button" disabled={isLoading}>
                {isLoading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="auth-footer">
            <span>Remember your password?</span>
            <Link to="/login" className="text-link">Login here</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
