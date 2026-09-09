import { useMemo, useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

export default function AuditPage() {
  const [url, setUrl] = useState('')
  const [auditState, setAuditState] = useState('default')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('Please enter a valid website URL starting with http:// or https://')

  const navigate = useNavigate()
  const { token } = useContext(AuthContext)

  const exampleUrl = 'https://example.com'
  const pageTitle = useMemo(() => {
    if (auditState === 'loading') return 'Analyzing your website...'
    if (auditState === 'error') return 'Audit request needs attention'
    if (auditState === 'success') return 'Your audit request is ready'
    return 'Audit Your Website'
  }, [auditState])

  const startAudit = async (event) => {
    event.preventDefault()
    const cleanedUrl = url.trim()

    if (!cleanedUrl) {
      setErrorMessage('Please enter a valid website URL starting with http:// or https://')
      setAuditState('error')
      return
    }

    try {
      const parsedUrl = new URL(cleanedUrl)
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Unsupported protocol')
      }
    } catch {
      setErrorMessage('Please enter a valid website URL starting with http:// or https://')
      setAuditState('error')
      return
    }

    if (!token) {
      setErrorMessage('You must be logged in to create an audit.')
      setAuditState('error')
      return
    }

    setAuditState('loading')
    setProgress(30)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/audits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ url: cleanedUrl })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          setErrorMessage('Session expired. Please log in again.')
        } else {
          setErrorMessage(data.message || 'Failed to create audit request.')
        }
        setAuditState('error')
        return
      }

      setProgress(100)
      setAuditState('success')
      
      // Redirect to the newly established audit ID
      setTimeout(() => {
        navigate(`/audit-report?id=${data.data._id}`)
      }, 1500)
      
    } catch (err) {
      setErrorMessage('Unable to connect to the server. Please try again later.')
      setAuditState('error')
    }
  }

  return (
    <section className="audit-page">
      <div className="audit-shell">
        <div className="audit-layout">
          <div className="audit-copy">
            <div className="page-kicker">SEO + AEO + GEO Workspace</div>
            <h1>{pageTitle}</h1>
            <p className="audit-subtitle">
              Enter your website address to start a full SEO, AEO, and GEO diagnostic — covering technical health, content structure, answer-engine readiness, and generative engine citability.
            </p>

            <div className="audit-card">
              <form className="audit-form" onSubmit={startAudit}>
                <label className="field-label" htmlFor="audit-url-input">
                  Website URL
                </label>
                <div className="url-input-wrap">
                  <span className="url-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M10.7 18.3a7.6 7.6 0 1 1 0-15.2 7.6 7.6 0 0 1 0 15.2Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="m16.3 16.3 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                  <input
                    id="audit-url-input"
                    type="url"
                    value={url}
                    onChange={(event) => {
                      setUrl(event.target.value)
                      if (auditState !== 'loading') {
                        setAuditState('default')
                      }
                    }}
                    placeholder="https://yourwebsite.com"
                    className="url-input"
                  />
                  <button type="submit" className="btn-primary audit-button">
                    Start Audit
                  </button>
                </div>

                <div className="example-row">
                  <span className="example-label">Example:</span>
                  <button type="button" className="text-button" onClick={() => setUrl(exampleUrl)}>
                    {exampleUrl}
                  </button>
                </div>

                {auditState === 'error' && (
                  <div className="form-message error-message" role="alert">
                    <span aria-hidden="true">!</span>
                    <span>{errorMessage}</span>
                  </div>
                )}

                {auditState === 'loading' && (
                  <div className="loading-panel">
                    <div className="loading-row">
                      <span className="spinner" aria-hidden="true" />
                      <span className="loading-text">Analyzing your website...</span>
                    </div>
                    <div className="progress-wrap" aria-label="Audit progress">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="progress-label">{progress}%</span>
                    </div>
                  </div>
                )}

                {auditState === 'success' && (
                  <div className="form-message success-message">
                    <span aria-hidden="true">✓</span>
                    <span>Audit request captured. The report steps are ready to be generated.</span>
                  </div>
                )}
              </form>
            </div>
          </div>

          <aside className="audit-aside">
            <div className="aside-card">
              <div className="aside-title">Audit Scope</div>
              <ul className="scope-list">
                <li>
                  <span aria-hidden="true">●</span>
                  SEO — Technical health &amp; on-page signals
                </li>
                <li>
                  <span aria-hidden="true">●</span>
                  AEO — Answer engine &amp; schema readiness
                </li>
                <li>
                  <span aria-hidden="true">●</span>
                  GEO — Generative engine citability signals
                </li>
              </ul>
              <div className="aside-divider" />
              <div className="mini-insights">
                <div>
                  <span className="mini-label">Estimated report</span>
                  <span className="mini-value">SEO + AEO + GEO</span>
                </div>
                <div>
                  <span className="mini-label">Status</span>
                  <span className="mini-value">Ready</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}
