const AppError = require('../utils/AppError');
const { createAudit, updateAudit, getAuditsByUser, countAuditsByUser, getAuditById, deleteAudit } = require('../services/auditService');
const { fetchWebsite } = require('../services/websiteFetcher');
const { analyzeSeo } = require('../services/seoAnalyzer');
const { analyzeAeo } = require('../services/aeoAnalyzer');
const { analyzeGeo } = require('../services/geoAnalyzer');

/**
 * Helper to validate URL structure natively.
 */
const isValidUrl = (string) => {
  try {
    const parsed = new URL(string);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch (err) {
    return false;
  }
};

/**
 * POST /api/audits
 * Creates the audit document, then immediately runs the full SEO analysis
 * pipeline synchronously on the same request.
 *
 * Status flow:
 *   pending → analyzing → completed
 *                       ↘ failed  (on any error)
 */
const createNewAudit = async (req, res) => {
  const { url } = req.body;
  const userId = req.user.userId;

  // ── 1. Validate URL ─────────────────────────────────────────────────────
  if (!url || !isValidUrl(url)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid URL starting with http:// or https://'
    });
  }

  // ── 2. Create audit document (status: pending) ───────────────────────────
  let audit;
  try {
    audit = await createAudit({ userId, url, status: 'pending' });
  } catch (dbError) {
    throw new AppError('Server error while creating audit.', 500);
  }

  const auditId = audit._id;

  // ── 3. Transition → analyzing ────────────────────────────────────────────
  try {
    await updateAudit(auditId, { status: 'analyzing' });
  } catch (updateError) {
    console.error('[audit] Failed to set status to analyzing:', updateError.message);
    // Non-fatal — continue
  }

  // ── 4. Fetch website HTML ────────────────────────────────────────────────
  let fetchResult;
  try {
    fetchResult = await fetchWebsite(url);
  } catch (fetchError) {
    console.error(`[audit] Website fetch failed for ${url}:`, fetchError.message);
    await updateAudit(auditId, {
      status: 'failed',
      errorMessage: fetchError.message
    }).catch(() => {});
    return res.status(422).json({
      success: false,
      message: fetchError.message,
      data: { _id: auditId, status: 'failed' }
    });
  }

  // ── 5. Run SEO analysis ──────────────────────────────────────────────────
  let seoResult;
  try {
    seoResult = analyzeSeo(fetchResult.html, fetchResult.finalUrl);
  } catch (analyzeError) {
    console.error(`[audit] SEO analysis failed for ${url}:`, analyzeError.message);
    await updateAudit(auditId, {
      status: 'failed',
      errorMessage: 'SEO analysis failed: ' + analyzeError.message
    }).catch(() => {});
    return res.status(500).json({
      success: false,
      message: 'SEO analysis encountered an unexpected error.',
      data: { _id: auditId, status: 'failed' }
    });
  }

  // ── 5.5. Run AEO analysis ────────────────────────────────────────────────
  let aeoResult;
  try {
    aeoResult = analyzeAeo(fetchResult.html, fetchResult.finalUrl);
  } catch (aeoError) {
    console.error(`[audit] AEO analysis failed for ${url}:`, aeoError.message);
    await updateAudit(auditId, {
      status: 'failed',
      errorMessage: 'AEO analysis failed: ' + aeoError.message
    }).catch(() => {});
    return res.status(500).json({
      success: false,
      message: 'AEO analysis encountered an unexpected error.',
      data: { _id: auditId, status: 'failed' }
    });
  }

  // ── 5.6. Run GEO analysis ────────────────────────────────────────────────
  let geoResult;
  try {
    geoResult = analyzeGeo(fetchResult.html, fetchResult.finalUrl);
  } catch (geoError) {
    console.error(`[audit] GEO analysis failed for ${url}:`, geoError.message);
    await updateAudit(auditId, {
      status: 'failed',
      errorMessage: 'GEO analysis failed: ' + geoError.message
    }).catch(() => {});
    return res.status(500).json({
      success: false,
      message: 'GEO analysis encountered an unexpected error.',
      data: { _id: auditId, status: 'failed' }
    });
  }

  // ── 6. Build structured SEO checks (separate by severity) ───────────────
  const allIssues = seoResult.issues || [];
  const seoChecks = allIssues.map((issue) => ({
    title: issue.title,
    severity: issue.severity,
    explanation: issue.explanation,
    recommendation: issue.recommendation
  }));

  const seoIssues = allIssues
    .filter((i) => i.severity === 'Critical' || i.severity === 'Warning')
    .map((i) => ({
      issue: i.title,
      explanation: i.explanation,
      severity: i.severity,
      fix: i.recommendation
    }));

  // Derive prioritised recommendations from the issues
  const seoRecommendations = {
    high: allIssues
      .filter((i) => i.severity === 'Critical')
      .map((i) => ({ title: i.title, explanation: i.recommendation })),
    medium: allIssues
      .filter((i) => i.severity === 'Warning')
      .map((i) => ({ title: i.title, explanation: i.recommendation })),
    low: allIssues
      .filter((i) => i.severity === 'Passed')
      .map((i) => ({ title: i.title, explanation: i.recommendation }))
  };

  // ── 6.5. Build structured AEO checks ──────────────────────────────────────
  const allAeoIssues = aeoResult.issues || [];
  const aeoChecks = allAeoIssues.map((issue) => ({
    title: issue.title,
    severity: issue.severity,
    explanation: issue.explanation,
    recommendation: issue.recommendation
  }));

  const aeoIssues = allAeoIssues
    .filter((i) => i.severity === 'Critical' || i.severity === 'Warning')
    .map((i) => ({
      issue: i.title,
      explanation: i.explanation,
      severity: i.severity,
      fix: i.recommendation
    }));

  const aeoRecommendations = {
    high: allAeoIssues
      .filter((i) => i.severity === 'Critical')
      .map((i) => ({ title: i.title, explanation: i.recommendation })),
    medium: allAeoIssues
      .filter((i) => i.severity === 'Warning')
      .map((i) => ({ title: i.title, explanation: i.recommendation })),
    low: allAeoIssues
      .filter((i) => i.severity === 'Passed')
      .map((i) => ({ title: i.title, explanation: i.recommendation }))
  };

  // ── 6.8. Build structured GEO checks ──────────────────────────────────────
  const allGeoIssues = geoResult.issues || [];
  const geoChecks = allGeoIssues.map((issue) => ({
    title: issue.title,
    severity: issue.severity,
    explanation: issue.explanation,
    recommendation: issue.recommendation
  }));

  const geoIssues = allGeoIssues
    .filter((i) => i.severity === 'Critical' || i.severity === 'Warning')
    .map((i) => ({
      issue: i.title,
      explanation: i.explanation,
      severity: i.severity,
      fix: i.recommendation
    }));

  const geoRecommendations = {
    high: allGeoIssues
      .filter((i) => i.severity === 'Critical')
      .map((i) => ({ title: i.title, explanation: i.recommendation })),
    medium: allGeoIssues
      .filter((i) => i.severity === 'Warning')
      .map((i) => ({ title: i.title, explanation: i.recommendation })),
    low: allGeoIssues
      .filter((i) => i.severity === 'Passed')
      .map((i) => ({ title: i.title, explanation: i.recommendation }))
  };

  // ── 7. Persist results → completed ──────────────────────────────────────
  try {
    await updateAudit(auditId, {
      status: 'completed',
      seoScore: seoResult.seoScore,
      seoMetrics: seoResult.metrics,
      seoChecks,
      seoIssues,
      seoRecommendations,
      aeoScore: aeoResult.aeoScore,
      aeoMetrics: aeoResult.metrics,
      aeoChecks,
      aeoIssues,
      aeoRecommendations,
      geoScore: geoResult.geoScore,
      geoMetrics: geoResult.metrics,
      geoChecks,
      geoIssues,
      geoRecommendations,
      fetchedUrl: fetchResult.finalUrl
    });
  } catch (saveError) {
    await updateAudit(auditId, {
      status: 'failed',
      errorMessage: 'Failed to save analysis results.'
    }).catch(() => {});
    throw new AppError('Server error while saving audit results.', 500);
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[audit] Audit ${auditId} completed. SEO score: ${seoResult.seoScore}, AEO score: ${aeoResult.aeoScore}, GEO score: ${geoResult.geoScore}`);
  }

  // ── 8. Respond with the audit ID so the client can redirect ─────────────
  return res.status(201).json({
    success: true,
    message: 'Audit completed successfully',
    data: {
      _id: auditId,
      url,
      fetchedUrl: fetchResult.finalUrl,
      status: 'completed',
      seoScore: seoResult.seoScore,
      aeoScore: aeoResult.aeoScore,
      geoScore: geoResult.geoScore,
      createdAt: audit.createdAt
    }
  });
};

/**
 * GET /api/audits
 * Fetch all audits scoped exclusively to the logged-in user.
 */
const getUserAudits = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // ── Pagination params ─────────────────────────────────────────────────
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50); // max 50 per page
    const page  = Math.max(parseInt(req.query.page,  10) || 1, 1);
    const skip  = (page - 1) * limit;

    // Run count + fetch in parallel — one round-trip each, both use the userId index
    const [audits, total] = await Promise.all([
      getAuditsByUser(userId, skip, limit),
      countAuditsByUser(userId)
    ]);

    res.status(200).json({
      success: true,
      data: audits,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/audits/:id
 * Fetches a single audit and validates ownership - never exposes another user's audit.
 */
const getSingleAudit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const audit = await getAuditById(id);

    if (!audit) {
      throw new AppError('Audit not found.', 404);
    }

    // Strict ownership check — never leak another user's data
    if (audit.userId.toString() !== userId) {
      throw new AppError('Not authorized to access this audit.', 403);
    }

    res.status(200).json({
      success: true,
      data: audit
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/audits/:id
 * Deletes a single audit — only the owner can delete their own audit.
 */
const deleteAuditById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // First verify the audit exists and belongs to this user
    const audit = await getAuditById(id);

    if (!audit) {
      throw new AppError('Audit not found.', 404);
    }

    if (audit.userId.toString() !== userId) {
      throw new AppError('Not authorized to delete this audit.', 403);
    }

    const result = await deleteAudit(id);

    if (result.deletedCount === 0) {
      throw new AppError('Audit could not be deleted.', 404);
    }

    return res.status(200).json({ success: true, message: 'Audit deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createNewAudit,
  getUserAudits,
  getSingleAudit,
  deleteAuditById
};
