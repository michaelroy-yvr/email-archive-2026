const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');

// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);

// Protected routes
router.get('/me', authMiddleware, userController.getCurrentUser);
router.post('/logout', authMiddleware, userController.logout);

// Admin routes
router.get('/all', authMiddleware, userController.getAllUsers);
router.put('/:id/admin', authMiddleware, userController.toggleAdmin);
router.delete('/:id', authMiddleware, userController.deleteUser);

module.exports = router;
