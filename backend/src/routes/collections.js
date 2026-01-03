const express = require('express');
const router = express.Router();
const collectionsController = require('../controllers/collectionsController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.get('/', authMiddleware, collectionsController.getUserCollections);
router.post('/', authMiddleware, collectionsController.createCollection);
router.put('/:id', authMiddleware, collectionsController.updateCollection);
router.delete('/:id', authMiddleware, collectionsController.deleteCollection);

router.get('/:id/emails', authMiddleware, collectionsController.getCollectionEmails);
router.post('/:id/emails', authMiddleware, collectionsController.addEmailToCollection);
router.delete('/:id/emails/:emailId', authMiddleware, collectionsController.removeEmailFromCollection);

module.exports = router;
