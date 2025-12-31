const db = require('../config/database');

/**
 * Get summary statistics for dashboard
 */
exports.getSummary = async (req, res, next) => {
    try {
        // Total emails
        const totalEmails = db.get('SELECT COUNT(*) as count FROM emails');

        // Total organizations
        const totalOrganizations = db.get('SELECT COUNT(*) as count FROM organizations');

        // Unassigned emails
        const unassignedEmails = db.get(`
            SELECT
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM emails), 2) as percentage
            FROM emails
            WHERE organization_id IS NULL
        `);

        // Total images
        const totalImages = db.get('SELECT COUNT(*) as count FROM images WHERE download_success = 1');

        // Date range
        const dateRange = db.get(`
            SELECT
                MIN(date_received) as earliest,
                MAX(date_received) as latest
            FROM emails
        `);

        // Average emails per day
        const averagePerDay = db.get(`
            SELECT
                ROUND(COUNT(*) * 1.0 /
                    (JULIANDAY(MAX(date_received)) - JULIANDAY(MIN(date_received)) + 1), 2) as average
            FROM emails
        `);

        res.json({
            totalEmails: totalEmails.count,
            totalOrganizations: totalOrganizations.count,
            unassignedEmails: unassignedEmails.count,
            unassignedPercentage: unassignedEmails.percentage || 0,
            totalImages: totalImages.count,
            dateRange: {
                earliest: dateRange.earliest,
                latest: dateRange.latest
            },
            averageEmailsPerDay: averagePerDay.average || 0
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get email growth statistics over time
 */
exports.getGrowthStats = async (req, res, next) => {
    try {
        const period = req.query.period || '30'; // days

        const growthData = db.all(`
            SELECT
                DATE(date_received) as date,
                COUNT(*) as count
            FROM emails
            WHERE date_received >= datetime('now', '-${period} days')
            GROUP BY DATE(date_received)
            ORDER BY date ASC
        `);

        res.json(growthData);
    } catch (error) {
        next(error);
    }
};

/**
 * Get email distribution by organization
 */
exports.getOrganizationDistribution = async (req, res, next) => {
    try {
        const distribution = db.all(`
            SELECT
                o.id as organizationId,
                o.name as organizationName,
                o.type as organizationType,
                COUNT(e.id) as count,
                ROUND(COUNT(e.id) * 100.0 / (SELECT COUNT(*) FROM emails), 2) as percentage
            FROM organizations o
            LEFT JOIN emails e ON o.id = e.organization_id
            GROUP BY o.id
            HAVING count > 0
            ORDER BY count DESC
        `);

        // Also include unassigned as a category
        const unassigned = db.get(`
            SELECT
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM emails), 2) as percentage
            FROM emails
            WHERE organization_id IS NULL
        `);

        if (unassigned.count > 0) {
            distribution.push({
                organizationId: null,
                organizationName: 'Unassigned',
                organizationType: null,
                count: unassigned.count,
                percentage: unassigned.percentage
            });
        }

        res.json(distribution);
    } catch (error) {
        next(error);
    }
};

/**
 * Get unassigned email count
 */
exports.getUnassignedCount = async (req, res, next) => {
    try {
        const result = db.get(`
            SELECT
                COUNT(*) as unassignedCount,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM emails), 2) as percentageOfTotal
            FROM emails
            WHERE organization_id IS NULL
        `);

        res.json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * Get storage analytics
 */
exports.getStorageAnalytics = async (req, res, next) => {
    try {
        // Overall storage stats
        const storageStats = db.get(`
            SELECT
                SUM(CASE WHEN download_success = 1 THEN file_size ELSE 0 END) as totalStorageBytes,
                COUNT(CASE WHEN download_success = 1 THEN 1 END) as downloadedImages,
                COUNT(CASE WHEN download_success = 0 THEN 1 END) as failedImages,
                ROUND(
                    COUNT(CASE WHEN download_success = 1 THEN 1 END) * 100.0 /
                    COUNT(*), 2
                ) as successRate
            FROM images
        `);

        // Storage by organization
        const storageByOrg = db.all(`
            SELECT
                o.id as organizationId,
                o.name as organizationName,
                SUM(i.file_size) as storageBytes,
                COUNT(i.id) as imageCount
            FROM organizations o
            LEFT JOIN emails e ON o.id = e.organization_id
            LEFT JOIN images i ON e.id = i.email_id AND i.download_success = 1
            GROUP BY o.id
            HAVING storageBytes > 0
            ORDER BY storageBytes DESC
        `);

        res.json({
            totalStorageBytes: storageStats.totalStorageBytes || 0,
            downloadedImages: storageStats.downloadedImages || 0,
            failedImages: storageStats.failedImages || 0,
            successRate: storageStats.successRate || 0,
            storageByOrganization: storageByOrg
        });
    } catch (error) {
        next(error);
    }
};
