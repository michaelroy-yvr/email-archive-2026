const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');

// Start sync
// POST /api/sync/start?maxEmails=10&query=category:promotions
router.post(
	'/start',
	auth,
	adminOnly,
	syncController.startSync
);

// Get sync status
router.get(
	'/status',
	auth,
	adminOnly,
	syncController.getSyncStatus
);

module.exports = router;

