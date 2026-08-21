/**
 * controllers/dashboardController.js
 *
 * Provides aggregated dashboard data scoped strictly to the logged-in user.
 * Uses the official MongoDB driver only — no Mongoose.
 * Optimized: uses a single $facet aggregation for overview to avoid multiple
 * round-trips, and projects only required fields for recent-audits.
 *
 * Routes:
 *   GET /api/dashboard/overview       → totals, averages, issue counts
 *   GET /api/dashboard/recent-audits  → last 10 completed audits + top recommendations
 */

'use strict';

const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');

const getCollection = () => getDB().collection('audits');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/overview
// Single aggregation pipeline with $facet to avoid multiple round-trips.
// ─────────────────────────────────────────────────────────────────────────────
const getOverview = async (req, res, next) => {
  const userId = req.user.userId;

  try {
    const collection = getCollection();
    const queryId = new ObjectId(userId);

    // One aggregation call using $facet for totals + completed stats
    const [result] = await collection.aggregate([
      { $match: { userId: queryId } },
      {
        $facet: {
          // Total documents for this user
          totalCount: [{ $count: 'n' }],

          // Completed audits: only project the score and check fields we need
          completed: [
            { $match: { status: 'completed' } },
            {
              $project: {
                seoScore: 1,
                aeoScore: 1,
                geoScore: 1,
                seoIssues: 1,
                aeoIssues: 1,
                geoIssues: 1,
                seoChecks: 1,
                aeoChecks: 1,
                geoChecks: 1
              }
            }
          ]
        }
      }
    ]).toArray();

    const totalAudits    = result.totalCount[0]?.n ?? 0;
    const completedAudits = result.completed || [];
    const count           = completedAudits.length;

    // Averages — fall back to 0 when no audits exist
    const avg = (field) => {
      if (count === 0) return 0;
      const sum = completedAudits.reduce((acc, a) => acc + (a[field] || 0), 0);
      return Math.round(sum / count);
    };

    // Count issues across all completed audits
    let criticalCount = 0;
    let warningCount  = 0;
    let passedCount   = 0;

    for (const audit of completedAudits) {
      const allIssues = [
        ...(audit.seoIssues || []),
        ...(audit.aeoIssues || []),
        ...(audit.geoIssues || []),
      ];
      for (const issue of allIssues) {
        const sev = (issue.severity || '').toLowerCase();
        if (sev === 'critical')     criticalCount++;
        else if (sev === 'warning') warningCount++;
      }

      const allChecks = [
        ...(audit.seoChecks || []),
        ...(audit.aeoChecks || []),
        ...(audit.geoChecks || []),
      ];
      for (const check of allChecks) {
        if ((check.severity || '').toLowerCase() === 'passed') passedCount++;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        totalAudits,
        completedAudits: count,
        avgSeoScore: avg('seoScore'),
        avgAeoScore: avg('aeoScore'),
        avgGeoScore: avg('geoScore'),
        criticalCount,
        warningCount,
        passedCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/recent-audits
// Projects only required summary fields — no heavy check/issue arrays.
// ─────────────────────────────────────────────────────────────────────────────
const getRecentAudits = async (req, res, next) => {
  const userId = req.user.userId;

  try {
    const collection = getCollection();
    const queryId = new ObjectId(userId);

    // Last 10 audits — lightweight projection, no heavy seo/aeo/geoChecks arrays
    const audits = await collection
      .find({ userId: queryId })
      .sort({ createdAt: -1 })
      .limit(10)
      .project({
        url: 1,
        fetchedUrl: 1,
        status: 1,
        seoScore: 1,
        aeoScore: 1,
        geoScore: 1,
        createdAt: 1,
        errorMessage: 1,
        // Recommendations are compact objects (title + explanation only), safe to include
        seoRecommendations: 1,
        aeoRecommendations: 1,
        geoRecommendations: 1,
      })
      .toArray();

    // Build a flat recommendations summary from the most recent completed audit
    const latestCompleted = audits.find((a) => a.status === 'completed');
    let recommendationsSummary = { high: [], medium: [], low: [] };

    if (latestCompleted) {
      const merge = (recs) => {
        if (!recs) return;
        recommendationsSummary.high   = [...recommendationsSummary.high,   ...(recs.high   || [])];
        recommendationsSummary.medium = [...recommendationsSummary.medium, ...(recs.medium || [])];
        recommendationsSummary.low    = [...recommendationsSummary.low,    ...(recs.low    || [])];
      };
      merge(latestCompleted.seoRecommendations);
      merge(latestCompleted.aeoRecommendations);
      merge(latestCompleted.geoRecommendations);

      // Cap each tier to 5 items
      recommendationsSummary.high   = recommendationsSummary.high.slice(0, 5);
      recommendationsSummary.medium = recommendationsSummary.medium.slice(0, 5);
      recommendationsSummary.low    = recommendationsSummary.low.slice(0, 5);
    }

    return res.status(200).json({
      success: true,
      data: {
        audits,
        recommendationsSummary,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getOverview, getRecentAudits };
