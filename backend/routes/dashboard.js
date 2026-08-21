const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getOverview, getRecentAudits } = require('../controllers/dashboardController');

router.use(protect);

router.get('/overview',      getOverview);
router.get('/recent-audits', getRecentAudits);

module.exports = router;
