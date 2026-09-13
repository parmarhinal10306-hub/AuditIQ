import { useEffect, useState, useContext } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { generateAuditPdf } from '../utils/generateAuditPdf'
import { API_BASE_URL } from '../config/api'



// ─── Helpers ─────────────────────────────────────────────────────────────────
const severityClass = (severity) => {
  if (!severity) return ''
  const s = severity.toLowerCase()
  if (s === 'critical') return 'severity-critical'
  if (s === 'warning') return 'severity-warning'
  if (s === 'passed') return 'severity-passed'
  return ''
}

const formatDate = (dateString) => {
  if (!dateString) return '—'
  try {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric', month: 'short', day: 'numeric'
    })
  } catch {
    return dateString
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function AuditReportPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { token } = useContext(AuthContext)

  const auditId = searchParams.get('id')

  const [audit, setAudit] = useState(null)
  const [loadState, setLoadState] = useState('loading') // 'loading' | 'ready' | 'error'
  const [errorMsg, setErrorMsg] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState('')

  const handleDownloadPdf = async () => {
    if (!audit || audit.status !== 'completed') return
    setPdfLoading(true)
    setPdfError('')
    try {
      await generateAuditPdf(audit)
    } catch (err) {
      console.error('PDF generation failed:', err)
      setPdfError('Failed to generate PDF. Please try again.')
    } finally {
      setPdfLoading(false)
    }
  }

  useEffect(() => {
    if (!auditId) {
      setErrorMsg('No audit ID found in the URL.')
      setLoadState('error')
      return
    }

    if (!token) {
      navigate('/login')
      return
    }

    const fetchAudit = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/audits/${auditId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        const data = await res.json()

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            navigate('/login')
            return
          }
          setErrorMsg(data.message || 'Failed to load audit report.')
          setLoadState('error')
          return
        }

        setAudit(data.data)
        setLoadState('ready')
      } catch (err) {
        setErrorMsg('Unable to connect to the server. Please try again later.')
        setLoadState('error')
      }
    }

    fetchAudit()
  }, [auditId, token, navigate])

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loadState === 'loading') {
    return (
      <section className="report-page">
        <div className="report-shell">
          <div style={{ padding: '4rem 0', textAlign: 'center' }}>
            <div className="loading-row" style={{ justifyContent: 'center', gap: '0.75rem' }}>
              <span className="spinner" aria-hidden="true" />
              <span className="loading-text">Loading audit report…</span>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (loadState === 'error' || !audit) {
    return (
      <section className="report-page">
        <div className="report-shell">
          <div style={{ padding: '4rem 0', textAlign: 'center' }}>
            <div className="form-message error-message" style={{ display: 'inline-flex', maxWidth: '480px' }} role="alert">
              <span aria-hidden="true">!</span>
              <span>{errorMsg || 'Audit not found.'}</span>
            </div>
            <br />
            <Link to="/audit" className="btn-primary" style={{ marginTop: '1.5rem', display: 'inline-block' }}>
              Start New Audit
            </Link>
          </div>
        </div>
      </section>
    )
  }

  // ── Failed audit state ─────────────────────────────────────────────────────
  if (audit.status === 'failed') {
    return (
      <section className="report-page">
        <div className="report-shell">
          <header className="report-header">
            <div>
              <div className="page-kicker">SEO + AEO + GEO Intelligence</div>
              <h1 className="report-title">Audit Failed</h1>
              <div className="report-meta">
                <span className="report-url break-all">{audit.url}</span>
                <span className="meta-separator">•</span>
                <span className="report-date">{formatDate(audit.createdAt)}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
              <Link to="/audit" className="btn-primary flex justify-center">Try Again</Link>
            </div>
          </header>
          <div style={{ padding: '2rem 0' }}>
            <div className="form-message error-message" style={{ maxWidth: '560px' }} role="alert">
              <span aria-hidden="true">!</span>
              <span>{audit.errorMessage || 'The audit could not be completed. The website may be unreachable or returned a non-HTML response.'}</span>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // ── Successful audit ───────────────────────────────────────────────────────
  const seoChecks = audit.seoChecks || []
  const seoIssues = audit.seoIssues || []
  const seoRecs = audit.seoRecommendations || { high: [], medium: [], low: [] }

  const criticalIssues = seoIssues.filter((i) => i.severity === 'Critical')
  const warnings = seoIssues.filter((i) => i.severity === 'Warning')
  const passedChecks = seoChecks.filter((i) => i.severity === 'Passed')

  // AEO Variables
  const aeoChecks = audit.aeoChecks || []
  const aeoRecs = audit.aeoRecommendations || { high: [], medium: [], low: [] }

  // GEO Variables
  const geoChecks = audit.geoChecks || []
  const geoRecs = audit.geoRecommendations || { high: [], medium: [], low: [] }

  return (
    <section className="report-page">
      <div className="report-shell">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <header className="report-header">
          <div>
            <div className="page-kicker">SEO + AEO + GEO Intelligence</div>
            <h1 className="report-title">Website Audit Report</h1>
            <div className="report-meta">
              <span className="report-url break-all">{audit.fetchedUrl || audit.url}</span>
              <span className="meta-separator">•</span>
              <span className="report-date">Audit Date: {formatDate(audit.createdAt)}</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mt-6 md:mt-0">
            <span
              className="sample-report-badge self-start sm:self-auto"
              style={{ background: audit.status === 'completed' ? '#d1fae5' : undefined, color: audit.status === 'completed' ? '#065f46' : undefined }}
            >
              {audit.status === 'completed' ? 'Completed' : audit.status}
            </span>

            {audit.status === 'completed' && (
              <button
                id="download-pdf-btn"
                className="btn-primary"
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  opacity: pdfLoading ? 0.7 : 1,
                  cursor: pdfLoading ? 'wait' : 'pointer',
                }}
                aria-label="Download PDF report"
                title="Download a full PDF copy of this audit report"
              >
                {pdfLoading ? (
                  <>
                    <span
                      className="spinner"
                      aria-hidden="true"
                      style={{ width: '0.9em', height: '0.9em', borderWidth: '2px' }}
                    />
                    Generating PDF…
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download PDF Report
                  </>
                )}
              </button>
            )}

            {pdfError && (
              <p
                role="alert"
                style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.35rem' }}
              >
                {pdfError}
              </p>
            )}

            <Link to="/audit" className="btn-primary flex justify-center">Start New Audit</Link>
          </div>
        </header>

        {/* ── Score Overview ────────────────────────────────────────────── */}
        <section className="report-score-section">
          <div className="section-title-row">
            <div>
              <span className="section-label">Score Overview</span>
              <h2>Performance Snapshot</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
            <article className="score-cell score-cell-primary break-words min-w-0">
              <div className="score-head">
                <span>SEO Score</span>
                <span className="mini-label">Live Data</span>
              </div>
              <div className="score-number">{audit.seoScore ?? '—'} <span>/ 100</span></div>
            </article>

            <article className="score-cell break-words min-w-0">
              <div className="score-head">
                <span>AEO Score</span>
                <span className="mini-label" style={{ color: '#16a34a' }}>Live Data</span>
              </div>
              <div className="score-number">{audit.aeoScore ?? '—'} <span>/ 100</span></div>
            </article>

            <article className="score-cell break-words min-w-0">
              <div className="score-head">
                <span>GEO Score</span>
                <span className="mini-label" style={{ color: '#16a34a' }}>Live Data</span>
              </div>
              <div className="score-number">{audit.geoScore ?? '—'} <span>/ 100</span></div>
            </article>

            <article className="score-cell break-words min-w-0">
              <div className="score-head">
                <span>Technical SEO</span>
                {audit.technicalScore ? (
                  <span className="mini-label" style={{ color: '#16a34a' }}>Live Data</span>
                ) : (
                  <span className="mini-label">Not available</span>
                )}
              </div>
              <div className="score-number">{audit.technicalScore ? audit.technicalScore : '—'} <span>/ 100</span></div>
            </article>

            <article className="score-cell break-words min-w-0">
              <div className="score-head">
                <span>On-Page SEO</span>
                {audit.onPageScore ? (
                  <span className="mini-label" style={{ color: '#16a34a' }}>Live Data</span>
                ) : (
                  <span className="mini-label">Not available</span>
                )}
              </div>
              <div className="score-number">{audit.onPageScore ? audit.onPageScore : '—'} <span>/ 100</span></div>
            </article>

            <article className="score-cell break-words min-w-0">
              <div className="score-head">
                <span>Content</span>
                {audit.contentScore ? (
                  <span className="mini-label" style={{ color: '#16a34a' }}>Live Data</span>
                ) : (
                  <span className="mini-label">Not available</span>
                )}
              </div>
              <div className="score-number">{audit.contentScore ? audit.contentScore : '—'} <span>/ 100</span></div>
            </article>
          </div>
        </section>

        {/* ── SEO Issues ────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
          {/* Critical */}
          <section className="panel-panel report-issue-panel">
            <div className="section-title-row compact-row">
              <div>
                <span className="section-label">SEO Issues</span>
                <h2>Critical Issues</h2>
              </div>
              <span className="mini-label" style={{ color: '#16a34a' }}>Live Data</span>
            </div>
            <div className="issue-list">
              {criticalIssues.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>No critical issues found. Great work!</p>
              ) : (
                criticalIssues.map((issue) => (
                  <article className="issue-row" key={issue.issue}>
                    <div className="issue-row-top">
                      <h3>{issue.issue}</h3>
                      <span className={`severity ${severityClass(issue.severity)}`}>{issue.severity}</span>
                    </div>
                    <p>{issue.explanation}</p>
                    <div className="fix-block">
                      <span>Recommended fix:</span>
                      <p>{issue.fix}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          {/* Warnings */}
          <section className="panel-panel report-issue-panel">
            <div className="section-title-row compact-row">
              <div>
                <span className="section-label">SEO Analysis</span>
                <h2>Warnings</h2>
              </div>
              <span className="mini-label" style={{ color: '#16a34a' }}>Live Data</span>
            </div>
            <div className="issue-list">
              {warnings.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>No warnings found.</p>
              ) : (
                warnings.map((issue) => (
                  <article className="issue-row" key={issue.issue}>
                    <div className="issue-row-top">
                      <h3>{issue.issue}</h3>
                      <span className={`severity ${severityClass(issue.severity)}`}>{issue.severity}</span>
                    </div>
                    <p>{issue.explanation}</p>
                    <div className="fix-block">
                      <span>Recommended fix:</span>
                      <p>{issue.fix}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          {/* Passed */}
          <section className="panel-panel report-issue-panel">
            <div className="section-title-row compact-row">
              <div>
                <span className="section-label">SEO Analysis</span>
                <h2>Passed Checks</h2>
              </div>
              <span className="mini-label" style={{ color: '#16a34a' }}>Live Data</span>
            </div>
            <div className="issue-list">
              {passedChecks.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>No passing checks recorded.</p>
              ) : (
                passedChecks.map((issue) => (
                  <article className="issue-row" key={issue.title}>
                    <div className="issue-row-top">
                      <h3>{issue.title}</h3>
                      <span className={`severity ${severityClass(issue.severity)}`}>{issue.severity}</span>
                    </div>
                    <p>{issue.explanation}</p>
                    <div className="fix-block">
                      <span>Recommended fix:</span>
                      <p>{issue.recommendation}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>

        {/* ── SEO Recommendations ─────────────────────────────────────────── */}
        <section className="panel-panel recommendations-panel">
          <div className="section-title-row compact-row">
            <div>
              <span className="section-label">Prioritized SEO Plan</span>
              <h2>SEO Recommendations</h2>
            </div>
            <span className="mini-label" style={{ color: '#16a34a' }}>Live Data</span>
          </div>
          <div className="recommendation-stack">
            {seoRecs.high && seoRecs.high.length > 0 && (
              <article className="recommendation-tier">
                <div className="recommendation-tier-head"><span className="tier-label high">High Priority</span></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {seoRecs.high.map((item) => (
                    <article className="recommendation" key={item.title}>
                      <span className="recommendation-icon">HP</span>
                      <div><h3>{item.title}</h3><p>{item.explanation}</p></div>
                    </article>
                  ))}
                </div>
              </article>
            )}
            {seoRecs.medium && seoRecs.medium.length > 0 && (
              <article className="recommendation-tier">
                <div className="recommendation-tier-head"><span className="tier-label medium">Medium Priority</span></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {seoRecs.medium.map((item) => (
                    <article className="recommendation" key={item.title}>
                      <span className="recommendation-icon">MP</span>
                      <div><h3>{item.title}</h3><p>{item.explanation}</p></div>
                    </article>
                  ))}
                </div>
              </article>
            )}
            {seoRecs.low && seoRecs.low.length > 0 && (
              <article className="recommendation-tier">
                <div className="recommendation-tier-head"><span className="tier-label low">Low Priority / Passing</span></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {seoRecs.low.map((item) => (
                    <article className="recommendation" key={item.title}>
                      <span className="recommendation-icon">LP</span>
                      <div><h3>{item.title}</h3><p>{item.explanation}</p></div>
                    </article>
                  ))}
                </div>
              </article>
            )}
            {seoRecs.high?.length === 0 && seoRecs.medium?.length === 0 && seoRecs.low?.length === 0 && (
              <p style={{ color: 'var(--text-secondary)' }}>No recommendations generated for SEO.</p>
            )}
          </div>
        </section>

        {/* ── AEO Analysis ───────────────────────────────────────────────── */}
        <section className="panel-panel aeo-analysis-panel">
          <div className="section-title-row compact-row">
            <div>
              <span className="section-label">AEO Analysis</span>
              <h2>Answer Engine Readiness</h2>
            </div>
            <span className="mini-label" style={{ color: '#16a34a' }}>Live Data</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {aeoChecks.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No AEO checks found.</p>
            ) : (
              aeoChecks.map((check) => (
                <article className="aeo-check" key={check.title}>
                  <div className="aeo-check-head">
                    <span>{check.title}</span>
                    <span className={`severity ${severityClass(check.severity)}`}>{check.severity}</span>
                  </div>
                  <p>{check.explanation}</p>
                </article>
              ))
            )}
          </div>
        </section>

        {/* ── AEO Recommendations ────────────────────────────────────────── */}
        <section className="panel-panel recommendations-panel">
          <div className="section-title-row compact-row">
            <div>
              <span className="section-label">Prioritized AEO Plan</span>
              <h2>AEO Recommendations</h2>
            </div>
            <span className="mini-label" style={{ color: '#16a34a' }}>Live Data</span>
          </div>
          <div className="recommendation-stack">
            {aeoRecs.high && aeoRecs.high.length > 0 && (
              <article className="recommendation-tier">
                <div className="recommendation-tier-head"><span className="tier-label high">High Priority</span></div>
                <div className="recommendation-list report-recommendations">
                  {aeoRecs.high.map((item) => (
                    <article className="recommendation" key={item.title}>
                      <span className="recommendation-icon">HP</span>
                      <div><h3>{item.title}</h3><p>{item.explanation}</p></div>
                    </article>
                  ))}
                </div>
              </article>
            )}
            {aeoRecs.medium && aeoRecs.medium.length > 0 && (
              <article className="recommendation-tier">
                <div className="recommendation-tier-head"><span className="tier-label medium">Medium Priority</span></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {aeoRecs.medium.map((item) => (
                    <article className="recommendation" key={item.title}>
                      <span className="recommendation-icon">MP</span>
                      <div><h3>{item.title}</h3><p>{item.explanation}</p></div>
                    </article>
                  ))}
                </div>
              </article>
            )}
            {aeoRecs.low && aeoRecs.low.length > 0 && (
              <article className="recommendation-tier">
                <div className="recommendation-tier-head"><span className="tier-label low">Low Priority / Passing</span></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {aeoRecs.low.map((item) => (
                    <article className="recommendation" key={item.title}>
                      <span className="recommendation-icon">LP</span>
                      <div><h3>{item.title}</h3><p>{item.explanation}</p></div>
                    </article>
                  ))}
                </div>
              </article>
            )}
            {aeoRecs.high?.length === 0 && aeoRecs.medium?.length === 0 && aeoRecs.low?.length === 0 && (
              <p style={{ color: 'var(--text-secondary)' }}>No recommendations generated for AEO.</p>
            )}
          </div>
        </section>

        {/* ── GEO Analysis ───────────────────────────────────────────────── */}
        <section className="panel-panel geo-analysis-panel">
          <div className="section-title-row compact-row">
            <div>
              <span className="section-label">GEO Analysis</span>
              <h2>Generative Engine Readiness</h2>
            </div>
            <span className="mini-label" style={{ color: '#16a34a' }}>Live Data</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {geoChecks.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No GEO checks found.</p>
            ) : (
              geoChecks.map((check) => (
                <article className="aeo-check" style={{ borderLeft: '3px solid #16a34a' }} key={check.title}>
                  <div className="aeo-check-head">
                    <span>{check.title}</span>
                    <span className={`severity ${severityClass(check.severity)}`}>{check.severity}</span>
                  </div>
                  <p>{check.explanation}</p>
                  <div className="fix-block" style={{ marginTop: '0.75rem' }}>
                    <span>Recommended improvement:</span>
                    <p style={{ margin: 0 }}>{check.recommendation}</p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        {/* ── GEO Recommendations ────────────────────────────────────────── */}
        <section className="panel-panel recommendations-panel">
          <div className="section-title-row compact-row">
            <div>
              <span className="section-label">Prioritized GEO Plan</span>
              <h2>GEO Recommendations</h2>
            </div>
            <span className="mini-label" style={{ color: '#16a34a' }}>Live Data</span>
          </div>
          <div className="recommendation-stack">
            {geoRecs.high && geoRecs.high.length > 0 && (
              <article className="recommendation-tier">
                <div className="recommendation-tier-head"><span className="tier-label high">High Priority</span></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {geoRecs.high.map((item) => (
                    <article className="recommendation" key={item.title}>
                      <span className="recommendation-icon">HP</span>
                      <div><h3>{item.title}</h3><p>{item.explanation}</p></div>
                    </article>
                  ))}
                </div>
              </article>
            )}
            {geoRecs.medium && geoRecs.medium.length > 0 && (
              <article className="recommendation-tier">
                <div className="recommendation-tier-head"><span className="tier-label medium">Medium Priority</span></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {geoRecs.medium.map((item) => (
                    <article className="recommendation" key={item.title}>
                      <span className="recommendation-icon">MP</span>
                      <div><h3>{item.title}</h3><p>{item.explanation}</p></div>
                    </article>
                  ))}
                </div>
              </article>
            )}
            {geoRecs.low && geoRecs.low.length > 0 && (
              <article className="recommendation-tier">
                <div className="recommendation-tier-head"><span className="tier-label low">Low Priority / Passing</span></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {geoRecs.low.map((item) => (
                    <article className="recommendation" key={item.title}>
                      <span className="recommendation-icon">LP</span>
                      <div><h3>{item.title}</h3><p>{item.explanation}</p></div>
                    </article>
                  ))}
                </div>
              </article>
            )}
            {geoRecs.high?.length === 0 && geoRecs.medium?.length === 0 && geoRecs.low?.length === 0 && (
              <p style={{ color: 'var(--text-secondary)' }}>No recommendations generated for GEO.</p>
            )}
          </div>
        </section>

      </div>
    </section>
  )
}
