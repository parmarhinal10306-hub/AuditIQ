import { useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { API_BASE_URL } from '../config/api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState('')
  const [isUnverified, setIsUnverified] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendNotice, setResendNotice] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const navigate = useNavigate()
  const { login } = useContext(AuthContext)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!email.trim() || !password.trim()) {
      setNotice('Enter your email and password to continue.')
      return
    }

    setIsLoading(true)
    setNotice('')
    setIsUnverified(false)
    setResendNotice('')

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      let data
      try {
        data = await response.json()
      } catch {
        data = null
      }

      if (!response.ok || !data) {
        if (data?.isUnverified) {
          setIsUnverified(true)
          setNotice(data.message || 'Please verify your email address before logging in.')
        } else {
          setNotice(data?.message || 'Login failed. Please check your credentials.')
        }
      } else if (data.success && data.data && data.data.token) {
        login(data.data, data.data.token)
        setNotice('Login successful! Loading dashboard...')
        setTimeout(() => navigate('/dashboard'), 1000)
      } else {
        setNotice(data?.message || 'Login failed.')
      }
    } catch {
      setNotice('Unable to connect to the server. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!email.trim()) return

    setIsResending(true)
    setResendNotice('')
    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await response.json()
      setResendNotice(data.message || 'Verification link sent! Check your inbox.')
    } catch {
      setResendNotice('Unable to reach server. Please try again later.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-panel-wrap">
        <div className="auth-panel">
          <div className="auth-header">
            <div className="page-kicker">Account Access</div>
            <h1>Login</h1>
            <p className="auth-subtitle">Welcome back. Continue with your audit workspace.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>

            <div className="form-field">
              <div className="label-row">
                <label htmlFor="login-password">Password</label>
                <Link to="/forgot-password" className="text-link">Forgot password?</Link>
              </div>
              <div className="password-field">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button type="button" className="show-hide-button" onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {notice && (
              <div className="auth-notice" style={isUnverified ? { backgroundColor: '#fffbeb', borderColor: '#fcd34d', color: '#92400e' } : {}}>
                <span aria-hidden="true">i</span>
                <span>{notice}</span>
              </div>
            )}

            {isUnverified && (
              <div style={{ marginTop: '0.25rem', marginBottom: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="btn-secondary"
                  style={{ width: '100%', padding: '0.5rem', fontSize: '0.88rem' }}
                >
                  {isResending ? 'Sending…' : 'Resend Verification Email'}
                </button>
                {resendNotice && (
                  <p style={{ fontSize: '0.82rem', color: '#16a34a', marginTop: '0.5rem', textAlign: 'center' }}>
                    {resendNotice}
                  </p>
                )}
              </div>
            )}

            <button type="submit" className="btn-primary auth-button" disabled={isLoading}>
              {isLoading ? 'Logging in…' : 'Login'}
            </button>
          </form>

          <div className="auth-footer">
            <span>New to AuditIQ?</span>
            <Link to="/register" className="text-link">Create an account</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
