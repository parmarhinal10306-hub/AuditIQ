/**
 * services/aeoAnalyzer.js
 *
 * Receives parsed HTML (via node-html-parser) and a base URL string.
 * Returns a structured AEO analysis object with aeoScore, metrics, and issues.
 *
 * Checks:
 *   1. Question-based headings
 *   2. Direct answers (headings followed by substantive text)
 *   3. FAQ content (explicit FAQ sections or question lists)
 *   4. Content structure (heading + paragraph coverage)
 *   5. Lists (ordered / unordered for scannable answers)
 *   6. Concise answer content (short conclusive paragraphs near headings)
 *   7. Schema signals (FAQPage / HowTo / QAPage JSON-LD)
 *
 * Does NOT write to MongoDB — purely analytical.
 */

'use strict';

const { parse } = require('node-html-parser');

// ─────────────────────────────────────────────────────────────────────────────
// Scoring weights (total = 100)
// ─────────────────────────────────────────────────────────────────────────────
const WEIGHTS = {
  questionHeadings:  18,  // AEO's primary signal — question phrasing in headings
  directAnswers:     18,  // Substantive text immediately after headings
  faqContent:        16,  // Explicit FAQ sections or pattern-matched Q&A blocks
  contentStructure:  14,  // Heading hierarchy + paragraph density
  lists:             12,  // Scannable lists for multi-part answers
  conciseAnswers:    12,  // Short (≤120 word) paragraphs right after headings
  schemaSignals:     10,  // FAQPage / HowTo / QAPage JSON-LD presence
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// Words / patterns that strongly indicate a question heading
const QUESTION_WORDS  = /^(what|who|where|when|why|how|which|can|does|do|is|are|will|should|would|could|has|have|did|was|were)\b/i;
const ENDS_WITH_QMARK = /\?$/;

// FAQ section id / class / text heuristics
const FAQ_PATTERN = /\b(faq|frequently.asked|common.question|help.center|q\s*&\s*a|questions?\s*(&|and)\s*answers?)\b/i;

// Short-answer paragraph: ≤ 120 words and not just a stub (≥ 10 words)
const SHORT_ANSWER_MIN_WORDS = 10;
const SHORT_ANSWER_MAX_WORDS = 120;

// Schema types we consider AEO-positive
const AEO_SCHEMA_TYPES = ['faqpage', 'howto', 'qapage', 'speakable'];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const makeIssue = (title, severity, explanation, recommendation) => ({
  title,
  severity,   // 'Critical' | 'Warning' | 'Passed'
  explanation,
  recommendation,
});

/** Count words in a string */
const wordCount = (text) => {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
};

/** Return the plain text of the next sibling paragraph after a heading element */
const nextSiblingParagraphs = (headingEl, root) => {
  // node-html-parser doesn't expose nextSibling directly on elements in all versions,
  // so we walk the parent's childNodes instead.
  const parent = headingEl.parentNode;
  if (!parent) return [];
  const children = parent.childNodes;
  let found = false;
  const paragraphs = [];
  for (const node of children) {
    if (node === headingEl) { found = true; continue; }
    if (!found) continue;
    const tag = (node.tagName || '').toLowerCase();
    // Stop at the next heading
    if (['h1','h2','h3','h4','h5','h6'].includes(tag)) break;
    if (tag === 'p') {
      const text = node.text.trim();
      if (text.length > 0) paragraphs.push(text);
    }
    // Also collect direct divs that contain text but no child headings
    if (tag === 'div') {
      const innerText = node.text.trim();
      if (innerText && !node.querySelector('h1,h2,h3,h4,h5,h6')) {
        paragraphs.push(innerText);
      }
    }
  }
  return paragraphs;
};

/** Extract all JSON-LD script blocks from the page */
const extractJsonLd = (root) => {
  const scripts = root.querySelectorAll('script[type="application/ld+json"]');
  const results = [];
  for (const s of scripts) {
    try {
      const data = JSON.parse(s.rawText || s.text || '{}');
      // Handle both single objects and @graph arrays
      if (Array.isArray(data)) results.push(...data);
      else if (data['@graph']) results.push(...data['@graph']);
      else results.push(data);
    } catch { /* ignore malformed JSON-LD */ }
  }
  return results;
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Analyzer
// ─────────────────────────────────────────────────────────────────────────────

const analyzeAeo = (html, pageUrl) => {
  const root = parse(html, {
    comment: false,
    blockTextElements: {
      script: true,
      style:  true,
      pre:    true,
    },
  });

  const issues      = [];
  let   earnedScore = 0;

  // All headings h1–h4 combined (h5/h6 rarely used for AEO signals)
  const allHeadings = root.querySelectorAll('h1,h2,h3,h4');

  // ── 1. Question-based Headings ──────────────────────────────────────────
  const questionHeadings = allHeadings.filter((h) => {
    const text = h.text.trim();
    return ENDS_WITH_QMARK.test(text) || QUESTION_WORDS.test(text);
  });
  const totalHeadings      = allHeadings.length;
  const questionCount      = questionHeadings.length;

  let questionScore = 0;

  if (totalHeadings === 0) {
    issues.push(makeIssue(
      'No headings found on page',
      'Critical',
      'The page has no heading elements (H1–H4). Answer engines rely on headings to understand topic structure.',
      'Add a clear H1 plus structured H2/H3 headings that reflect the core questions your audience asks.'
    ));
  } else if (questionCount === 0) {
    issues.push(makeIssue(
      'No question-based headings detected',
      'Warning',
      `Found ${totalHeadings} heading(s) but none are phrased as questions. AEO favours pages that mirror search questions directly.`,
      'Rephrase at least 2–3 key H2/H3 headings as the exact questions your audience types (e.g. "How does X work?").'
    ));
    questionScore = WEIGHTS.questionHeadings * 0.2; // partial credit for having headings at all
  } else {
    const ratio = questionCount / Math.max(totalHeadings, 1);
    if (ratio < 0.2) {
      issues.push(makeIssue(
        'Few question-based headings',
        'Warning',
        `Only ${questionCount} of ${totalHeadings} headings are phrased as questions (${Math.round(ratio * 100)}%).`,
        'Increase question-phrased headings to at least 20–30% of your heading tags to strengthen AEO signals.'
      ));
      questionScore = WEIGHTS.questionHeadings * 0.6;
    } else {
      issues.push(makeIssue(
        'Question-based headings present',
        'Passed',
        `${questionCount} of ${totalHeadings} heading(s) use question phrasing — strong AEO signal.`,
        'Keep questions aligned with real user queries. Avoid stuffing questions that don\'t reflect genuine intent.'
      ));
      questionScore = WEIGHTS.questionHeadings;
    }
  }
  earnedScore += questionScore;

  // ── 2. Direct Answers ───────────────────────────────────────────────────
  // Check how many headings are immediately followed by a paragraph
  let headingsWithAnswer = 0;
  const h2h3Els = root.querySelectorAll('h2,h3');

  for (const heading of h2h3Els) {
    const siblings = nextSiblingParagraphs(heading, root);
    if (siblings.length > 0 && wordCount(siblings[0]) >= 10) {
      headingsWithAnswer++;
    }
  }

  let directAnswerScore = 0;
  const h2h3Count = h2h3Els.length;

  if (h2h3Count === 0) {
    issues.push(makeIssue(
      'No H2/H3 headings to evaluate for direct answers',
      'Warning',
      'The page has no H2 or H3 headings, so no direct answer sections can be detected.',
      'Structure content with H2 topic headings each immediately followed by a concise answer paragraph.'
    ));
  } else {
    const answerRatio = headingsWithAnswer / h2h3Count;
    if (answerRatio === 0) {
      issues.push(makeIssue(
        'Headings not followed by answer text',
        'Critical',
        `None of the ${h2h3Count} H2/H3 headings are directly followed by paragraph content. Answer engines extract answers from heading + paragraph pairs.`,
        'Immediately follow each heading with a short paragraph (2–4 sentences) that directly answers the heading\'s implied question.'
      ));
    } else if (answerRatio < 0.5) {
      issues.push(makeIssue(
        'Many headings lack direct answer text',
        'Warning',
        `Only ${headingsWithAnswer} of ${h2h3Count} H2/H3 headings are followed by paragraph content (${Math.round(answerRatio * 100)}% coverage).`,
        'Add a concise answer paragraph after every major heading. AEO extraction depends on heading-paragraph proximity.'
      ));
      directAnswerScore = WEIGHTS.directAnswers * 0.5;
    } else if (answerRatio < 0.8) {
      issues.push(makeIssue(
        'Most headings have direct answer text',
        'Warning',
        `${headingsWithAnswer} of ${h2h3Count} H2/H3 headings are followed by paragraph content (${Math.round(answerRatio * 100)}% coverage). Good, but improvable.`,
        'Ensure every heading is followed by at least one answer paragraph to maximise AEO extraction.'
      ));
      directAnswerScore = WEIGHTS.directAnswers * 0.8;
    } else {
      issues.push(makeIssue(
        'Headings consistently followed by answer text',
        'Passed',
        `${headingsWithAnswer} of ${h2h3Count} H2/H3 headings are followed by paragraph content (${Math.round(answerRatio * 100)}% coverage).`,
        'Maintain this heading-answer structure. Consider leading each paragraph with the most important sentence.'
      ));
      directAnswerScore = WEIGHTS.directAnswers;
    }
  }
  earnedScore += directAnswerScore;

  // ── 3. FAQ Content ──────────────────────────────────────────────────────
  // Look for: sections/divs with FAQ ids/classes, headings with FAQ text,
  // or a dense cluster of question-phrased headings.
  const bodyHtml   = root.querySelector('body') ? root.querySelector('body').innerHTML : html;
  const faqByAttr  = FAQ_PATTERN.test(bodyHtml);
  const faqHeadings = allHeadings.filter((h) => FAQ_PATTERN.test(h.text));

  // Dense cluster: 3+ question headings near each other
  const denseCluster = questionCount >= 3;

  let faqScore = 0;

  if (faqByAttr || faqHeadings.length > 0) {
    issues.push(makeIssue(
      'FAQ section detected',
      'Passed',
      `An FAQ or Q&A section was found on the page — a strong signal for featured snippet and voice-search extraction.`,
      'Ensure each FAQ question has a concise answer (40–60 words) directly beneath it, and add FAQPage schema markup.'
    ));
    faqScore = WEIGHTS.faqContent;
  } else if (denseCluster) {
    issues.push(makeIssue(
      'Question cluster present (implicit FAQ)',
      'Passed',
      `${questionCount} question-phrased headings were found — this acts as an implicit FAQ even without an explicit section.`,
      'Consider grouping related questions under a dedicated "Frequently Asked Questions" heading and adding FAQPage schema.'
    ));
    faqScore = WEIGHTS.faqContent * 0.75;
  } else if (questionCount > 0) {
    issues.push(makeIssue(
      'No dedicated FAQ section found',
      'Warning',
      `The page has question headings but no identifiable FAQ section. Answer engines heavily reward explicit FAQ-structured content.`,
      'Create a dedicated FAQ section with at least 5 Q&A pairs. Add FAQPage schema and an id="faq" on the section element.'
    ));
    faqScore = WEIGHTS.faqContent * 0.3;
  } else {
    issues.push(makeIssue(
      'No FAQ content detected',
      'Critical',
      'No FAQ section, FAQ headings, or question-based content was detected. This is a major missed AEO opportunity.',
      'Add a dedicated FAQ section with 5–10 questions that match real search queries. Use FAQPage schema markup.'
    ));
  }
  earnedScore += faqScore;

  // ── 4. Content Structure ────────────────────────────────────────────────
  const paragraphs   = root.querySelectorAll('p');
  const paraCount    = paragraphs.length;
  const h2Count      = root.querySelectorAll('h2').length;

  let structureScore = 0;

  if (h2Count === 0 && paraCount < 3) {
    issues.push(makeIssue(
      'Minimal content structure',
      'Critical',
      `The page has ${h2Count} H2 headings and ${paraCount} paragraphs. Answer engines cannot extract structured answers from thin, unorganised content.`,
      'Build clear topic sections with an H2 heading followed by 2–4 paragraphs each. Aim for at least 300 words of structured body text.'
    ));
  } else if (h2Count === 0) {
    issues.push(makeIssue(
      'No H2 section headings',
      'Warning',
      `The page has ${paraCount} paragraph(s) but no H2 headings to delineate topics. Without section headings, answer extraction is fragmented.`,
      'Add H2 headings as topic dividers above each major content section to help answer engines map content to specific questions.'
    ));
    structureScore = WEIGHTS.contentStructure * 0.4;
  } else if (paraCount < 5) {
    issues.push(makeIssue(
      'Limited paragraph content',
      'Warning',
      `Found ${h2Count} H2 heading(s) but only ${paraCount} paragraph(s). Answer engines need enough paragraph content beneath each heading.`,
      'Expand each section with at least 2–3 substantive paragraphs. Avoid pages with headings and little body text.'
    ));
    structureScore = WEIGHTS.contentStructure * 0.6;
  } else {
    issues.push(makeIssue(
      'Content structure is well-organised',
      'Passed',
      `Found ${h2Count} H2 heading(s) and ${paraCount} paragraph(s) — good structural foundation for AEO extraction.`,
      'Keep each section focused on a single topic. Avoid combining unrelated ideas under one heading.'
    ));
    structureScore = WEIGHTS.contentStructure;
  }
  earnedScore += structureScore;

  // ── 5. Lists ────────────────────────────────────────────────────────────
  const ulEls     = root.querySelectorAll('ul');
  const olEls     = root.querySelectorAll('ol');
  const listCount = ulEls.length + olEls.length;

  // Count total list items to distinguish meaningful lists from nav menus
  const totalLiCount = root.querySelectorAll('li').length;
  // Nav menus typically have few items; meaningful content lists tend to have more
  const meaningfulListItems = totalLiCount;

  let listScore = 0;

  if (listCount === 0) {
    issues.push(makeIssue(
      'No lists detected on page',
      'Warning',
      'The page contains no ordered or unordered lists. Lists are highly extracted by answer engines for multi-step or enumerated answers.',
      'Add bullet-point or numbered lists for any content that involves steps, features, options, or comparisons.'
    ));
  } else if (meaningfulListItems < 4) {
    issues.push(makeIssue(
      'Few list items detected',
      'Warning',
      `Found ${listCount} list(s) with only ${meaningfulListItems} total list item(s). Answer engines favour pages with substantive lists.`,
      'Expand existing lists or add new ones. Use <ol> for procedural steps and <ul> for feature/option lists.'
    ));
    listScore = WEIGHTS.lists * 0.5;
  } else {
    issues.push(makeIssue(
      'Lists present for structured answers',
      'Passed',
      `Found ${listCount} list(s) with ${meaningfulListItems} total item(s) — good for enumerated AEO extraction.`,
      'Keep list items concise (one idea per item). Avoid nesting more than two levels deep.'
    ));
    listScore = WEIGHTS.lists;
  }
  earnedScore += listScore;

  // ── 6. Concise Answer Content ───────────────────────────────────────────
  // Identify paragraphs with short, direct answer characteristics
  const conciseParagraphs = paragraphs.filter((p) => {
    const wc = wordCount(p.text);
    return wc >= SHORT_ANSWER_MIN_WORDS && wc <= SHORT_ANSWER_MAX_WORDS;
  });
  const conciseRatio = paraCount > 0 ? conciseParagraphs.length / paraCount : 0;

  let conciseScore = 0;

  if (paraCount === 0) {
    issues.push(makeIssue(
      'No paragraph content found',
      'Critical',
      'No <p> tags were found on the page. Answer engines cannot extract concise answers without paragraph content.',
      'Structure all answer text inside <p> elements. Aim for paragraphs of 40–120 words per answer block.'
    ));
  } else if (conciseParagraphs.length === 0) {
    issues.push(makeIssue(
      'No concise answer paragraphs detected',
      'Warning',
      `All ${paraCount} paragraph(s) are either too short (< ${SHORT_ANSWER_MIN_WORDS} words) or too long (> ${SHORT_ANSWER_MAX_WORDS} words) to serve as direct answers.`,
      'Write at least 3–5 focused paragraphs of 40–120 words each. Long paragraphs fragment answer extraction; very short ones lack substance.'
    ));
    conciseScore = WEIGHTS.conciseAnswers * 0.2;
  } else if (conciseRatio < 0.3) {
    issues.push(makeIssue(
      'Few concise answer paragraphs',
      'Warning',
      `Only ${conciseParagraphs.length} of ${paraCount} paragraph(s) fall within the ideal 10–120 word range for direct answers (${Math.round(conciseRatio * 100)}%).`,
      'Break long paragraphs into focused 40–80 word answer blocks. Trim stub paragraphs to meaningful supporting detail.'
    ));
    conciseScore = WEIGHTS.conciseAnswers * 0.5;
  } else {
    issues.push(makeIssue(
      'Concise answer paragraphs present',
      'Passed',
      `${conciseParagraphs.length} of ${paraCount} paragraph(s) are within the ideal direct-answer length range (${Math.round(conciseRatio * 100)}%).`,
      'Maintain this writing style. Place the most important sentence first in each paragraph (inverted pyramid).'
    ));
    conciseScore = WEIGHTS.conciseAnswers;
  }
  earnedScore += conciseScore;

  // ── 7. Schema Signals ───────────────────────────────────────────────────
  const jsonLdBlocks  = extractJsonLd(root);
  const foundTypes    = jsonLdBlocks
    .map((block) => (block['@type'] || '').toLowerCase())
    .filter(Boolean);

  const aeoSchemaHits = foundTypes.filter((t) =>
    AEO_SCHEMA_TYPES.some((s) => t.includes(s))
  );

  // Also check for Speakable schema inside any type
  const rawHtml        = html.toLowerCase();
  const hasSpeakable   = rawHtml.includes('"speakable"') || rawHtml.includes("'speakable'");

  let schemaScore = 0;

  if (aeoSchemaHits.length === 0 && !hasSpeakable) {
    // Check if there's any schema at all
    if (jsonLdBlocks.length === 0) {
      issues.push(makeIssue(
        'No structured data (JSON-LD) detected',
        'Critical',
        'No JSON-LD schema markup was found. AEO-critical schema types like FAQPage, HowTo, and QAPage are completely absent.',
        'Add JSON-LD structured data. Start with FAQPage schema for any Q&A content, then HowTo for procedural content.'
      ));
    } else {
      issues.push(makeIssue(
        'No AEO-relevant schema types found',
        'Warning',
        `Found ${jsonLdBlocks.length} JSON-LD block(s) but none are AEO-relevant types (FAQPage, HowTo, QAPage, Speakable). Schema types present: ${foundTypes.join(', ') || 'unknown'}.`,
        'Add FAQPage schema for Q&A content and HowTo schema for procedural content. These are directly used by Google for featured snippets.'
      ));
      schemaScore = WEIGHTS.schemaSignals * 0.2;
    }
  } else if (aeoSchemaHits.length === 1) {
    issues.push(makeIssue(
      'AEO schema type present',
      'Passed',
      `Detected AEO-relevant schema: "${aeoSchemaHits[0]}". This improves structured-answer eligibility in search results.`,
      'Expand schema coverage: pair FAQPage with HowTo for step-based content. Validate at schema.org/validator.'
    ));
    schemaScore = WEIGHTS.schemaSignals * 0.8;
  } else {
    issues.push(makeIssue(
      'Multiple AEO schema types present',
      'Passed',
      `Detected ${aeoSchemaHits.length} AEO-relevant schema types: ${aeoSchemaHits.join(', ')}. Excellent structured-data coverage.`,
      'Validate all schema blocks at schema.org/validator and Google\'s Rich Results Test. Ensure no duplicate @type conflicts.'
    ));
    schemaScore = WEIGHTS.schemaSignals;
  }
  earnedScore += schemaScore;

  // ── Final score ─────────────────────────────────────────────────────────
  const aeoScore = Math.round(Math.min(100, Math.max(0, earnedScore)));

  return {
    aeoScore,
    metrics: {
      headings: {
        total:          totalHeadings,
        questionBased:  questionCount,
        h2Count,
      },
      answers: {
        h2h3WithAnswerParagraph: headingsWithAnswer,
        totalH2h3:               h2h3Count,
      },
      faq: {
        explicitFaqFound:  faqByAttr || faqHeadings.length > 0,
        faqHeadingCount:   faqHeadings.length,
      },
      content: {
        paragraphCount:         paraCount,
        conciseParagraphCount:  conciseParagraphs.length,
      },
      lists: {
        total:   listCount,
        liCount: meaningfulListItems,
      },
      schema: {
        jsonLdBlockCount:  jsonLdBlocks.length,
        aeoTypesFound:     aeoSchemaHits,
        hasSpeakable,
      },
    },
    issues,
  };
};

module.exports = { analyzeAeo };
