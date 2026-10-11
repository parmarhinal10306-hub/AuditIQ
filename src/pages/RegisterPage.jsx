import { useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../config/api'

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [registeredSuccess, setRegisteredSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const hasRequiredFields =
      form.name.trim() && form.email.trim() && form.password.trim() && form.confirmPassword.trim()
    if (!hasRequiredFields) {
      setNotice('Complete every field to create your account.')
      return
    }

    if (form.password.length < 6) {
      setNotice('Password must be at least 6 characters long.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setNotice('Passwords do not match.')
      return
    }

    setIsLoading(true)
    setNotice('')
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setNotice(data.message || 'Registration failed.')
      } else {
        setRegisteredSuccess(true)
        setRegisteredEmail(form.email.trim())
        setNotice(data.message)
      }
    } catch (error) {
      setNotice('Unable to connect to the server. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-panel-wrap">
        <div className="auth-panel auth-panel-wide">
          <div className="auth-header">
            <div className="page-kicker">Create Account</div>
            <h1>Create Account</h1>
            <p className="auth-subtitle">Start auditing your website visibility and answer-engine readiness.</p>
          </div>

          {registeredSuccess ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#dcfce7',
                  color: '#16a34a',
                  fontSize: '1.75rem',
                  marginBottom: '1rem',
                }}
              >
                ✓
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
                Verify Your Email
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                We've sent a verification link to <strong>{registeredEmail}</strong>. Please check your inbox (and spam folder) and click the link to activate your account.
              </p>

              {notice && (
                <div className="auth-notice" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                  <span aria-hidden="true">i</span>
                  <span>{notice}</span>
                </div>
              )}

              <Link to="/login" className="btn-primary auth-button" style={{ display: 'flex', textDecoration: 'none', justifyContent: 'center' }}>
                Go to Login
              </Link>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-field">
                <label htmlFor="register-name">Full Name</label>
                <input
                  id="register-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="register-email">Email</label>
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="register-password">Password</label>
                <div className="password-field">
                  <input
                    id="register-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Create a password (min. 6 characters)"
                    required
                    minLength={6}
                  />
                  <button type="button" className="show-hide-button" onClick={() => setShowPassword((value) => !value)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="register-confirm-password">Confirm Password</label>
                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  required
                  minLength={6}
                />
              </div>

              {notice && (
                <div className="auth-notice">
                  <span aria-hidden="true">i</span>
                  <span>{notice}</span>
                </div>
              )}

              <button type="submit" className="btn-primary auth-button" disabled={isLoading}>
                {isLoading ? 'Creating Account…' : 'Create Account'}
              </button>
            </form>
          )}

          <div className="auth-footer">
            <span>Already have an account?</span>
            <Link to="/login" className="text-link">Login</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
