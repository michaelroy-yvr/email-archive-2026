const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');

// Start sync
// POST /api/sync/start?maxEmails=10&query=category:promotions
router.post('/start', syncController.startSync);

// Get sync status
router.get('/status', syncController.getSyncStatus);

module.exports = router;
