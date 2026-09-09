import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState('')

  const navigate = useNavigate()

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const hasRequiredFields = form.name.trim() && form.email.trim() && form.password.trim() && form.confirmPassword.trim()
    if (!hasRequiredFields) {
      setNotice('Complete every field to create your account.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setNotice('Passwords do not match.')
      return
    }

    setNotice('Loading...')
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setNotice(data.message || 'Registration failed.');
      } else {
        setNotice('Registration successful! Redirecting to setup...');
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (error) {
      setNotice('Unable to connect to the server. Please try again later.');
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
                  placeholder="Create a password"
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
              />
            </div>

            {notice && (
              <div className="auth-notice">
                <span aria-hidden="true">i</span>
                <span>{notice}</span>
              </div>
            )}

            <button type="submit" className="btn-primary auth-button">Create Account</button>
          </form>

          <div className="auth-footer">
            <span>Already have an account?</span>
            <Link to="/login" className="text-link">Login</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
