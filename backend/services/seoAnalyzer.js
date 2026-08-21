/**
 * services/seoAnalyzer.js
 *
 * Receives parsed HTML (via node-html-parser) and a base URL string.
 * Returns a structured SEO analysis object with score, metrics, and issues.
 *
 * Does NOT write to MongoDB — purely analytical.
 */

const { parse } = require('node-html-parser');

// ─────────────────────────────────────────────
// Scoring weights (total = 100)
// ─────────────────────────────────────────────
const WEIGHTS = {
  title: 20,
  metaDescription: 15,
  h1: 15,
  headingHierarchy: 10,
  images: 15,
  canonical: 10,
  robots: 5,
  links: 10,
};

// ─────────────────────────────────────────────
// Helper: build an issue object
// ─────────────────────────────────────────────
const makeIssue = (title, severity, explanation, recommendation) => ({
  title,
  severity,   // 'Critical' | 'Warning' | 'Passed'
  explanation,
  recommendation,
});

// ─────────────────────────────────────────────
// Main analyzer
// ─────────────────────────────────────────────
const analyzeSeo = (html, pageUrl) => {
  const root = parse(html, {
    comment: false,
    blockTextElements: {
      script: true,
      style: true,
      pre: true,
    },
  });

  const issues = [];
  let earnedScore = 0;

  // ── 1. Page Title ──────────────────────────
  const titleEl = root.querySelector('title');
  const titleText = titleEl ? titleEl.text.trim() : '';
  const titleLen = titleText.length;
  let titleScore = 0;

  if (!titleText) {
    issues.push(makeIssue(
      'Missing page title',
      'Critical',
      'The page has no <title> tag. Search engines use the title as the primary ranking and click signal.',
      'Add a unique, descriptive <title> of 50–60 characters to every page.'
    ));
  } else if (titleLen < 30) {
    issues.push(makeIssue(
      'Page title is too short',
      'Warning',
      `The title "${titleText}" is only ${titleLen} characters. Short titles miss keyword and context opportunities.`,
      'Expand the title to 50–60 characters, including the primary keyword.'
    ));
    titleScore = WEIGHTS.title * 0.6;
  } else if (titleLen > 60) {
    issues.push(makeIssue(
      'Page title is too long',
      'Warning',
      `The title is ${titleLen} characters — search engines typically truncate after 60 chars.`,
      'Shorten the title to 50–60 characters without losing the primary keyword.'
    ));
    titleScore = WEIGHTS.title * 0.7;
  } else {
    issues.push(makeIssue(
      'Page title present and well-sized',
      'Passed',
      `Title: "${titleText}" (${titleLen} characters).`,
      'Keep the title relevant and aligned with the primary keyword on the page.'
    ));
    titleScore = WEIGHTS.title;
  }
  earnedScore += titleScore;

  // ── 2. Meta Description ────────────────────
  const metaDescEl = root.querySelector('meta[name="description"]');
  const metaDesc = metaDescEl ? (metaDescEl.getAttribute('content') || '').trim() : '';
  const metaLen = metaDesc.length;
  let metaScore = 0;

  if (!metaDesc) {
    issues.push(makeIssue(
      'Missing meta description',
      'Critical',
      'No meta description was found. Search engines use this to generate the snippet shown in results.',
      'Write a compelling meta description of 140–160 characters summarising the page content.'
    ));
  } else if (metaLen < 70) {
    issues.push(makeIssue(
      'Meta description is too short',
      'Warning',
      `Meta description is only ${metaLen} characters — a short snippet reduces click-through rates.`,
      'Expand the meta description to 140–160 characters with a clear call-to-action.'
    ));
    metaScore = WEIGHTS.metaDescription * 0.6;
  } else if (metaLen > 160) {
    issues.push(makeIssue(
      'Meta description is too long',
      'Warning',
      `Meta description is ${metaLen} characters. Google typically shows 155–160 chars maximum.`,
      'Trim the description to under 160 characters while keeping the core message.'
    ));
    metaScore = WEIGHTS.metaDescription * 0.7;
  } else {
    issues.push(makeIssue(
      'Meta description present and well-sized',
      'Passed',
      `Meta description: "${metaDesc.substring(0, 80)}…" (${metaLen} characters).`,
      'Keep the meta description aligned with the page topic and target keyword.'
    ));
    metaScore = WEIGHTS.metaDescription;
  }
  earnedScore += metaScore;

  // ── 3. H1 ──────────────────────────────────
  const h1Els = root.querySelectorAll('h1');
  const h1Count = h1Els.length;
  let h1Score = 0;

  if (h1Count === 0) {
    issues.push(makeIssue(
      'Missing H1 heading',
      'Critical',
      'No H1 tag was found. The H1 is the primary content signal for search engines on each page.',
      'Add a single, keyword-rich H1 tag that clearly describes the page topic.'
    ));
  } else if (h1Count > 1) {
    issues.push(makeIssue(
      'Multiple H1 headings detected',
      'Warning',
      `${h1Count} H1 tags were found. Multiple H1s can dilute relevance signals.`,
      'Consolidate to a single H1 per page and demote extra headings to H2 or H3.'
    ));
    h1Score = WEIGHTS.h1 * 0.6;
  } else {
    const h1Text = h1Els[0].text.trim();
    issues.push(makeIssue(
      'H1 heading present',
      'Passed',
      `H1: "${h1Text.substring(0, 80)}"`,
      'Keep the H1 concise, unique, and aligned with the page title and content.'
    ));
    h1Score = WEIGHTS.h1;
  }
  earnedScore += h1Score;

  // ── 4. Heading Hierarchy ───────────────────
  const h2Count = root.querySelectorAll('h2').length;
  const h3Count = root.querySelectorAll('h3').length;
  let hierarchyScore = 0;

  if (h2Count === 0) {
    issues.push(makeIssue(
      'No H2 headings found',
      'Warning',
      'The page has no H2 headings, which limits the content structure signal search engines use.',
      'Add H2 headings that reflect the primary sub-topics of the page.'
    ));
  } else {
    issues.push(makeIssue(
      'Heading structure detected',
      'Passed',
      `Found ${h2Count} H2 and ${h3Count} H3 heading(s).`,
      'Ensure each heading reflects a distinct sub-topic with relevant keywords.'
    ));
    hierarchyScore = WEIGHTS.headingHierarchy;
  }
  earnedScore += hierarchyScore;

  // ── 5. Images ────────────────────────────── 
  const imgEls = root.querySelectorAll('img');
  const totalImages = imgEls.length;
  const missingAlt = imgEls.filter(img => {
    const alt = img.getAttribute('alt');
    return alt === null || alt === undefined || alt.trim() === '';
  }).length;
  let imageScore = 0;

  if (totalImages === 0) {
    issues.push(makeIssue(
      'No images found on page',
      'Warning',
      'The page contains no <img> elements. Visual content supports engagement and image search.',
      'Consider adding relevant, optimised images to support content and image-search discoverability.'
    ));
    imageScore = WEIGHTS.images * 0.5;
  } else if (missingAlt > 0) {
    const ratio = missingAlt / totalImages;
    const sev = ratio > 0.5 ? 'Critical' : 'Warning';
    issues.push(makeIssue(
      `${missingAlt} image(s) missing alt text`,
      sev,
      `${missingAlt} of ${totalImages} images have no alt attribute. Alt text is required for accessibility and image-search indexing.`,
      'Add descriptive alt text to every image that conveys content. Use empty alt="" for decorative images.'
    ));
    imageScore = WEIGHTS.images * (1 - ratio * 0.8);
  } else {
    issues.push(makeIssue(
      'All images have alt text',
      'Passed',
      `${totalImages} image(s) found — all have alt attributes.`,
      'Keep alt text descriptive and concise (under 125 characters).'
    ));
    imageScore = WEIGHTS.images;
  }
  earnedScore += imageScore;

  // ── 6. Links ───────────────────────────────
  let baseOrigin = '';
  try { baseOrigin = new URL(pageUrl).origin; } catch { /* ignore */ }

  const anchorEls = root.querySelectorAll('a[href]');
  let internalLinks = 0;
  let externalLinks = 0;

  anchorEls.forEach(a => {
    const href = (a.getAttribute('href') || '').trim();
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    try {
      const abs = new URL(href, pageUrl);
      if (abs.origin === baseOrigin) internalLinks++;
      else externalLinks++;
    } catch { /* ignore malformed hrefs */ }
  });

  let linkScore = 0;
  if (internalLinks === 0) {
    issues.push(makeIssue(
      'No internal links detected',
      'Warning',
      'The page has no internal links. Internal linking supports crawl depth and distributes page authority.',
      'Add contextual internal links to related pages or key sections of the site.'
    ));
  } else {
    issues.push(makeIssue(
      'Internal links present',
      'Passed',
      `Found ${internalLinks} internal link(s) and ${externalLinks} external link(s).`,
      'Ensure internal links use descriptive anchor text and point to high-value pages.'
    ));
    linkScore = WEIGHTS.links;
  }
  earnedScore += linkScore;

  // ── 7. Canonical URL ──────────────────────
  const canonicalEl = root.querySelector('link[rel="canonical"]');
  const canonicalHref = canonicalEl ? canonicalEl.getAttribute('href') : null;
  let canonicalScore = 0;

  if (!canonicalHref) {
    issues.push(makeIssue(
      'Missing canonical tag',
      'Warning',
      'No <link rel="canonical"> was found. Without it, search engines may index duplicate versions of this URL.',
      'Add a self-referencing canonical URL to the <head> of every page.'
    ));
  } else {
    issues.push(makeIssue(
      'Canonical tag present',
      'Passed',
      `Canonical URL: "${canonicalHref}"`,
      'Ensure the canonical URL exactly matches the preferred version of the page URL.'
    ));
    canonicalScore = WEIGHTS.canonical;
  }
  earnedScore += canonicalScore;

  // ── 8. Robots meta ────────────────────────
  const robotsEl = root.querySelector('meta[name="robots"]');
  const robotsContent = robotsEl ? (robotsEl.getAttribute('content') || '').toLowerCase() : '';
  let robotsScore = 0;

  if (!robotsEl) {
    issues.push(makeIssue(
      'No robots meta tag',
      'Warning',
      'No robots meta tag found. While not mandatory, it is best practice to declare crawling intent explicitly.',
      'Add <meta name="robots" content="index, follow"> to confirm search engine indexing.'
    ));
  } else if (robotsContent.includes('noindex')) {
    issues.push(makeIssue(
      'Page set to noindex',
      'Critical',
      `Robots meta contains "noindex" — search engines will NOT index this page.`,
      'If this page should be indexed, change the robots directive to "index, follow".'
    ));
  } else {
    issues.push(makeIssue(
      'Robots meta tag present and indexable',
      'Passed',
      `Robots meta: "${robotsContent || 'index, follow'}"`,
      'Keep the robots meta consistent across the site to avoid accidental de-indexing.'
    ));
    robotsScore = WEIGHTS.robots;
  }
  earnedScore += robotsScore;

  // ── Final score ────────────────────────────
  const seoScore = Math.round(Math.min(100, Math.max(0, earnedScore)));

  return {
    seoScore,
    metrics: {
      title: { text: titleText, length: titleLen },
      metaDescription: { text: metaDesc, length: metaLen },
      h1: { count: h1Count, texts: h1Els.map(el => el.text.trim().substring(0, 120)) },
      headings: { h2Count, h3Count },
      images: { total: totalImages, missingAlt },
      links: { internal: internalLinks, external: externalLinks },
      canonical: { href: canonicalHref || null },
      robots: { content: robotsContent || null },
    },
    issues,
  };
};

module.exports = { analyzeSeo };
