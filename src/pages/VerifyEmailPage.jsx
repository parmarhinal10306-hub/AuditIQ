import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { API_BASE_URL } from '../config/api'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'error' | 'no_token'
  const [message, setMessage] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resendStatus, setResendStatus] = useState('')
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (!token) {
      setStatus('no_token')
      setMessage('No verification token found in URL. Please check your verification link.')
      return
    }

    let isMounted = true

    const verify = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        const data = await response.json()

        if (!isMounted) return

        if (response.ok && data.success) {
          setStatus('success')
          setMessage(data.message || 'Your email address has been successfully verified!')
        } else {
          setStatus('error')
          setMessage(data.message || 'Verification failed. The link may be invalid or expired.')
        }
      } catch (err) {
        if (!isMounted) return
        setStatus('error')
        setMessage('Unable to connect to the verification server. Please try again later.')
      }
    }

    verify()

    return () => {
      isMounted = false
    }
  }, [token])

  const handleResend = async (e) => {
    e.preventDefault()
    if (!resendEmail.trim()) {
      setResendStatus('Please enter your email address.')
      return
    }

    setIsResending(true)
    setResendStatus('Sending verification link...')
    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail.trim() }),
      })

      const data = await response.json()
      setResendStatus(data.message || 'If an account exists, a verification link has been sent.')
    } catch {
      setResendStatus('Unable to reach server. Please try again later.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-panel-wrap">
        <div className="auth-panel">
          <div className="auth-header">
            <div className="page-kicker">Account Verification</div>
            <h1>Email Verification</h1>
          </div>

          {status === 'loading' && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div
                style={{
                  display: 'inline-block',
                  width: '36px',
                  height: '36px',
                  border: '3px solid #e2e8f0',
                  borderTopColor: '#2563eb',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginBottom: '1rem',
                }}
              />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Verifying your email address, please wait...
              </p>
            </div>
          )}

          {status === 'success' && (
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
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
                Email Verified!
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                {message}
              </p>
              <Link to="/login" className="btn-primary auth-button" style={{ display: 'flex', textDecoration: 'none', justifyContent: 'center' }}>
                Go to Login
              </Link>
            </div>
          )}

          {(status === 'error' || status === 'no_token') && (
            <div>
              <div
                className="auth-notice"
                style={{
                  backgroundColor: '#fee2e2',
                  borderColor: '#f87171',
                  color: '#991b1b',
                  marginBottom: '1.5rem',
                }}
              >
                <span aria-hidden="true">✕</span>
                <span>{message}</span>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
                  Need a new verification link?
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0 0 1rem' }}>
                  Enter your email address and we'll send you a fresh verification link.
                </p>

                <form onSubmit={handleResend} className="auth-form">
                  <div className="form-field">
                    <label htmlFor="resend-email">Email</label>
                    <input
                      id="resend-email"
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                    />
                  </div>

                  {resendStatus && (
                    <div className="auth-notice" style={{ marginBottom: '1rem' }}>
                      <span aria-hidden="true">i</span>
                      <span>{resendStatus}</span>
                    </div>
                  )}

                  <button type="submit" className="btn-primary auth-button" disabled={isResending}>
                    {isResending ? 'Sending…' : 'Resend Verification Link'}
                  </button>
                </form>
              </div>

              <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
                <Link to="/login" className="text-link">Back to Login</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
