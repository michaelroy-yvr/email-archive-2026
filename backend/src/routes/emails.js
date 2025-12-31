const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const analyticsController = require('../controllers/analyticsController');

// List emails with pagination and filters
// GET /api/emails?page=1&limit=50&from=trump&search=patriot
router.get('/', emailController.list);

// Get statistics
router.get('/stats', emailController.getStats);

// Get unique senders
router.get('/senders', emailController.getSenders);

// Analytics endpoints
router.get('/analytics/summary', analyticsController.getSummary);
router.get('/analytics/growth', analyticsController.getGrowthStats);
router.get('/analytics/by-organization', analyticsController.getOrganizationDistribution);
router.get('/analytics/unassigned', analyticsController.getUnassignedCount);
router.get('/analytics/storage', analyticsController.getStorageAnalytics);

// Get single email by ID
router.get('/:id', emailController.getById);

// Get email HTML content for iframe
router.get('/:id/html', emailController.getHtml);

module.exports = router;
