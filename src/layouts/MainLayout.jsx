import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'

export default function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

      {/* ── Navbar ── */}
      <header style={{
        background: 'var(--bg-white)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 50,
        /* needed so the absolute mobile menu is anchored here */
        isolation: 'isolate',
      }}>
        <nav style={{
          maxWidth: '1120px', margin: '0 auto',
          padding: '0 1.5rem',
          minHeight: '58px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <span style={{
              width: 28, height: 28,
              background: 'var(--brand)',
              borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="4.5" stroke="white" strokeWidth="1.5"/>
                <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              AuditIQ
            </span>
          </NavLink>

          <button
            type="button"
            className="nav-toggle"
            aria-label="Open navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(value => !value)}
          >
            <span />
            <span />
            <span />
          </button>

          {/* Links */}
          <div className={menuOpen ? 'nav-menu is-open' : 'nav-menu'}>
            <a
              href="/#features"
              className="underline-grow"
              style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: 6, textDecoration: 'none', transition: 'color 0.15s' }}
              onClick={() => setMenuOpen(false)}
            >
              Features
            </a>
            {[
              { to: '/audit', label: 'Audit' },
              { to: '/dashboard', label: 'Dashboard' },
              { to: '/geo-analysis', label: 'GEO Analysis' },
            ].map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => isActive ? 'nav-link-active underline-grow' : 'underline-grow'}
                style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: 6, transition: 'color 0.15s' }}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </NavLink>
            ))}
            <a
              href="/#faq"
              className="underline-grow"
              style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: 6, textDecoration: 'none', transition: 'color 0.15s' }}
              onClick={() => setMenuOpen(false)}
            >
              FAQ
            </a>
            <div className="nav-divider" style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
            <NavLink to="/login" className="btn-ghost" style={{ padding: '5px 12px' }} onClick={() => setMenuOpen(false)}>
              Log in
            </NavLink>
            <NavLink to="/register" className="btn-primary" style={{ padding: '5px 14px' }} onClick={() => setMenuOpen(false)}>
              Get started
            </NavLink>
          </div>
        </nav>
      </header>

      {/* ── Page Content ── */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="app-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <div className="footer-logo-wrap">
              <span className="footer-logo">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="7" cy="7" r="4.5" stroke="white" strokeWidth="1.5" />
                  <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <span className="footer-product-name">AuditIQ</span>
            </div>
            <p className="footer-description">
              SEO, AEO, and GEO intelligence for teams that want cleaner search visibility and better AI answer coverage.
            </p>
          </div>

          <nav className="footer-links" aria-label="Footer navigation">
            <div>
              <div className="footer-column-title">Platform</div>
              <NavLink to="/audit" className="footer-link">Audit</NavLink>
              <NavLink to="/dashboard" className="footer-link">Dashboard</NavLink>
              <NavLink to="/geo-analysis" className="footer-link">GEO Analysis</NavLink>
            </div>
            <div>
              <div className="footer-column-title">Company</div>
              <a href="/#features" className="footer-link">Features</a>
              <a href="/#how-it-works" className="footer-link">How it works</a>
              <a href="/#faq" className="footer-link">FAQ</a>
            </div>
          </nav>

          <div className="footer-actions">
            <NavLink to="/login" className="footer-login-link">Login</NavLink>
            <NavLink to="/audit" className="btn-primary footer-start-button">Start Audit</NavLink>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} AuditIQ. All rights reserved.</span>
        </div>
      </footer>

    </div>
  )
}
