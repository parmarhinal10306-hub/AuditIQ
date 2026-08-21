import { useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState('')

  const navigate = useNavigate()
  const { login } = useContext(AuthContext)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!email.trim() || !password.trim()) {
      setNotice('Enter your email and password to continue.')
      return
    }

    setNotice('Loading...')
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      })

      const data = await response.json()

      if (!response.ok) {
        setNotice(data.message || 'Login failed.')
      } else {
        login(data.data, data.data.token)
        setNotice('Login successful! Loading dashboard...')
        setTimeout(() => navigate('/dashboard'), 1000)
      }
    } catch (err) {
      setNotice('Network error: Unable to connect to the server.')
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
                />
                <button type="button" className="show-hide-button" onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {notice && (
              <div className="auth-notice">
                <span aria-hidden="true">i</span>
                <span>{notice}</span>
              </div>
            )}

            <button type="submit" className="btn-primary auth-button">Login</button>
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
