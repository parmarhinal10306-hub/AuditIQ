/**
 * services/geoAnalyzer.js
 *
 * Receives parsed HTML (via node-html-parser) and a base URL string.
 * Returns a structured GEO analysis object with geoScore, metrics, and issues.
 *
 * Checks:
 *   1. Content Citability (Concise segments)
 *   2. Entity Clarity (Topic/Entity marking and alignment)
 *   3. Answer Quality (Direct response to queries)
 *   4. Context Coverage (Substantive content depth)
 *   5. Information Structure (Logical headings/lists)
 *   6. Source & Trust Signals (Author/Contact/About)
 *   7. Structured Information (Schema.org availability)
 *   8. Factual Support (External reference links)
 *
 * Does NOT write to MongoDB — purely analytical.
 */

'use strict';

const { parse } = require('node-html-parser');

const WEIGHTS = {
  citability: 12,
  entityClarity: 12,
  answerQuality: 12,
  contextCoverage: 14,
  infoStructure: 14,
  trustSignals: 12,
  structuredInfo: 12,
  factualSupport: 12
};

const makeIssue = (title, severity, explanation, recommendation) => ({
  title,
  severity,
  explanation,
  recommendation,
});

const wordCount = (text) => {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
};

const extractJsonLd = (root) => {
  const scripts = root.querySelectorAll('script[type="application/ld+json"]');
  const results = [];
  for (const s of scripts) {
    try {
      const data = JSON.parse(s.rawText || s.text || '{}');
      if (Array.isArray(data)) results.push(...data);
      else if (data['@graph']) results.push(...data['@graph']);
      else results.push(data);
    } catch { /* ignore */ }
  }
  return results;
};

const analyzeGeo = (html, pageUrl) => {
  const root = parse(html, {
    comment: false,
    blockTextElements: { script: true, style: true, pre: true },
  });

  const issues = [];
  let earnedScore = 0;

  const h1Els = root.querySelectorAll('h1');
  const h2Els = root.querySelectorAll('h2');
  const h3Els = root.querySelectorAll('h3');
  const paragraphs = root.querySelectorAll('p');
  const links = root.querySelectorAll('a');
  const allHeadings = [...h1Els, ...h2Els, ...h3Els];
  
  // Basic content stats
  let totalWords = 0;
  paragraphs.forEach(p => totalWords += wordCount(p.text));

  // ── 1. Content Citability ──────────────────────────────────────────
  // Check if there are short, extractable paragraphs (40-120 words)
  const extractableParas = paragraphs.filter(p => {
    const count = wordCount(p.text);
    return count >= 30 && count <= 120;
  });
  
  let citabilityScore = 0;
  if (paragraphs.length === 0) {
    issues.push(makeIssue(
      'Missing paragraph content', 'Critical',
      'No paragraphs found. Generative engines cannot extract concise, citable summaries without clear paragraph structures.',
      'Add informative, concise paragraphs that directly address key topics.'
    ));
  } else if (extractableParas.length === 0) {
    issues.push(makeIssue(
      'Poor content citability', 'Warning',
      'No optimally sized paragraphs (30-120 words) found. Overly long or extremely short paragraphs are harder for AI to extract as direct citations.',
      'Break up long walls of text into focused, concise paragraphs containing single complete thoughts.'
    ));
    citabilityScore = WEIGHTS.citability * 0.4;
  } else {
    issues.push(makeIssue(
      'Good content citability', 'Passed',
      `Found ${extractableParas.length} optimally sized paragraph(s) making the content easily citable by generative engines.`,
      'Continue writing in clear, concise blocks prioritising the inverted-pyramid style (most important information first).'
    ));
    citabilityScore = WEIGHTS.citability;
  }
  earnedScore += citabilityScore;

  // ── 2. Entity Clarity ─────────────────────────────────────────────
  // Look for semantic main topic presence, clear H1, or Organization schemas
  const h1Text = h1Els.length > 0 ? h1Els[0].text.toLowerCase() : '';
  const titleText = root.querySelector('title') ? root.querySelector('title').text.toLowerCase() : '';
  const isAligned = h1Text && titleText && (h1Text.includes(titleText) || titleText.includes(h1Text));
  
  let entityScore = 0;
  if (!h1Text || !titleText) {
    issues.push(makeIssue(
      'Unclear core entity', 'Critical',
      'Missing H1 or title tag, obscuring the primary topic/entity of the page.',
      'Ensure the page has a single descriptive H1 and Title tag clearly stating the core topic.'
    ));
  } else if (!isAligned) {
    issues.push(makeIssue(
      'Weak entity alignment', 'Warning',
      'The H1 and Title tag do not share clear topical alignment, which can confuse semantic mapping of the core entity.',
      'Align the H1 and Title tags so they naturally reflect the same core terminology and topic.'
    ));
    entityScore = WEIGHTS.entityClarity * 0.7;
  } else {
    issues.push(makeIssue(
      'Clear entity signals', 'Passed',
      'H1 and Title are aligned, providing a consistent signal about the central topic/entity.',
      'Ensure supportive terms and synonyms naturally revolve around this core entity.'
    ));
    entityScore = WEIGHTS.entityClarity;
  }
  earnedScore += entityScore;

  // ── 3. Answer Quality ─────────────────────────────────────────────
  // Question headings and subsequent answering
  const questionWords = /^(what|who|where|when|why|how|which|can|does|do|is|are)\b/i;
  let questionsCount = 0;
  
  allHeadings.forEach(h => {
    if (questionWords.test(h.text.trim()) || h.text.trim().endsWith('?')) questionsCount++;
  });

  let answerQualityScore = 0;
  if (questionsCount === 0) {
    issues.push(makeIssue(
      'Missing direct question formats', 'Warning',
      'The page lacks question-based headings. Generative engines frequently map content to user questions.',
      'Incorporate headings formulated as common questions your audience asks to improve alignment with generative intents.'
    ));
    answerQualityScore = WEIGHTS.answerQuality * 0.5;
  } else {
    issues.push(makeIssue(
      'Strong semantic answering', 'Passed',
      `Found ${questionsCount} question-based heading(s), naturally positioning the content as a direct answer source.`,
      'Ensure every question is immediately followed by a clear, direct, and factual answer in the next paragraph.'
    ));
    answerQualityScore = WEIGHTS.answerQuality;
  }
  earnedScore += answerQualityScore;

  // ── 4. Context Coverage ───────────────────────────────────────────
  // Depth of content
  let contextScore = 0;
  if (totalWords < 300) {
    issues.push(makeIssue(
      'Thin context coverage', 'Critical',
      `Found only roughly ${totalWords} words. Generative queries require comprehensive context processing.`,
      'Expand the content depth to comprehensively cover the topic, related subtopics, and edge cases (>500 words recommended).'
    ));
    contextScore = WEIGHTS.contextCoverage * 0.2;
  } else if (totalWords < 800) {
    issues.push(makeIssue(
      'Moderate context depth', 'Warning',
      `Found ~${totalWords} words. The content has some depth but might lack comprehensive coverage of adjacent subtopics.`,
      'Add further supporting details, examples, and semantic variations to deepen the topic ecosystem.'
    ));
    contextScore = WEIGHTS.contextCoverage * 0.7;
  } else {
    issues.push(makeIssue(
      'Rich context coverage', 'Passed',
      `Found ~${totalWords} words, suggesting a comprehensive ecosystem of context for generative processing.`,
      'Maintain broad topical coverage while ensuring information remains accurate and free of fluff.'
    ));
    contextScore = WEIGHTS.contextCoverage;
  }
  earnedScore += contextScore;

  // ── 5. Information Structure ──────────────────────────────────────
  // Correct heading nesting
  let infoStructureScore = 0;
  if (h1Els.length === 0 || h2Els.length === 0) {
    issues.push(makeIssue(
      'Flat information structure', 'Critical',
      'The document lacks hierarchical structure (H1 and H2). Generative systems rely on nesting to understand relationships.',
      'Implement a strict hierarchy using H1 for the main concept, H2s for major sections, and H3s for subsections.'
    ));
    infoStructureScore = WEIGHTS.infoStructure * 0.3;
  } else {
    issues.push(makeIssue(
      'Logical information structure', 'Passed',
      'Document demonstrates hierarchical depth (H1 + H2s present), aiding structural comprehension.',
      'Ensure section length is balanced and bulleted/numbered lists are used where appropriate to break up text.'
    ));
    infoStructureScore = WEIGHTS.infoStructure;
  }
  earnedScore += infoStructureScore;

  // ── 6. Source & Trust Signals ─────────────────────────────────────
  // About, Contact, Author info mapping
  const navText = links.map(l => l.text.toLowerCase());
  const hasTrustPages = navText.some(t => t.includes('about') || t.includes('contact'));
  const hasAuthorOrAddress = root.querySelectorAll('address').length > 0 || html.toLowerCase().includes('rel="author"');
  
  let trustScore = 0;
  if (!hasTrustPages && !hasAuthorOrAddress) {
    issues.push(makeIssue(
      'Missing trust and source signals', 'Warning',
      'Could not detect standard "About", "Contact", or authorship signals. Generative engines assess origin credibility.',
      'Include clear author bylines, an about page, and contact details to establish source credibility and transparency.'
    ));
    trustScore = WEIGHTS.trustSignals * 0.4;
  } else {
    issues.push(makeIssue(
      'Trust signals detected', 'Passed',
      'Identified standard source credibility markers (e.g. About/Contact links or Author tags).',
      'Continue establishing brand identity. Ensure all claims are tied to transparent entities or verified authors.'
    ));
    trustScore = WEIGHTS.trustSignals;
  }
  earnedScore += trustScore;

  // ── 7. Structured Information ─────────────────────────────────────
  // Schema.org usage
  const jsonLdBlocks = extractJsonLd(root);
  let structScore = 0;
  if (jsonLdBlocks.length === 0) {
    issues.push(makeIssue(
      'No semantic structured data', 'Critical',
      'Zero JSON-LD structured data detected. Semantic data explicitly defines entities for generative models.',
      'Implement appropriate JSON-LD (e.g., Article, Organization, or FAQ) to formally define entities and properties.'
    ));
    structScore = WEIGHTS.structuredInfo * 0.2;
  } else {
    issues.push(makeIssue(
      'Structured Information present', 'Passed',
      `Detected ${jsonLdBlocks.length} JSON-LD block(s) helping disambiguate content entities.`,
      'Ensure structured data strictly mirrors the on-page content and includes unambiguous entity IDs if possible.'
    ));
    structScore = WEIGHTS.structuredInfo;
  }
  earnedScore += structScore;

  // ── 8. Factual Support ────────────────────────────────────────────
  // External citations (outgoing links to authoritative / other domains)
  let externalLinks = 0;
  try {
    const baseOrigin = new URL(pageUrl).origin;
    links.forEach(a => {
      const href = a.getAttribute('href');
      if (href && href.startsWith('http')) {
        const u = new URL(href);
        if (u.origin !== baseOrigin) externalLinks++;
      }
    });
  } catch (e) {
    // If URL parsing fails, we default to basic check
    externalLinks = links.filter(a => (a.getAttribute('href')||'').startsWith('http')).length;
  }

  let factualScore = 0;
  if (externalLinks === 0) {
    issues.push(makeIssue(
      'Lack of external factual referencing', 'Warning',
      'No external links found. Synthesized answers depend heavily on cross-referenced, trustworthy citations.',
      'Include outbound links to authoritative, non-competing primary sources to substantiate factual claims.'
    ));
    factualScore = WEIGHTS.factualSupport * 0.3;
  } else {
    issues.push(makeIssue(
      'Factual support potential', 'Passed',
      `Found ${externalLinks} external link(s). Outbound sourcing provides validity to generative algorithms.`,
      'Ensure citations point to highly trusted, high-reputation domains (.edu, .gov, leading research institutions).'
    ));
    factualScore = WEIGHTS.factualSupport;
  }
  earnedScore += factualScore;

  // ── Final Score ───────────────────────────────────────────────────
  const geoScore = Math.round(Math.min(100, Math.max(0, earnedScore)));

  return {
    geoScore,
    metrics: {
      citability: { paragraphs: paragraphs.length, citableParas: extractableParas.length },
      entity: { h1MatchesTitle: isAligned },
      questions: { count: questionsCount },
      context: { wordCount: totalWords },
      structure: { hasH1: h1Els.length > 0, h2Count: h2Els.length },
      trust: { hasTrustSignals: hasTrustPages || hasAuthorOrAddress },
      structured: { jsonLdCount: jsonLdBlocks.length },
      factual: { externalLinks }
    },
    issues
  };
};

module.exports = { analyzeGeo };
