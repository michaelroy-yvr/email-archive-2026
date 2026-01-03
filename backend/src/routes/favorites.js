const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.post('/:emailId/toggle', authMiddleware, favoritesController.toggleFavorite);
router.get('/my-favorites', authMiddleware, favoritesController.getUserFavorites);
router.get('/top', favoritesController.getTopFavorites); // Public - no auth required
router.get('/check', authMiddleware, favoritesController.checkFavorites);

module.exports = router;
