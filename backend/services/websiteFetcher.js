/**
 * services/websiteFetcher.js
 *
 * Fetches the raw HTML of a given URL using Node.js built-in fetch.
 * Returns { html, finalUrl, statusCode } on success.
 * Throws a clear Error on failure.
 */

const TIMEOUT_MS = 15000;

const fetchWebsite = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; AuditIQBot/1.0; +https://auditiq.com/bot)',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    clearTimeout(timer);

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      throw new Error(
        `Unexpected content type: "${contentType}". Only HTML pages can be audited.`
      );
    }

    const html = await response.text();

    return {
      html,
      finalUrl: response.url || url,
      statusCode: response.status,
    };
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${TIMEOUT_MS / 1000}s for: ${url}`);
    }
    throw err;
  }
};

module.exports = { fetchWebsite };
