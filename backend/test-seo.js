/**
 * tmp test script — run with: node test-seo.js
 * Tests websiteFetcher + seoAnalyzer end-to-end against a real public URL.
 */
require('dotenv').config();
const { fetchWebsite } = require('./services/websiteFetcher');
const { analyzeSeo } = require('./services/seoAnalyzer');

const TEST_URL = 'https://example.com';

(async () => {
  console.log(`\n[test] Fetching: ${TEST_URL}\n`);
  try {
    const { html, finalUrl, statusCode } = await fetchWebsite(TEST_URL);
    console.log(`[test] HTTP ${statusCode} — final URL: ${finalUrl}`);
    console.log(`[test] HTML length: ${html.length} bytes\n`);

    const result = analyzeSeo(html, finalUrl);

    console.log('═══════════════════════════════════════');
    console.log(`  SEO SCORE: ${result.seoScore} / 100`);
    console.log('═══════════════════════════════════════\n');

    console.log('── Metrics ─────────────────────────────');
    console.log(JSON.stringify(result.metrics, null, 2));

    console.log('\n── Issues ──────────────────────────────');
    result.issues.forEach(issue => {
      const icon = issue.severity === 'Critical' ? '🔴' : issue.severity === 'Warning' ? '🟡' : '✅';
      console.log(`${icon} [${issue.severity}] ${issue.title}`);
      console.log(`   ${issue.explanation}`);
      console.log(`   → ${issue.recommendation}\n`);
    });
  } catch (err) {
    console.error('[test] Error:', err.message);
  }
})();
