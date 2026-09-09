import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

/* ─── Tiny inline SVG icon ─── */
const Icon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const ICONS = {
  search:    'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm7-7-4.35-4.35',
  ai:        'M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z',
  check:     'M20 6 9 17l-5-5',
  arrow:     'M5 12h14M13 6l6 6-6 6',
  schema:    'M16 18l6-6-6-6M8 6l-6 6 6 6',
  eye:       'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  warn:      'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
  info:      'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 8v4m0 4h.01',
  technical: 'M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83',
  onpage:    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  content:   'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z',
  bolt:      'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
}

/* Circle ring SVG for scores */
const ScoreRing = ({ score, max = 100, colour, size = 72, stroke = 6 }) => {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / max)
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={colour} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span style={{
        position: 'absolute', fontWeight: 700,
        fontSize: size > 60 ? '1.15rem' : '0.85rem',
        color: colour, lineHeight: 1,
      }}>
        {score}
      </span>
    </div>
  )
}

/* ─── What we audit ─── */
const AUDIT_CHECKS = [
  { category: 'On-page SEO',      items: ['Title tag & meta description', 'Heading hierarchy (H1–H6)', 'Canonical tags', 'Internal linking structure'] },
  { category: 'Technical',        items: ['Page speed (Core Web Vitals)', 'Mobile usability', 'Robots.txt & sitemap', 'HTTPS & redirect chains'] },
  { category: 'AEO — AI Engines', items: ['Structured data (Schema.org)', 'FAQ & HowTo markup', 'Clear answer formatting', 'Entity disambiguation'] },
  { category: 'Content',          items: ['Keyword alignment', 'Thin / duplicate content', 'Readability score', 'E-E-A-T signals'] },
]

/* ─── How it works ─── */
const STEPS = [
  { n: '01', title: 'Enter Website', desc: 'Enter any public website URL to initiate instant automated crawling.' },
  { n: '02', title: 'Analyze',       desc: 'AuditIQ runs 60+ diagnostic checks across SEO, AEO, and GEO — covering content, structure, entity clarity, and citability.' },
  { n: '03', title: 'Improve',       desc: 'Follow prioritized, step-by-step fix recommendations to boost performance.' },
]

/* ─── AEO explainer ─── */
const AEO_POINTS = [
  { icon: ICONS.ai,     title: 'AI answer engines',  text: 'ChatGPT, Gemini, Perplexity, and Bing Copilot pull answers from web pages. Your content needs to be structured for them, not just for Google.' },
  { icon: ICONS.schema, title: 'Structured data',    text: 'Schema markup tells AI engines exactly what your page is about. We check every schema type relevant to your content category.' },
  { icon: ICONS.eye,    title: 'Answer readability', text: 'Questions answered in the first 100 words are more likely to be cited by AI engines. We grade your page against this standard.' },
]

/* ─── FAQ questions ─── */
const FAQ_ITEMS = [
  {
    question: 'What is an SEO audit?',
    answer: 'An SEO audit is a structured review of your website that checks how well it is set up for organic search. It looks at technical health, page speed, metadata, content quality, internal linking, and other signals that search engines use to rank pages.',
  },
  {
    question: 'What is AEO?',
    answer: 'AEO stands for Answer Engine Optimization. It focuses on making your content easy for AI-powered answer engines — such as those behind ChatGPT, Perplexity, and Google AI Overviews — to extract and cite. This involves clear question-and-answer formatting, structured data, and entity clarity.',
  },
  {
    question: 'What is GEO?',
    answer: 'GEO stands for Generative Engine Optimization. It focuses on how well your content can be understood and synthesized by large language models when generating responses. Good GEO means your content is well-structured, contextually rich, and attributed to a trustworthy source.',
  },
  {
    question: 'What is the difference between SEO, AEO and GEO?',
    answer: 'SEO helps your pages rank in traditional search engines like Google. AEO helps your content get cited in AI-generated answers and conversational responses. GEO goes deeper — it prepares your content to be accurately synthesized or summarized by generative AI systems. All three work together and share many common fundamentals.',
  },
  {
    question: 'What does the GEO audit check?',
    answer: 'The GEO audit reviews factors like content citability, answer clarity, entity recognition, context coverage, source and trust signals, and how well your content is structured for AI synthesis. Each check comes with a score, an explanation, and a recommended improvement.',
  },
  {
    question: 'How does the SEO + AEO + GEO audit work?',
    answer: 'You enter your website URL and the tool runs diagnostic checks across three areas — SEO, AEO, and GEO. Results are grouped by category with scored findings, identified issues, and a prioritized list of recommended fixes. The current version uses demo data to illustrate the report format.',
  },
  {
    question: 'Can I improve my website using the recommendations?',
    answer: 'Yes. Every recommendation is designed to be practical and clearly explained. Fixes are grouped by priority — high, medium, and low — so you can work through them in a logical order. Each item tells you what the issue is, why it matters, and what to do about it.',
  },
]

/* ─── Sample audit data ─── */
const SAMPLE_ISSUES = [
  { sev: 'critical', label: 'Missing structured data (Schema.org)' },
  { sev: 'critical', label: 'No FAQ markup detected on key pages' },
  { sev: 'warning',  label: 'Meta descriptions missing on 4 pages' },
  { sev: 'warning',  label: 'Images without alt text (11 found)' },
]

/* ══════════════════════════════════════════════════════════
   LANDING PAGE
══════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [url, setUrl] = useState('')
  const [openFaq, setOpenFaq] = useState(0)
  const navigate = useNavigate()

  const handleAudit = (e) => {
    e.preventDefault()
    if (!url.trim()) return
    navigate('/audit')
  }

  return (
    <div>

      {/* ────────────────────────────────────────────────────
          HERO
      ──────────────────────────────────────────────────── */}
      <section style={{
        background: 'var(--bg-white)',
        borderBottom: '1px solid var(--border)',
        padding: '5rem 1.5rem 4.5rem',
      }}>
        <div className="hero-grid" style={{
          maxWidth: '1120px', margin: '0 auto'
        }}>

          {/* ── Left: copy ── */}
          <div className="hero-copy">
            {/* Eyebrow */}
            <div className="animate-fade-up" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              border: '1px solid #dbeafe',
              borderRadius: 100, padding: '3px 12px',
              fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand)',
              letterSpacing: '0.04em', textTransform: 'uppercase',
              marginBottom: '1.5rem',
              background: 'var(--brand-light)',
            }}>
              SEO • AEO • GEO AUDIT TOOL
            </div>

            {/* H1 */}
            <h1 className="animate-fade-up-2" style={{
              fontSize: 'clamp(2rem, 3.5vw, 2.7rem)',
              fontWeight: 700, lineHeight: 1.18,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              margin: '0 0 1.25rem',
            }}>
              Improve Your Website's<br />
              SEO, AEO &amp; <span style={{ color: 'var(--brand)' }}>GEO</span> Performance
            </h1>

            {/* Subtitle */}
            <p className="animate-fade-up-3" style={{
              fontSize: '1.0625rem',
              color: 'var(--text-secondary)',
              maxWidth: '490px',
              lineHeight: 1.7,
              margin: '0 0 2rem',
            }}>
              Analyze your website and improve performance across all three pillars of modern search —
              Search Engine Optimization (SEO), Answer Engine Optimization (AEO), and Generative Engine Optimization (GEO).
            </p>

            {/* URL input — fused bar */}
            <form className="animate-fade-up-4" onSubmit={handleAudit} style={{ maxWidth: 490 }}>
              <div
                style={{
                  display: 'flex',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--bg)',
                  overflow: 'hidden',
                  transition: 'border-color 0.18s, box-shadow 0.18s',
                }}
                onFocusCapture={e => {
                  e.currentTarget.style.borderColor = 'var(--brand)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(29,78,216,0.09)'
                }}
                onBlurCapture={e => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <span className="url-icon" style={{
                  padding: '0 0 0 13px',
                  display: 'flex', alignItems: 'center',
                  color: 'var(--text-muted)', flexShrink: 0,
                }}>
                  <Icon d={ICONS.search} size={15} />
                </span>
                <input
                  id="hero-url-input"
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  style={{
                    flex: 1, border: 'none', background: 'transparent',
                    padding: '0.78rem 0.75rem',
                    fontSize: '0.9rem', color: 'var(--text-primary)',
                    outline: 'none', fontFamily: 'inherit', minWidth: 0,
                  }}
                />
                <button type="submit" className="btn-primary" style={{
                  borderRadius: 0, padding: '0 1.2rem',
                  flexShrink: 0, fontSize: '0.875rem',
                }}>
                  Start Free Audit
                </button>
              </div>
            </form>

            {/* Supporting text */}
            <p className="animate-fade-up-4" style={{
              fontSize: '0.8rem', color: 'var(--text-muted)',
              marginTop: '0.75rem',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ color: '#16a34a' }}><Icon d={ICONS.check} size={12} /></span>
              Start with a free website audit.
            </p>
          </div>

          {/* ── Right: Sample Audit card ── */}
          <div className="animate-fade-up-3" style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-white)',
            boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}>

            {/* Card header */}
            <div style={{
              padding: '0.85rem 1.25rem',
              borderBottom: '1px solid var(--border)',
              background: '#fafafa',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Favicon placeholder */}
                <div style={{
                  width: 22, height: 22, borderRadius: 4,
                  background: '#e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.625rem', fontWeight: 700, color: '#94a3b8', flexShrink: 0,
                }}>E</div>
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                    example.com
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Audited just now
                  </div>
                </div>
              </div>
              {/* Clearly labelled badge */}
              <span style={{
                fontSize: '0.7rem', fontWeight: 700,
                color: '#64748b', letterSpacing: '0.05em',
                textTransform: 'uppercase',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                padding: '2px 9px', borderRadius: 4,
              }}>
                Sample Audit
              </span>
            </div>

            {/* SEO + AEO + GEO Score */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              borderBottom: '1px solid var(--border)',
            }}>
              {/* SEO */}
              <div style={{ padding: '1.25rem', borderRight: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{
                  fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.65rem',
                }}>SEO Score</div>
                <ScoreRing score={72} colour="#16a34a" />
                <div style={{ fontSize: '0.73rem', fontWeight: 600, color: '#16a34a', marginTop: '0.45rem' }}>Good</div>
              </div>

              {/* AEO */}
              <div style={{ padding: '1.25rem', borderRight: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{
                  fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.65rem',
                }}>AEO Score</div>
                <ScoreRing score={41} colour="#d97706" />
                <div style={{ fontSize: '0.73rem', fontWeight: 600, color: '#d97706', marginTop: '0.45rem' }}>Needs Work</div>
              </div>

              {/* GEO */}
              <div style={{ padding: '1.25rem', textAlign: 'center' }}>
                <div style={{
                  fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.65rem',
                }}>GEO Score</div>
                <ScoreRing score={71} colour="#16a34a" />
                <div style={{ fontSize: '0.73rem', fontWeight: 600, color: '#16a34a', marginTop: '0.45rem' }}>Good</div>
              </div>
            </div>

            {/* Critical Issues + Warnings */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              borderBottom: '1px solid var(--border)',
            }}>
              {/* Critical */}
              <div style={{
                padding: '0.9rem 1.25rem',
                borderRight: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 6,
                  background: '#fef2f2', border: '1px solid #fecaca',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#dc2626', flexShrink: 0,
                }}>
                  <Icon d={ICONS.warn} size={13} />
                </div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#dc2626', lineHeight: 1 }}>3</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>Critical Issues</div>
                </div>
              </div>

              {/* Warnings */}
              <div style={{
                padding: '0.9rem 1.25rem',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 6,
                  background: '#fffbeb', border: '1px solid #fde68a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#d97706', flexShrink: 0,
                }}>
                  <Icon d={ICONS.info} size={13} />
                </div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#d97706', lineHeight: 1 }}>9</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>Warnings</div>
                </div>
              </div>
            </div>

            {/* Issue list */}
            {SAMPLE_ISSUES.map(({ sev, label }) => (
              <div key={label} style={{
                padding: '0.58rem 1.25rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: sev === 'critical' ? '#dc2626' : '#d97706',
                }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{label}</span>
              </div>
            ))}

            {/* Footer note */}
            <div style={{ padding: '0.7rem 1.25rem', background: '#f8fafc' }}>
              <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                Sample data — run an audit to see your real results.
              </span>
            </div>
          </div>

        </div>
      </section>


      {/* ────────────────────────────────────────────────────
          FEATURES SECTION
      ──────────────────────────────────────────────────── */}
      <section id="features" style={{
        padding: '5.5rem 1.5rem',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>

          {/* Section Header */}
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3.5rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '3px 12px', borderRadius: 100,
              fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand)',
              letterSpacing: '0.05em', textTransform: 'uppercase',
              background: 'var(--brand-light)', border: '1px solid #dbeafe',
              marginBottom: '1rem',
            }}>
              Core Capabilities
            </div>
            <h2 style={{
              fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
              fontWeight: 700, letterSpacing: '-0.03em',
              color: 'var(--text-primary)', margin: '0 0 0.875rem', lineHeight: 1.25,
            }}>
              Built for Modern Search &amp; Answer Engines
            </h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
              Comprehensive diagnostic tools to analyze technical health, content quality, schema accuracy, and AI answer engine readiness in one platform.
            </p>
          </div>

          {/* ── ROW 1: Flagship Pair (Technical SEO + AEO + GEO Analysis) ── */}
          <div className="features-grid-flagship">

            {/* 1. Technical SEO Analysis */}
            <div className="feature-card">
              <div style={{ marginBottom: '1rem' }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 8,
                  background: '#f1f5f9', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-primary)',
                }}>
                  <Icon d={ICONS.technical} size={20} />
                </div>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem', letterSpacing: '-0.015em' }}>
                Technical SEO Analysis
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 1.5rem', flex: 1 }}>
                Deep crawl of your website's technical health, Core Web Vitals, server response status, mobile usability, and indexability rules.
              </p>

              {/* Micro Preview Box */}
              <div style={{ background: '#fafafa', border: '1px solid var(--border)', borderRadius: 6, padding: '0.85rem 1rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>
                  Sample Technical Checks
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <span className="badge-pill-green">200 OK Response</span>
                  <span className="badge-pill-blue">LCP 1.1s (Fast)</span>
                  <span className="badge-pill-green">HTTPS Valid</span>
                  <span className="badge-pill-slate">Robots.txt Found</span>
                  <span className="badge-pill-amber">Mobile Viewport</span>
                </div>
              </div>
            </div>

            {/* 2. AEO Analysis */}
            <div className="feature-card-highlight">
              <div style={{ marginBottom: '1rem' }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 8,
                  background: 'var(--brand-light)', border: '1px solid #bfdbfe',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--brand)',
                }}>
                  <Icon d={ICONS.ai} size={20} />
                </div>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem', letterSpacing: '-0.015em' }}>
                AEO Analysis
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 1.5rem', flex: 1 }}>
                Evaluate how effectively your content is structured for AI answer engines like ChatGPT, Perplexity, Gemini, and Claude to discover and cite.
              </p>

              {/* Micro Preview Box */}
              <div style={{ background: '#f8fafc', border: '1px solid #dbeafe', borderRadius: 6, padding: '0.85rem 1rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--brand)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>AI Engine Readiness Score</span>
                  <span style={{ fontWeight: 800 }}>88 / 100</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4, padding: '4px 8px', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>ChatGPT</span> <span style={{ color: '#16a34a', fontWeight: 600 }}>Citable</span>
                  </div>
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4, padding: '4px 8px', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Perplexity</span> <span style={{ color: '#16a34a', fontWeight: 600 }}>Optimal</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. GEO Analysis */}
            <div className="feature-card-highlight">
              <div style={{ marginBottom: '1rem' }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 8,
                  background: 'var(--brand-light)', border: '1px solid #bfdbfe',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--brand)',
                }}>
                  <Icon d={ICONS.schema} size={20} />
                </div>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem', letterSpacing: '-0.015em' }}>
                GEO Analysis
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 1.5rem', flex: 1 }}>
                Evaluate whether your content is clear, structured, and easy for AI-powered answer engines to understand and cite.
              </p>

              {/* Micro Preview Box */}
              <div style={{ background: '#f8fafc', border: '1px solid #dbeafe', borderRadius: 6, padding: '0.85rem 1rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--brand)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Generative Engine Score</span>
                  <span style={{ fontWeight: 800 }}>71 / 100</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4, padding: '4px 8px', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Citation Confidence</span> <span style={{ color: '#16a34a', fontWeight: 600 }}>High</span>
                  </div>
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4, padding: '4px 8px', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Context Coverage</span> <span style={{ color: '#d97706', fontWeight: 600 }}>Moderate</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ── ROW 2: Analytical Trio (On-Page, Content, Schema) ── */}
          <div className="features-grid-trio">

            {/* 3. On-Page SEO Analysis */}
            <div className="feature-card">
              <div style={{ width: 38, height: 38, borderRadius: 8, background: '#f1f5f9', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                <Icon d={ICONS.onpage} size={18} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem', letterSpacing: '-0.01em' }}>
                On-Page SEO Analysis
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 1.25rem', flex: 1 }}>
                Audits title tags, meta descriptions, heading structure (H1–H6), canonical tags, and internal link architecture.
              </p>

              {/* Micro snippet visual */}
              <div style={{ background: '#fafafa', border: '1px solid var(--border)', borderRadius: 6, padding: '0.65rem 0.85rem', fontSize: '0.75rem' }}>
                <div style={{ color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <Icon d={ICONS.check} size={12} /> Title Tag: 54 chars (Optimal)
                </div>
                <div style={{ color: '#d97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon d={ICONS.warn} size={12} /> Meta Desc: Missing on 2 pages
                </div>
              </div>
            </div>

            {/* 4. Content Analysis */}
            <div className="feature-card">
              <div style={{ width: 38, height: 38, borderRadius: 8, background: '#f1f5f9', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                <Icon d={ICONS.content} size={18} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem', letterSpacing: '-0.01em' }}>
                Content Analysis
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 1.25rem', flex: 1 }}>
                Evaluates readability metrics, word count depth, keyword alignment, duplicate content risk, and E-E-A-T signals.
              </p>

              {/* Micro gauge / metrics visual */}
              <div style={{ background: '#fafafa', border: '1px solid var(--border)', borderRadius: 6, padding: '0.65rem 0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                  <span>Readability Index</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Grade 8 (Clear)</span>
                </div>
                <div style={{ width: '100%', height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: '82%', height: '100%', background: '#16a34a' }} />
                </div>
              </div>
            </div>

            {/* 5. Schema Detection */}
            <div className="feature-card">
              <div style={{ width: 38, height: 38, borderRadius: 8, background: '#f1f5f9', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                <Icon d={ICONS.schema} size={18} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem', letterSpacing: '-0.01em' }}>
                Schema Detection
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 1.25rem', flex: 1 }}>
                Discovers Schema.org markup types (FAQPage, Article, Organization) and validates JSON-LD syntax accuracy.
              </p>

              {/* Code snippet visual */}
              <div style={{ background: '#0f172a', borderRadius: 6, padding: '0.6rem 0.85rem', fontFamily: 'monospace', fontSize: '0.72rem', color: '#94a3b8' }}>
                <span style={{ color: '#38bdf8' }}>"@type"</span>: <span style={{ color: '#fde047' }}>"FAQPage"</span> <span style={{ color: '#4ade80', marginLeft: 4 }}>✓ Valid</span>
              </div>
            </div>

          </div>

          {/* ── ROW 3: Full-Width Banner (Actionable Recommendations) ── */}
          <div className="feature-card feature-banner-grid" style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid var(--border)',
            padding: '1.75rem 2rem',
          }}>
            <div className="feature-banner-content">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.6rem' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 6,
                    background: '#fef3c7', border: '1px solid #fde68a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#d97706',
                  }}>
                    <Icon d={ICONS.bolt} size={16} />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Action Plan
                  </span>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem', letterSpacing: '-0.015em' }}>
                  Actionable Recommendations
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
                  Transform raw audit data into clear, prioritized fix instructions. Every issue includes estimated impact scores, step-by-step resolution steps, and developer code snippets.
                </p>
              </div>

              {/* Priority task list box */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '0.9rem 1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>
                  Prioritized Action Queue
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                    <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>HIGH</span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Add missing Organization Schema</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                    <span style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>MED</span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Optimize H2 tags for AI answer engines</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                    <span style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>LOW</span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Compress hero background PNG assets</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>



      {/* ────────────────────────────────────────────────────
          HOW IT WORKS
      ──────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{
        padding: '4rem 1.5rem',
        background: 'var(--bg-white)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>

          <div style={{ marginBottom: '3rem' }}>
            <div style={{
              fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand)',
              letterSpacing: '0.05em', textTransform: 'uppercase',
              marginBottom: '0.5rem',
            }}>
              Simple Process
            </div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 1.85rem)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>
              How It Works
            </h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', margin: 0 }}>
              Three simple steps to audit and optimize your site performance.
            </p>
          </div>

          <div className="how-grid">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.75rem 1.5rem',
              }}>
                <div style={{
                  fontSize: '0.8125rem', fontWeight: 700, color: 'var(--brand)',
                  letterSpacing: '0.05em', marginBottom: '0.75rem',
                }}>
                  {n}
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem', letterSpacing: '-0.01em' }}>
                  {title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>


      {/* ────────────────────────────────────────────────────
          SEO + AEO + GEO EXPLANATION SECTION
      ──────────────────────────────────────────────────── */}
      <section id="seo-aeo-explanation" style={{
        padding: '4rem 1.5rem',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>

          {/* Section Header */}
          <div style={{ marginBottom: '3rem', maxWidth: '640px' }}>
            <div style={{
              display: 'inline-block',
              fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand)',
              letterSpacing: '0.05em', textTransform: 'uppercase',
              background: 'var(--brand-light)', border: '1px solid #dbeafe',
              padding: '2px 8px', borderRadius: 4, marginBottom: '0.875rem',
            }}>
              SEO vs AEO vs GEO
            </div>
            <h2 style={{
              fontSize: 'clamp(1.6rem, 2.8vw, 2.1rem)',
              fontWeight: 700, letterSpacing: '-0.025em',
              color: 'var(--text-primary)', margin: '0 0 0.75rem', lineHeight: 1.25,
            }}>
              Understanding Search &amp; Answer Optimization
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.65 }}>
              Search discovery operates across three parallel paradigms. Here is how SEO, AEO and GEO complement each other.
            </p>
          </div>

          {/* Original Split Layout Container */}
          <div className="seo-aeo-split-container" style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-white)',
            overflow: 'hidden',
          }}>

            {/* Left Split — SEO */}
            <div style={{
              padding: '2.5rem 2rem',
              borderRight: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{
                  fontSize: '0.75rem', fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: 'var(--text-muted)', marginBottom: '1rem',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#64748b' }} />
                  SEO · Search Engine Optimization
                </div>
                <h3 style={{
                  fontSize: '1.25rem', fontWeight: 700,
                  color: 'var(--text-primary)', margin: '0 0 1rem',
                  letterSpacing: '-0.015em', lineHeight: 1.35,
                }}>
                  Helps websites perform better in traditional search engines.
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  Optimizes your site's technical structure, page speed, metadata, and link authority to earn top organic rankings on Google and Bing.
                </p>
              </div>

              <div style={{
                marginTop: '2.5rem', paddingTop: '1.25rem',
                borderTop: '1px solid var(--border)',
                fontSize: '0.8rem', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Focus:</span>
                Keywords, backlinks, crawling &amp; organic search rankings
              </div>
            </div>

            {/* Right Split — AEO */}
            <div style={{
              padding: '2.5rem 2rem',
              background: '#f8fafc',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{
                  fontSize: '0.75rem', fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: 'var(--brand)', marginBottom: '1rem',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand)' }} />
                  AEO · Answer Engine Optimization
                </div>
                <h3 style={{
                  fontSize: '1.25rem', fontWeight: 700,
                  color: 'var(--text-primary)', margin: '0 0 1rem',
                  letterSpacing: '-0.015em', lineHeight: 1.35,
                }}>
                  Helps content provide clear, useful answers for AI-powered and conversational search.
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  Structures your content with Schema.org markup, direct FAQ formatting, and concise answer blocks so AI models like ChatGPT, Perplexity, and Gemini cite your domain.
                </p>
              </div>

              <div style={{
                marginTop: '2.5rem', paddingTop: '1.25rem',
                borderTop: '1px solid var(--border)',
                fontSize: '0.8rem', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontWeight: 600, color: 'var(--brand)' }}>Focus:</span>
                Structured schema, direct answers &amp; AI model citations
              </div>
            </div>

            {/* Third Split — GEO */}
            <div style={{
              padding: '2.5rem 2rem',
              borderLeft: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{
                  fontSize: '0.75rem', fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: '#16a34a', marginBottom: '1rem',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
                  GEO · Generative Engine Optimization
                </div>
                <h3 style={{
                  fontSize: '1.25rem', fontWeight: 700,
                  color: 'var(--text-primary)', margin: '0 0 1rem',
                  letterSpacing: '-0.015em', lineHeight: 1.35,
                }}>
                  Helps generative AI models synthesize and summarize your content clearly.
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  Builds context coverage, entity connections, and trust signals to ensure generative engines accurately represent and cite your brand.
                </p>
              </div>

              <div style={{
                marginTop: '2.5rem', paddingTop: '1.25rem',
                borderTop: '1px solid var(--border)',
                fontSize: '0.8rem', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontWeight: 600, color: '#16a34a' }}>Focus:</span>
                Context depth, entities, and generative citability
              </div>
            </div>

          </div>

        </div>
      </section>


      {/* ────────────────────────────────────────────────────
          FAQ SECTION
      ──────────────────────────────────────────────────── */}
      <section id="faq" style={{
        padding: '5rem 1.5rem',
        background: 'var(--bg-white)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '3px 12px', borderRadius: 100,
              fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand)',
              letterSpacing: '0.05em', textTransform: 'uppercase',
              background: 'var(--brand-light)', border: '1px solid #dbeafe',
            }}>
              Frequently asked questions
            </div>
            <h2 style={{
              fontSize: 'clamp(1.75rem, 3vw, 2.18rem)',
              fontWeight: 700, lineHeight: 1.2,
              letterSpacing: '-0.03em', color: 'var(--text-primary)',
              margin: '1rem 0 0.75rem',
            }}>
              SEO, AEO &amp; GEO FAQs
            </h2>
            <p style={{
              fontSize: '0.95rem', color: 'var(--text-secondary)',
              maxWidth: '640px', margin: '0 auto', lineHeight: 1.65,
            }}>
              Everything you need to understand how the AuditIQ platform evaluates your site.
            </p>
          </div>

          <div className="faq-list">
            {FAQ_ITEMS.map((item, index) => {
              const expanded = openFaq === index
              const panelId = `faq-panel-${index}`
              const buttonId = `faq-button-${index}`

              return (
                <div className="faq-item" key={item.question}>
                  <button
                    type="button"
                    id={buttonId}
                    className="faq-trigger"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => setOpenFaq(expanded ? -1 : index)}
                  >
                    <span>{item.question}</span>
                    <span className="faq-icon" aria-hidden="true">{expanded ? '−' : '+'}</span>
                  </button>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className="faq-panel"
                    hidden={!expanded}
                  >
                    <p>{item.answer}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────
          CTA BAND
      ──────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--text-primary)', padding: '4rem 1.5rem' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontSize: 'clamp(1.4rem, 2.5vw, 2rem)',
            fontWeight: 700, letterSpacing: '-0.03em',
            color: '#fff', margin: '0 0 0.875rem',
          }}>
            See where your site stands — right now
          </h2>
          <p style={{ fontSize: '0.9375rem', color: '#94a3b8', margin: '0 0 2rem', lineHeight: 1.6 }}>
            Free for your first report. No credit card. No account needed.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/audit" className="btn-primary" style={{ padding: '0.7rem 1.5rem', fontSize: '0.9375rem' }}>
              Start a free audit
            </Link>
            <Link to="/register" className="btn-ghost"
              style={{ padding: '0.7rem 1.5rem', fontSize: '0.9375rem', borderColor: '#334155', color: '#94a3b8' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#94a3b8' }}
            >
              Create an account
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
