import jsPDF from 'jspdf'

// ─── Colour palette ──────────────────────────────────────────────────────────
const C = {
  primary: [99, 102, 241],      // indigo-500
  success: [22, 163, 74],       // green-600
  warning: [217, 119, 6],       // amber-600
  danger: [220, 38, 38],        // red-600
  dark: [15, 23, 42],           // slate-900
  mid: [51, 65, 85],            // slate-700
  muted: [100, 116, 139],       // slate-500
  light: [241, 245, 249],       // slate-100
  white: [255, 255, 255],
  border: [203, 213, 225],      // slate-300
}

// ─── Page geometry ───────────────────────────────────────────────────────────
const PAGE_W = 210          // A4 mm
const PAGE_H = 297
const MARGIN = 16
const CONTENT_W = PAGE_W - MARGIN * 2

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
  } catch {
    return dateStr
  }
}

function scoreBand(score) {
  if (score === null || score === undefined) return C.muted
  if (score >= 80) return C.success
  if (score >= 50) return C.warning
  return C.danger
}

function severityColor(severity) {
  if (!severity) return C.muted
  const s = severity.toLowerCase()
  if (s === 'critical') return C.danger
  if (s === 'warning') return C.warning
  if (s === 'passed') return C.success
  return C.muted
}

// ─── Core drawing primitives ─────────────────────────────────────────────────
class PdfBuilder {
  constructor() {
    this.doc = new jsPDF({ unit: 'mm', format: 'a4' })
    this.y = 0
    this.page = 1
  }

  // Add a new blank page
  newPage() {
    this.doc.addPage()
    this.page++
    this.y = MARGIN
  }

  // Ensure there is at least `needed` mm left on this page
  ensureSpace(needed) {
    if (this.y + needed > PAGE_H - MARGIN) this.newPage()
  }

  // Filled rectangle helper
  rect(x, y, w, h, color) {
    this.doc.setFillColor(...color)
    this.doc.rect(x, y, w, h, 'F')
  }

  // Horizontal rule
  rule(color = C.border, thickness = 0.3) {
    this.doc.setDrawColor(...color)
    this.doc.setLineWidth(thickness)
    this.doc.line(MARGIN, this.y, PAGE_W - MARGIN, this.y)
    this.y += 2
  }

  // Wrapped text – returns the y after the block
  text(str, x, size, color, style = 'normal', align = 'left', maxW = null) {
    this.doc.setFontSize(size)
    this.doc.setFont('helvetica', style)
    this.doc.setTextColor(...color)
    const w = maxW ?? CONTENT_W - (x - MARGIN)
    const lines = this.doc.splitTextToSize(String(str ?? ''), w)
    this.doc.text(lines, x, this.y, { align })
    this.y += lines.length * size * 0.352778 + 1
    return this
  }

  // Badge / pill
  badge(label, x, y, color) {
    const pad = 2
    this.doc.setFontSize(7)
    const tw = this.doc.getTextWidth(label)
    this.doc.setFillColor(...color)
    this.doc.roundedRect(x, y - 3.5, tw + pad * 2, 4.5, 1, 1, 'F')
    this.doc.setTextColor(...C.white)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(label, x + pad, y)
    return tw + pad * 2
  }

  // Section heading with coloured left-bar
  sectionHead(label, title, accentColor = C.primary) {
    this.ensureSpace(18)
    // accent bar
    this.rect(MARGIN, this.y, 3, 12, accentColor)
    // kicker
    this.doc.setFontSize(7)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...accentColor)
    this.doc.text(label.toUpperCase(), MARGIN + 5, this.y + 4)
    // title
    this.doc.setFontSize(13)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...C.dark)
    this.doc.text(title, MARGIN + 5, this.y + 10)
    this.y += 16
    this.rule()
  }

  // Score card row  (three columns)
  scoreRow(items) {
    this.ensureSpace(20)
    const colW = CONTENT_W / items.length
    items.forEach(({ label, value }, i) => {
      const x = MARGIN + i * colW
      const color = scoreBand(value)
      // background
      this.rect(x, this.y, colW - 2, 18, C.light)
      // label
      this.doc.setFontSize(7)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...C.muted)
      this.doc.text(label, x + 3, this.y + 5)
      // value
      this.doc.setFontSize(18)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...color)
      this.doc.text(value !== null && value !== undefined ? `${value}` : '—', x + 3, this.y + 14)
      // /100
      if (value !== null && value !== undefined) {
        this.doc.setFontSize(8)
        this.doc.setFont('helvetica', 'normal')
        this.doc.setTextColor(...C.muted)
        this.doc.text('/ 100', x + 3 + this.doc.getTextWidth(`${value}`) + 1, this.y + 14)
      }
    })
    this.y += 22
  }

  // Issue card
  issueCard(issue, fix, severity) {
    const minH = 14
    this.ensureSpace(minH)
    const sevColor = severityColor(severity)
    // left strip
    this.rect(MARGIN, this.y, 2, 1, sevColor) // placeholder height, fix below
    // calculate text heights first
    this.doc.setFontSize(9)
    const issueLines = this.doc.splitTextToSize(String(issue ?? ''), CONTENT_W - 8)
    this.doc.setFontSize(8)
    const fixLines = fix ? this.doc.splitTextToSize(`Fix: ${fix}`, CONTENT_W - 8) : []
    const blockH = issueLines.length * 3.5 + fixLines.length * 3 + 8
    this.ensureSpace(blockH)
    // card bg
    this.rect(MARGIN, this.y, CONTENT_W, blockH, [248, 250, 252])
    // severity strip
    this.rect(MARGIN, this.y, 2, blockH, sevColor)
    // severity badge
    this.badge(severity || 'INFO', PAGE_W - MARGIN - 22, this.y + 4, sevColor)
    // issue title
    this.doc.setFontSize(9)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...C.dark)
    this.doc.text(issueLines, MARGIN + 4, this.y + 5)
    let innerY = this.y + 5 + issueLines.length * 3.5
    // fix text
    if (fixLines.length > 0) {
      this.doc.setFontSize(7.5)
      this.doc.setFont('helvetica', 'italic')
      this.doc.setTextColor(...C.muted)
      this.doc.text(fixLines, MARGIN + 4, innerY + 1)
    }
    this.y += blockH + 2
  }

  // Check card (AEO / GEO)
  checkCard(title, explanation, severity) {
    const sevColor = severityColor(severity)
    this.doc.setFontSize(8)
    const expLines = this.doc.splitTextToSize(String(explanation ?? ''), CONTENT_W - 8)
    const blockH = expLines.length * 3 + 9
    this.ensureSpace(blockH)
    this.rect(MARGIN, this.y, CONTENT_W, blockH, [248, 250, 252])
    this.rect(MARGIN, this.y, 2, blockH, sevColor)
    this.badge(severity || 'INFO', PAGE_W - MARGIN - 22, this.y + 4, sevColor)
    this.doc.setFontSize(9)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...C.dark)
    this.doc.text(title, MARGIN + 4, this.y + 5)
    this.doc.setFontSize(7.5)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...C.muted)
    this.doc.text(expLines, MARGIN + 4, this.y + 9)
    this.y += blockH + 2
  }

  // Recommendation item
  recItem(title, explanation, priority) {
    const prioColor = priority === 'high' ? C.danger : priority === 'medium' ? C.warning : C.success
    this.doc.setFontSize(8)
    const expLines = this.doc.splitTextToSize(String(explanation ?? ''), CONTENT_W - 14)
    const blockH = expLines.length * 3 + 9
    this.ensureSpace(blockH)
    // bullet circle
    this.doc.setFillColor(...prioColor)
    this.doc.circle(MARGIN + 2.5, this.y + 4.5, 2, 'F')
    this.doc.setFontSize(9)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...C.dark)
    const titleLines = this.doc.splitTextToSize(String(title), CONTENT_W - 10)
    this.doc.text(titleLines, MARGIN + 7, this.y + 5)
    this.doc.setFontSize(7.5)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...C.muted)
    this.doc.text(expLines, MARGIN + 7, this.y + 5 + titleLines.length * 3.5)
    this.y += blockH + 1
  }

  // Summary stat box
  statBox(label, value, color, x, w) {
    this.rect(x, this.y, w - 2, 16, C.light)
    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...color)
    this.doc.text(String(value), x + 3, this.y + 10)
    this.doc.setFontSize(7)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...C.muted)
    this.doc.text(label, x + 3, this.y + 14.5)
  }
}

// ─── Page header / footer helpers ────────────────────────────────────────────
function drawPageHeader(doc, url) {
  // top bar
  doc.setFillColor(...C.dark)
  doc.rect(0, 0, PAGE_W, 10, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.white)
  doc.text('AuditIQ  •  SEO + AEO + GEO Intelligence', MARGIN, 6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  const urlShort = url.length > 55 ? url.substring(0, 52) + '…' : url
  doc.text(urlShort, PAGE_W - MARGIN, 6.5, { align: 'right' })
}

function drawPageFooter(doc, pageNum, total) {
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.muted)
  doc.text(`Page ${pageNum} of ${total}`, PAGE_W / 2, PAGE_H - 5, { align: 'center' })
  doc.setTextColor(203, 213, 225)
  doc.text('Generated by AuditIQ', MARGIN, PAGE_H - 5)
  doc.text(new Date().toLocaleDateString(), PAGE_W - MARGIN, PAGE_H - 5, { align: 'right' })
}

// ─── Main export function ─────────────────────────────────────────────────────
export async function generateAuditPdf(audit) {
  const b = new PdfBuilder()
  const doc = b.doc

  const url = audit.fetchedUrl || audit.url || 'Unknown URL'
  const auditDate = formatDate(audit.createdAt)
  const status = audit.status || 'unknown'

  // ── Derived data ──────────────────────────────────────────────────────────
  const seoChecks = audit.seoChecks || []
  const seoIssues = audit.seoIssues || []
  const seoRecs = audit.seoRecommendations || { high: [], medium: [], low: [] }

  const criticalIssues = seoIssues.filter(i => i.severity === 'Critical')
  const warnings = seoIssues.filter(i => i.severity === 'Warning')
  const passedChecks = seoChecks.filter(i => i.severity === 'Passed')

  const aeoChecks = audit.aeoChecks || []
  const aeoRecs = audit.aeoRecommendations || { high: [], medium: [], low: [] }

  const geoChecks = audit.geoChecks || []
  const geoRecs = audit.geoRecommendations || { high: [], medium: [], low: [] }

  const allHighRecs = [
    ...(seoRecs.high || []),
    ...(aeoRecs.high || []),
    ...(geoRecs.high || []),
  ]

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Cover / Overview
  // ══════════════════════════════════════════════════════════════════════════
  b.y = 14

  // Brand header block
  b.rect(0, 0, PAGE_W, 45, C.dark)
  // accent gradient bar
  b.rect(0, 43, PAGE_W, 2, C.primary)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.primary)
  doc.text('AUDITIQ', MARGIN, 16)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text('SEO + AEO + GEO Intelligence', MARGIN, 20)

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.white)
  doc.text('Website Audit Report', MARGIN, 32)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text(url, MARGIN, 38)
  doc.text(`Audit Date: ${auditDate}`, PAGE_W - MARGIN, 38, { align: 'right' })

  b.y = 55

  // Status badge
  const statusColor = status === 'completed' ? C.success : C.warning
  b.rect(MARGIN, b.y, 28, 6, statusColor.map(v => Math.min(255, v + 180)))
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...statusColor)
  doc.text(status.charAt(0).toUpperCase() + status.slice(1), MARGIN + 2, b.y + 4.2)
  b.y += 12

  // Score overview
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.muted)
  doc.text('SCORE OVERVIEW', MARGIN, b.y)
  b.y += 5

  b.scoreRow([
    { label: 'SEO Score', value: audit.seoScore },
    { label: 'AEO Score', value: audit.aeoScore },
    { label: 'GEO Score', value: audit.geoScore },
  ])

  b.y += 4

  // Quick summary stats
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.muted)
  doc.text('AUDIT SUMMARY', MARGIN, b.y)
  b.y += 5

  const colW = CONTENT_W / 4
  b.statBox('Critical Issues', criticalIssues.length, C.danger, MARGIN, colW)
  b.statBox('Warnings', warnings.length, C.warning, MARGIN + colW, colW)
  b.statBox('Passed Checks', passedChecks.length, C.success, MARGIN + colW * 2, colW)
  b.statBox('High-Priority Recs', allHighRecs.length, C.primary, MARGIN + colW * 3, colW)
  b.y += 20

  // About section
  b.rule()
  b.y += 2
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.dark)
  doc.text('About This Report', MARGIN, b.y)
  b.y += 5
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.muted)
  const aboutText = `This automated audit report was generated by AuditIQ for ${url}. It covers Search Engine Optimization (SEO), Answer Engine Optimization (AEO), and Generative Engine Optimization (GEO) — the three pillars of modern digital visibility. All data reflects the live state of the website at the time of audit.`
  const aboutLines = doc.splitTextToSize(aboutText, CONTENT_W)
  doc.text(aboutLines, MARGIN, b.y)
  b.y += aboutLines.length * 3.5 + 4

  // Table of contents
  b.rule()
  b.y += 2
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.dark)
  doc.text('Contents', MARGIN, b.y)
  b.y += 5
  const toc = [
    '1  SEO Report — Score, Issues & Recommendations',
    '2  AEO Report — Answer Engine Readiness & Recommendations',
    '3  GEO Report — Generative Engine Readiness & Recommendations',
    '4  Summary — Critical Issues, Warnings, Passed Checks & Priority Actions',
  ]
  toc.forEach(line => {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.mid)
    doc.text(line, MARGIN + 4, b.y)
    b.y += 5
  })

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — SEO Report
  // ══════════════════════════════════════════════════════════════════════════
  b.newPage()
  drawPageHeader(doc, url)
  b.y = 14

  b.sectionHead('Section 1', 'SEO Report', C.primary)

  // Score
  b.ensureSpace(22)
  b.scoreRow([{ label: 'SEO Score', value: audit.seoScore }])

  // Critical Issues
  b.sectionHead('SEO Issues', 'Critical Issues', C.danger)
  if (criticalIssues.length === 0) {
    doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(...C.muted)
    doc.text('No critical issues found. Great work!', MARGIN, b.y); b.y += 6
  } else {
    criticalIssues.forEach(i => b.issueCard(i.issue, i.fix, i.severity))
  }
  b.y += 3

  // Warnings
  b.ensureSpace(12)
  b.sectionHead('SEO Issues', 'Warnings', C.warning)
  if (warnings.length === 0) {
    doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(...C.muted)
    doc.text('No warnings found.', MARGIN, b.y); b.y += 6
  } else {
    warnings.forEach(i => b.issueCard(i.issue, i.fix, i.severity))
  }
  b.y += 3

  // Passed Checks
  b.ensureSpace(12)
  b.sectionHead('SEO Checks', 'Passed Checks', C.success)
  if (passedChecks.length === 0) {
    doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(...C.muted)
    doc.text('No passing checks recorded.', MARGIN, b.y); b.y += 6
  } else {
    passedChecks.forEach(i => b.issueCard(i.title || i.issue, i.recommendation || i.fix, i.severity))
  }
  b.y += 3

  // SEO Recommendations
  b.ensureSpace(12)
  b.sectionHead('Prioritized SEO Plan', 'SEO Recommendations', C.primary);
  ['high', 'medium', 'low'].forEach(tier => {
    const items = seoRecs[tier] || []
    if (items.length === 0) return
    const tierLabel = tier === 'high' ? 'High Priority' : tier === 'medium' ? 'Medium Priority' : 'Low Priority'
    b.ensureSpace(10)
    doc.setFontSize(8); doc.setFont('helvetica', 'bold')
    doc.setTextColor(...(tier === 'high' ? C.danger : tier === 'medium' ? C.warning : C.success))
    doc.text(tierLabel, MARGIN, b.y); b.y += 5
    items.forEach(item => b.recItem(item.title, item.explanation, tier))
    b.y += 3
  })
  if (!seoRecs.high?.length && !seoRecs.medium?.length && !seoRecs.low?.length) {
    doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(...C.muted)
    doc.text('No SEO recommendations generated.', MARGIN, b.y); b.y += 6
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2 — AEO Report
  // ══════════════════════════════════════════════════════════════════════════
  b.newPage()
  drawPageHeader(doc, url)
  b.y = 14

  b.sectionHead('Section 2', 'AEO Report', [16, 185, 129]) // emerald

  b.scoreRow([{ label: 'AEO Score', value: audit.aeoScore }])

  b.sectionHead('AEO Analysis', 'Answer Engine Readiness', [16, 185, 129])
  if (aeoChecks.length === 0) {
    doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(...C.muted)
    doc.text('No AEO checks found.', MARGIN, b.y); b.y += 6
  } else {
    aeoChecks.forEach(c => b.checkCard(c.title, c.explanation, c.severity))
  }
  b.y += 3

  b.ensureSpace(12)
  b.sectionHead('Prioritized AEO Plan', 'AEO Recommendations', [16, 185, 129]);
  ['high', 'medium', 'low'].forEach(tier => {
    const items = aeoRecs[tier] || []
    if (items.length === 0) return
    const tierLabel = tier === 'high' ? 'High Priority' : tier === 'medium' ? 'Medium Priority' : 'Low Priority'
    b.ensureSpace(10)
    doc.setFontSize(8); doc.setFont('helvetica', 'bold')
    doc.setTextColor(...(tier === 'high' ? C.danger : tier === 'medium' ? C.warning : C.success))
    doc.text(tierLabel, MARGIN, b.y); b.y += 5
    items.forEach(item => b.recItem(item.title, item.explanation, tier))
    b.y += 3
  })
  if (!aeoRecs.high?.length && !aeoRecs.medium?.length && !aeoRecs.low?.length) {
    doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(...C.muted)
    doc.text('No AEO recommendations generated.', MARGIN, b.y); b.y += 6
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 3 — GEO Report
  // ══════════════════════════════════════════════════════════════════════════
  b.newPage()
  drawPageHeader(doc, url)
  b.y = 14

  b.sectionHead('Section 3', 'GEO Report', [139, 92, 246]) // violet

  b.scoreRow([{ label: 'GEO Score', value: audit.geoScore }])

  b.sectionHead('GEO Analysis', 'Generative Engine Readiness', [139, 92, 246])
  if (geoChecks.length === 0) {
    doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(...C.muted)
    doc.text('No GEO checks found.', MARGIN, b.y); b.y += 6
  } else {
    geoChecks.forEach(c => b.checkCard(c.title, c.explanation || c.recommendation, c.severity))
  }
  b.y += 3

  b.ensureSpace(12)
  b.sectionHead('Prioritized GEO Plan', 'GEO Recommendations', [139, 92, 246]);
  ['high', 'medium', 'low'].forEach(tier => {
    const items = geoRecs[tier] || []
    if (items.length === 0) return
    const tierLabel = tier === 'high' ? 'High Priority' : tier === 'medium' ? 'Medium Priority' : 'Low Priority'
    b.ensureSpace(10)
    doc.setFontSize(8); doc.setFont('helvetica', 'bold')
    doc.setTextColor(...(tier === 'high' ? C.danger : tier === 'medium' ? C.warning : C.success))
    doc.text(tierLabel, MARGIN, b.y); b.y += 5
    items.forEach(item => b.recItem(item.title, item.explanation, tier))
    b.y += 3
  })
  if (!geoRecs.high?.length && !geoRecs.medium?.length && !geoRecs.low?.length) {
    doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(...C.muted)
    doc.text('No GEO recommendations generated.', MARGIN, b.y); b.y += 6
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 4 — Summary
  // ══════════════════════════════════════════════════════════════════════════
  b.newPage()
  drawPageHeader(doc, url)
  b.y = 14

  b.sectionHead('Section 4', 'Audit Summary', C.dark)

  // Score row
  b.scoreRow([
    { label: 'SEO Score', value: audit.seoScore },
    { label: 'AEO Score', value: audit.aeoScore },
    { label: 'GEO Score', value: audit.geoScore },
  ])

  // Stats
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.muted)
  doc.text('COUNTS AT A GLANCE', MARGIN, b.y); b.y += 5
  const colW2 = CONTENT_W / 4
  b.statBox('Critical Issues', criticalIssues.length, C.danger, MARGIN, colW2)
  b.statBox('Warnings', warnings.length, C.warning, MARGIN + colW2, colW2)
  b.statBox('Passed Checks', passedChecks.length, C.success, MARGIN + colW2 * 2, colW2)
  b.statBox('High-Priority Recs', allHighRecs.length, C.primary, MARGIN + colW2 * 3, colW2)
  b.y += 22

  // Priority recommendations
  if (allHighRecs.length > 0) {
    b.sectionHead('Top Actions', 'Priority Recommendations', C.danger)
    allHighRecs.forEach(item => b.recItem(item.title, item.explanation, 'high'))
    b.y += 3
  }

  // Closing note
  b.rule()
  b.y += 3
  doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(...C.muted)
  const closing = `This report was automatically generated by AuditIQ on ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}. Scores and issues are based on the live content of ${url} at the time of analysis. Re-run the audit after applying fixes to track your progress.`
  const closingLines = doc.splitTextToSize(closing, CONTENT_W)
  doc.text(closingLines, MARGIN, b.y)
  b.y += closingLines.length * 3.5

  // ── Add page headers & footers to every page ─────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    if (p > 1) drawPageHeader(doc, url)   // page 1 has its own cover header
    drawPageFooter(doc, p, totalPages)
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const safeUrl = url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40)
  const filename = `AuditIQ_${safeUrl}_${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
}
