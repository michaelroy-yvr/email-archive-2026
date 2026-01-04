const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const analyticsController = require('../controllers/analyticsController');
const { authMiddleware } = require('../middleware/auth');

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
router.get('/analytics/filtered', analyticsController.getFilteredAnalytics);

// Update email category
router.patch('/:id/category', emailController.updateCategory);

// Remove tag from email (admin only) - MUST be before /:id route
router.delete('/:id/tag', authMiddleware, emailController.removeTag);

// Get email HTML content for iframe - MUST be before /:id route
router.get('/:id/html', emailController.getHtml);

// Get single email by ID - Keep this last among /:id routes
router.get('/:id', emailController.getById);

module.exports = router;
