/**
 * GET /api/health
 * Returns the API status.
 */
const healthCheck = (req, res) => {
  res.status(200).json({
    success: true,
    message: "SEO/AEO/GEO Audit API is running"
  });
};

module.exports = { healthCheck };
