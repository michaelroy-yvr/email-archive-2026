const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Start Gmail OAuth flow
router.get('/gmail/start', authController.startGmailAuth);

// OAuth callback
router.get('/gmail/callback', authController.gmailCallback);

// Check authentication status
router.get('/status', authController.getAuthStatus);

module.exports = router;
