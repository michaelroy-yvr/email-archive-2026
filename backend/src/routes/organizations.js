const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');

// List all organizations
router.get('/', organizationController.list);

// Get organization statistics
router.get('/:id/stats', organizationController.getStats);

// Create a new organization
router.post('/', organizationController.create);

// Update an organization
router.put('/:id', organizationController.update);

// Delete an organization
router.delete('/:id', organizationController.delete);

// Assign email to organization
router.put('/emails/:emailId/organization', organizationController.assignEmail);

// Bulk assign emails by sender
router.post('/bulk-assign', organizationController.bulkAssignBySender);

module.exports = router;
