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

/**
 * Get filtered analytics data
 * Supports filters: organizationIds[], organizationType, startDate, endDate
 */
exports.getFilteredAnalytics = async (req, res, next) => {
    try {
        const {
            organizationIds, // comma-separated or array
            organizationType,
            startDate,
            endDate
        } = req.query;

        // Build WHERE clause based on filters
        let whereClause = [];
        let params = [];

        // Organization IDs filter (multi-select)
        if (organizationIds) {
            const ids = Array.isArray(organizationIds)
                ? organizationIds
                : organizationIds.split(',').map(id => id.trim());

            if (ids.length > 0) {
                const placeholders = ids.map(() => '?').join(',');
                whereClause.push(`e.organization_id IN (${placeholders})`);
                params.push(...ids);
            }
        }

        // Organization type filter
        if (organizationType) {
            whereClause.push('o.type = ?');
            params.push(organizationType);
        }

        // Date range filters
        if (startDate) {
            whereClause.push('e.date_received >= ?');
            params.push(startDate);
        }

        if (endDate) {
            whereClause.push('e.date_received <= ?');
            params.push(endDate);
        }

        const where = whereClause.length > 0
            ? 'WHERE ' + whereClause.join(' AND ')
            : '';

        // 1. Total message count
        const totalCount = db.get(`
            SELECT COUNT(*) as count
            FROM emails e
            LEFT JOIN organizations o ON e.organization_id = o.id
            ${where}
        `, params);

        // 2. Count by sender name (grouped by name AND address)
        const bySender = db.all(`
            SELECT
                COALESCE(NULLIF(e.from_name, ''), e.from_address) as sender_name,
                e.from_address,
                o.name as organization_name,
                COUNT(*) as count
            FROM emails e
            LEFT JOIN organizations o ON e.organization_id = o.id
            ${where}
            GROUP BY sender_name, e.from_address
            ORDER BY count DESC
            LIMIT 20
        `, params);

        // 3. Count by year
        const byYear = db.all(`
            SELECT
                strftime('%Y', e.date_received) as year,
                COUNT(*) as count
            FROM emails e
            LEFT JOIN organizations o ON e.organization_id = o.id
            ${where}
            GROUP BY year
            ORDER BY year ASC
        `, params);

        // 4. Count by month (last 12 months or filtered range)
        const byMonth = db.all(`
            SELECT
                strftime('%Y-%m', e.date_received) as month,
                COUNT(*) as count
            FROM emails e
            LEFT JOIN organizations o ON e.organization_id = o.id
            ${where}
            GROUP BY month
            ORDER BY month ASC
        `, params);

        // 5. Count by day (last 30 days or filtered range)
        const byDay = db.all(`
            SELECT
                DATE(e.date_received) as day,
                COUNT(*) as count
            FROM emails e
            LEFT JOIN organizations o ON e.organization_id = o.id
            ${where}
            GROUP BY day
            ORDER BY day DESC
            LIMIT 30
        `, params);

        // Reverse to show oldest first
        byDay.reverse();

        // 6. Count by organization (only if multiple orgs selected or no org filter)
        const byOrganization = db.all(`
            SELECT
                o.id,
                o.name,
                o.type,
                COUNT(e.id) as count
            FROM emails e
            LEFT JOIN organizations o ON e.organization_id = o.id
            ${where}
            GROUP BY o.id, o.name, o.type
            HAVING o.id IS NOT NULL
            ORDER BY count DESC
            LIMIT 20
        `, params);

        // 7. Date range of filtered results
        const dateRange = db.get(`
            SELECT
                MIN(e.date_received) as first_email,
                MAX(e.date_received) as last_email
            FROM emails e
            LEFT JOIN organizations o ON e.organization_id = o.id
            ${where}
        `, params);

        res.json({
            totalCount: totalCount.count,
            bySender,
            byYear,
            byMonth,
            byDay,
            byOrganization,
            dateRange,
            appliedFilters: {
                organizationIds: organizationIds || null,
                organizationType: organizationType || null,
                startDate: startDate || null,
                endDate: endDate || null
            }
        });

    } catch (error) {
        next(error);
    }
};
