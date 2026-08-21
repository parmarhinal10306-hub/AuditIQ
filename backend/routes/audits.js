const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { auditCreationLimiter } = require('../middleware/rateLimiter');
const { validateAuditCreation } = require('../middleware/validationMiddleware');
const { createNewAudit, getUserAudits, getSingleAudit, deleteAuditById } = require('../controllers/auditController');

// Secure all grouped routes via authentication extraction middleware
router.use(protect);

router.route('/')
  .post(auditCreationLimiter, validateAuditCreation, createNewAudit)  // strict 10/hour limit on audit creation only
  .get(getUserAudits);

router.route('/:id')
  .get(getSingleAudit)
  .delete(deleteAuditById);

module.exports = router;
