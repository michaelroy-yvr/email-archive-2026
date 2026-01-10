import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle token expiration
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid - clear it
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
        }
        return Promise.reject(error);
    }
);

export const emailsAPI = {
    // Get list of emails with pagination and filters
    // params: { page, limit, from, search, startDate, endDate, organizationType, organizationId }
    getEmails: (params = {}) => api.get('/emails', { params }),

    // Get single email by ID
    getEmail: (id) => api.get(`/emails/${id}`),

    // Get email HTML content
    getEmailHtml: (id) => `${API_URL}/emails/${id}/html`,

    // Get unique senders
    getSenders: () => api.get('/emails/senders'),

    // Get stats
    getStats: () => api.get('/emails/stats'),

    // Update email category
    updateCategory: (id, category) => api.patch(`/emails/${id}/category`, { category }),

    // Toggle tag on email (admin only)
    toggleTag: (id, tag) => api.post(`/emails/${id}/tag/toggle`, { tag }),

    // Remove tag from email (admin only)
    removeTag: (id, tag) => api.delete(`/emails/${id}/tag`, { data: { tag } }),

    // Delete email (admin only)
    deleteEmail: (id) => api.delete(`/emails/${id}`)
};

export const analyticsAPI = {
    // Get summary statistics
    getSummary: () => api.get('/emails/analytics/summary'),

    // Get email growth stats
    getGrowthStats: (params = {}) => api.get('/emails/analytics/growth', { params }),

    // Get organization distribution
    getOrganizationDistribution: () => api.get('/emails/analytics/by-organization'),

    // Get unassigned count
    getUnassignedCount: () => api.get('/emails/analytics/unassigned'),

    // Get storage analytics
    getStorageAnalytics: () => api.get('/emails/analytics/storage'),

    // Get filtered analytics
    // params: { organizationIds, organizationType, startDate, endDate }
    getFilteredAnalytics: (params = {}) => api.get('/emails/analytics/filtered', { params })
};

export const syncAPI = {
    // Start sync
    startSync: (params = {}) => api.post('/sync/start', {}, { params }),

    // Get sync status
    getStatus: () => api.get('/sync/status')
};

export const authAPI = {
    // Get auth status
    getStatus: () => api.get('/auth/status'),

    // Get Gmail auth URL
    getAuthUrl: () => api.get('/auth/gmail/start')
};

export const organizationsAPI = {
    // Get all organizations
    getAll: () => api.get('/organizations'),

    // Get organization statistics and insights
    getStats: (id) => api.get(`/organizations/${id}/stats`),

    // Create new organization
    create: (data) => api.post('/organizations', data),

    // Update organization
    update: (id, data) => api.put(`/organizations/${id}`, data),

    // Delete organization
    delete: (id) => api.delete(`/organizations/${id}`),

    // Assign email to organization
    assignEmail: (emailId, organizationId) =>
        api.put(`/organizations/emails/${emailId}/organization`, { organizationId }),

    // Bulk assign all emails from a sender to an organization
    bulkAssignBySender: (organizationId, senderAddress) =>
        api.post('/organizations/bulk-assign', { organizationId, senderAddress })
};

export const usersAPI = {
    // Register new user
    register: (data) => api.post('/users/register', data),

    // Login
    login: (data) => api.post('/users/login', data),

    // Get current user
    getCurrentUser: () => api.get('/users/me'),

    // Logout
    logout: () => api.post('/users/logout')
};

export const favoritesAPI = {
    // Toggle favorite
    toggleFavorite: (emailId) => api.post(`/favorites/${emailId}/toggle`),

    // Get user's favorites
    getMyFavorites: () => api.get('/favorites/my-favorites'),

    // Get top 10 favorites (public)
    getTopFavorites: () => api.get('/favorites/top'),

    // Check if emails are favorited
    checkFavorites: (emailIds) => api.get('/favorites/check', { params: { emailIds: emailIds.join(',') } })
};

export const collectionsAPI = {
    // Get user's collections
    getCollections: () => api.get('/collections'),

    // Create collection
    createCollection: (data) => api.post('/collections', data),

    // Update collection
    updateCollection: (id, data) => api.put(`/collections/${id}`, data),

    // Delete collection
    deleteCollection: (id) => api.delete(`/collections/${id}`),

    // Get emails in collection
    getCollectionEmails: (id) => api.get(`/collections/${id}/emails`),

    // Add email to collection
    addEmailToCollection: (collectionId, emailId) => api.post(`/collections/${collectionId}/emails`, { emailId }),

    // Remove email from collection
    removeEmailFromCollection: (collectionId, emailId) => api.delete(`/collections/${collectionId}/emails/${emailId}`)
};

export default api;
