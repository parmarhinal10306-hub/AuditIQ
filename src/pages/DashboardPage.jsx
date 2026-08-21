import { Link, useNavigate } from 'react-router-dom'
import { useContext, useEffect, useState, useCallback } from 'react'
import { AuthContext } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL

const formatDate = (ds) => {
  if (!ds) return '—'
  try {
    return new Date(ds).toLocaleDateString('en-GB', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  } catch {
    return ds
  }
}

const zeroPad = (n) => String(n).padStart(2, '0')

// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, token, logout } = useContext(AuthContext)

  const [overview,  setOverview]  = useState(null)
  const [recentData, setRecentData] = useState(null)   // { audits, recommendationsSummary }
  const [loadState, setLoadState] = useState('loading') // 'loading' | 'ready' | 'error' | 'empty'
  const [errorMsg,  setErrorMsg]  = useState('')

  // Audit history state
  const [allAudits, setAllAudits]           = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [deletingId, setDeletingId]         = useState(null)
  const [deleteError, setDeleteError]       = useState('')
  const [auditPage, setAuditPage]           = useState(1)
  const [auditPagination, setAuditPagination] = useState(null) // { page, limit, total, totalPages }

  const handleLogout = () => { logout(); navigate('/login') }

  // ── Fetch audits for the history table (paginated) ─────────────────────
  const fetchAllAudits = useCallback(async (page = 1) => {
    if (!token) return
    setHistoryLoading(true)
    try {
      const res = await fetch(`${API}/audits?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401 || res.status === 403) { navigate('/login'); return }
      const data = await res.json()
      if (res.ok) {
        setAllAudits(data.data || [])
        setAuditPagination(data.pagination || null)
      }
    } catch {
      // Non-fatal – history section will show empty
    } finally {
      setHistoryLoading(false)
    }
  }, [token, navigate])

  // ── Delete handler ───────────────────────────────────────────────────────
  const handleDelete = async (auditId, auditUrl) => {
    const label = auditUrl || 'this audit'
    const confirmed = window.confirm(
      `Are you sure you want to delete the audit for:\n${label}\n\nThis action cannot be undone.`
    )
    if (!confirmed) return

    setDeletingId(auditId)
    setDeleteError('')

    try {
      const res = await fetch(`${API}/audits/${auditId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.status === 401 || res.status === 403) {
        navigate('/login')
        return
      }

      const data = await res.json()

      if (!res.ok) {
        setDeleteError(data.message || 'Failed to delete audit. Please try again.')
        return
      }

      // Remove from local state immediately for snappy UX, then re-fetch overview
      setAllAudits((prev) => prev.filter((a) => String(a._id) !== String(auditId)))

      // Also refresh overview counts
      const ovRes = await fetch(`${API}/dashboard/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (ovRes.ok) {
        const ovData = await ovRes.json()
        setOverview(ovData.data)
        // Re-check empty state
        if (ovData.data.totalAudits === 0) setLoadState('empty')
      }
    } catch {
      setDeleteError('Network error. Could not delete the audit.')
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    if (!token) { navigate('/login'); return }

    const headers = { Authorization: `Bearer ${token}` }

    const fetchDashboard = async () => {
      try {
        const [ovRes, recRes] = await Promise.all([
          fetch(`${API}/dashboard/overview`,      { headers }),
          fetch(`${API}/dashboard/recent-audits`, { headers }),
        ])

        if (ovRes.status === 401 || recRes.status === 401 ||
            ovRes.status === 403 || recRes.status === 403) {
          navigate('/login')
          return
        }

        if (!ovRes.ok || !recRes.ok) {
          const body = await ovRes.json().catch(() => ({}))
          setErrorMsg(body.message || 'Failed to load dashboard data.')
          setLoadState('error')
          return
        }

        const ovData  = await ovRes.json()
        const recData = await recRes.json()

        setOverview(ovData.data)
        setRecentData(recData.data)

        if (ovData.data.totalAudits === 0) {
          setLoadState('empty')
        } else {
          setLoadState('ready')
        }
      } catch {
        setErrorMsg('Network error: could not reach the dashboard API.')
        setLoadState('error')
      }
    }

    fetchDashboard()
  }, [token, navigate])

  // Fetch history once dashboard is ready or page changes
  useEffect(() => {
    if (loadState === 'ready') {
      fetchAllAudits(auditPage)
    }
  }, [loadState, fetchAllAudits, auditPage])

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loadState === 'loading') {
    return (
      <section className="dashboard-page">
        <div className="dashboard-shell">
          <div style={{ padding: '4rem 0', textAlign: 'center' }}>
            <div className="loading-row" style={{ justifyContent: 'center', gap: '0.75rem' }}>
              <span className="spinner" aria-hidden="true" />
              <span className="loading-text">Loading your dashboard…</span>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (loadState === 'error') {
    return (
      <section className="dashboard-page">
        <div className="dashboard-shell">
          <header className="dashboard-topbar">
            <div>
              <div className="page-kicker">Welcome back{user?.name ? `, ${user.name}` : ''}</div>
              <h1>SEO, AEO &amp; GEO Overview</h1>
            </div>
            <div className="dashboard-actions">
              <Link to="/audit" className="btn-primary">Start New Audit</Link>
              <button onClick={handleLogout} className="btn-secondary" style={{ marginLeft: '1rem', border: '1px solid #e1e4e8', background: 'transparent', color: '#6e7781' }}>Logout</button>
            </div>
          </header>
          <div style={{ padding: '3rem 0', textAlign: 'center' }}>
            <div className="form-message error-message" style={{ display: 'inline-flex', maxWidth: '480px' }} role="alert">
              <span aria-hidden="true">!</span>
              <span>{errorMsg}</span>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // ── Empty (no audits yet) ─────────────────────────────────────────────────
  if (loadState === 'empty') {
    return (
      <section className="dashboard-page">
        <div className="dashboard-shell">
          <header className="dashboard-topbar">
            <div>
              <div className="page-kicker">Welcome back{user?.name ? `, ${user.name}` : ''}</div>
              <h1>SEO, AEO &amp; GEO Overview</h1>
            </div>
            <div className="dashboard-actions">
              <Link to="/audit" className="btn-primary">Start New Audit</Link>
              <button onClick={handleLogout} className="btn-secondary" style={{ marginLeft: '1rem', border: '1px solid #e1e4e8', background: 'transparent', color: '#6e7781' }}>Logout</button>
            </div>
          </header>
          <div style={{ padding: '4rem 0', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              You haven't run any audits yet. Start your first audit to see your dashboard.
            </p>
            <Link to="/audit" className="btn-primary">Run Your First Audit</Link>
          </div>
        </div>
      </section>
    )
  }

  // ── Ready ─────────────────────────────────────────────────────────────────
  const ov   = overview
  const recs = recentData.recommendationsSummary || { high: [], medium: [], low: [] }

  return (
    <section className="dashboard-page">
      <div className="dashboard-shell">
        {/* Header */}
        <header className="dashboard-topbar">
          <div>
            <div className="page-kicker">Welcome back{user?.name ? `, ${user.name}` : ''}</div>
            <h1>SEO, AEO &amp; GEO Overview</h1>
          </div>
          <div className="dashboard-actions">
            <Link to="/audit" className="btn-primary">Start New Audit</Link>
            <button onClick={handleLogout} className="btn-secondary" style={{ marginLeft: '1rem', border: '1px solid #e1e4e8', background: 'transparent', color: '#6e7781' }}>Logout</button>
          </div>
        </header>

        {/* Score Overview */}
        <section className="dashboard-score-section">
          <div className="section-title-row">
            <div>
              <span className="section-label">Score Overview</span>
              <h2>Performance Snapshot</h2>
            </div>
            <span className="mini-label" style={{ color: '#16a34a' }}>Live Data</span>
          </div>

          <div className="score-grid">
            <article className="score-cell score-cell-primary">
              <div className="score-head">
                <span>Avg SEO Score</span>
                <span className="mini-label" style={{ color: '#16a34a' }}>Live Data</span>
              </div>
              <div className="score-number">{ov.avgSeoScore} <span>/ 100</span></div>
            </article>

            <article className="score-cell">
              <div className="score-head">
                <span>Avg AEO Score</span>
                <span className="mini-label" style={{ color: '#16a34a' }}>Live Data</span>
              </div>
              <div className="score-number">{ov.avgAeoScore} <span>/ 100</span></div>
            </article>

            <article className="score-cell">
              <div className="score-head">
                <span>Avg GEO Score</span>
                <span className="mini-label" style={{ color: '#16a34a' }}>Live Data</span>
              </div>
              <div className="score-number">{ov.avgGeoScore} <span>/ 100</span></div>
            </article>

            <article className="score-cell">
              <div className="score-head">
                <span>Total Audits</span>
                <span className="mini-label" style={{ color: '#16a34a' }}>Live Data</span>
              </div>
              <div className="score-number">{ov.totalAudits} <span>audits</span></div>
            </article>

            <article className="score-cell">
              <div className="score-head">
                <span>Completed</span>
                <span className="mini-label" style={{ color: '#16a34a' }}>Live Data</span>
              </div>
              <div className="score-number">{ov.completedAudits} <span>audits</span></div>
            </article>
          </div>
        </section>

        <section className="dashboard-lower-grid">
          {/* Recent Audits Table */}
          <section className="panel-panel recent-audits-panel">
            <div className="section-title-row compact-row">
              <div>
                <span className="section-label">Audit History</span>
                <h2>All Audits</h2>
              </div>
              <span className="mini-label" style={{ color: '#16a34a' }}>Live Data</span>
            </div>

            {/* Delete error banner */}
            {deleteError && (
              <div
                className="form-message error-message"
                role="alert"
                style={{ marginBottom: '1rem', fontSize: '0.8rem' }}
              >
                <span aria-hidden="true">!</span>
                <span>{deleteError}</span>
                <button
                  onClick={() => setDeleteError('')}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontWeight: 700, fontSize: '1rem', lineHeight: 1 }}
                  aria-label="Dismiss error"
                >
                  ×
                </button>
              </div>
            )}

            <div className="table-wrap">
              {historyLoading ? (
                <div className="loading-row" style={{ justifyContent: 'center', gap: '0.75rem', padding: '2rem 0' }}>
                  <span className="spinner" aria-hidden="true" />
                  <span className="loading-text">Loading audit history…</span>
                </div>
              ) : (
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Website</th>
                      <th>SEO</th>
                      <th>AEO</th>
                      <th>GEO</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Report</th>
                      <th>Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allAudits.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>
                          No audits found.
                        </td>
                      </tr>
                    ) : (
                      allAudits.map((audit) => {
                        const id = String(audit._id)
                        const isDeleting = deletingId === id
                        return (
                          <tr key={id} style={{ opacity: isDeleting ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                            <td className="website-name">{audit.fetchedUrl || audit.url}</td>
                            <td>{audit.seoScore != null ? `${audit.seoScore}/100` : '—'}</td>
                            <td>{audit.aeoScore != null ? `${audit.aeoScore}/100` : '—'}</td>
                            <td>{audit.geoScore != null ? `${audit.geoScore}/100` : '—'}</td>
                            <td>
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                padding: '0.2em 0.6em',
                                borderRadius: '4px',
                                background: audit.status === 'completed' ? '#d1fae5' : audit.status === 'failed' ? '#fee2e2' : '#fef9c3',
                                color: audit.status === 'completed' ? '#065f46' : audit.status === 'failed' ? '#991b1b' : '#854d0e',
                              }}>
                                {audit.status}
                              </span>
                            </td>
                            <td>{formatDate(audit.createdAt)}</td>
                            <td>
                              {audit.status === 'completed'
                                ? <Link to={`/audit-report?id=${audit._id}`} className="text-link">View Report</Link>
                                : <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>—</span>
                              }
                            </td>
                            <td>
                              <button
                                id={`delete-audit-${id}`}
                                onClick={() => handleDelete(id, audit.fetchedUrl || audit.url)}
                                disabled={isDeleting}
                                aria-label={`Delete audit for ${audit.fetchedUrl || audit.url}`}
                                style={{
                                  background: 'none',
                                  border: '1px solid #fca5a5',
                                  borderRadius: '4px',
                                  color: '#dc2626',
                                  cursor: isDeleting ? 'wait' : 'pointer',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  padding: '0.2em 0.65em',
                                  lineHeight: 1.5,
                                  transition: 'background 0.15s, color 0.15s',
                                }}
                                onMouseEnter={(e) => {
                                  if (!isDeleting) {
                                    e.currentTarget.style.background = '#fee2e2'
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'none'
                                }}
                              >
                                {isDeleting ? '…' : 'Delete'}
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination controls */}
            {auditPagination && auditPagination.totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', padding: '0.75rem 0 0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span>Page {auditPagination.page} of {auditPagination.totalPages}</span>
                <button
                  id="audit-prev-page"
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  disabled={auditPagination.page <= 1 || historyLoading}
                  style={{ padding: '0.2em 0.7em', border: '1px solid #e1e4e8', borderRadius: '4px', background: 'transparent', cursor: auditPagination.page <= 1 ? 'default' : 'pointer', opacity: auditPagination.page <= 1 ? 0.4 : 1 }}
                >
                  ← Prev
                </button>
                <button
                  id="audit-next-page"
                  onClick={() => setAuditPage((p) => Math.min(auditPagination.totalPages, p + 1))}
                  disabled={auditPagination.page >= auditPagination.totalPages || historyLoading}
                  style={{ padding: '0.2em 0.7em', border: '1px solid #e1e4e8', borderRadius: '4px', background: 'transparent', cursor: auditPagination.page >= auditPagination.totalPages ? 'default' : 'pointer', opacity: auditPagination.page >= auditPagination.totalPages ? 0.4 : 1 }}
                >
                  Next →
                </button>
              </div>
            )}
          </section>

          {/* Issues Summary */}
          <aside className="panel-panel issue-panel">
            <div className="section-title-row compact-row">
              <div>
                <span className="section-label">Health Check</span>
                <h2>Issues Summary</h2>
              </div>
              <span className="mini-label" style={{ color: '#16a34a' }}>Live Data</span>
            </div>

            <div className="issue-summary-grid">
              <article className="issue-item">
                <div>
                  <div className="issue-number danger">{zeroPad(ov.criticalCount)}</div>
                  <div className="issue-label">Critical Issues</div>
                </div>
              </article>
              <article className="issue-item">
                <div>
                  <div className="issue-number warning">{zeroPad(ov.warningCount)}</div>
                  <div className="issue-label">Warnings</div>
                </div>
              </article>
              <article className="issue-item">
                <div>
                  <div className="issue-number success">{zeroPad(ov.passedCount)}</div>
                  <div className="issue-label">Passed Checks</div>
                </div>
              </article>
            </div>
          </aside>
        </section>

        {/* Recommendations Summary */}
        <section className="panel-panel recommendations-panel">
          <div className="section-title-row compact-row">
            <div>
              <span className="section-label">Recommended Actions</span>
              <h2>Recommendations</h2>
            </div>
            <span className="mini-label" style={{ color: '#16a34a' }}>Live Data</span>
          </div>

          {recs.high.length === 0 && recs.medium.length === 0 && recs.low.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>
              No recommendations yet. Run an audit to see actionable insights.
            </p>
          ) : (
            <div className="recommendation-list">
              {/* High priority first */}
              {recs.high.map((item, idx) => (
                <article className="recommendation" key={`hp-${idx}`}>
                  <span className="recommendation-icon">HP</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.explanation}</p>
                  </div>
                </article>
              ))}
              {/* Then medium */}
              {recs.medium.map((item, idx) => (
                <article className="recommendation" key={`mp-${idx}`}>
                  <span className="recommendation-icon">MP</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.explanation}</p>
                  </div>
                </article>
              ))}
              {/* Then low */}
              {recs.low.map((item, idx) => (
                <article className="recommendation" key={`lp-${idx}`}>
                  <span className="recommendation-icon">LP</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.explanation}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

      </div>
    </section>
  )
}
