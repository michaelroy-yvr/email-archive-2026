const { authMiddleware } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');

// Start sync
// POST /api/sync/start?maxEmails=10&query=category:promotions
router.post(
	'/start',
	authMiddleware,
	adminOnly,
	syncController.startSync
);

// Get sync status
router.get(
	'/status',
	authMiddleware,
	adminOnly,
	syncController.getSyncStatus
);

module.exports = router;

