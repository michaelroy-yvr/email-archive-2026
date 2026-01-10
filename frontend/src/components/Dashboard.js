import React, { useState, useEffect } from 'react';
import { analyticsAPI, emailsAPI } from '../services/api';
import OverviewCards from './OverviewCards';
import EmailGrowthChart from './EmailGrowthChart';
import OrganizationDistribution from './OrganizationDistribution';
import TopSenders from './TopSenders';
import './Dashboard.css';

function Dashboard() {
    const [data, setData] = useState({
        summary: null,
        growth: null,
        distribution: null,
        storage: null,
        topSenders: null
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Fetch all analytics data in parallel
            const [summary, growth, distribution, storage, stats] = await Promise.all([
                analyticsAPI.getSummary(),
                analyticsAPI.getGrowthStats({ period: 30 }),
                analyticsAPI.getOrganizationDistribution(),
                analyticsAPI.getStorageAnalytics(),
                emailsAPI.getStats()
            ]);

            setData({
                summary: summary.data,
                growth: growth.data,
                distribution: distribution.data,
                storage: storage.data,
                topSenders: stats.data.topSenders
            });
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-container">
                <div className="dashboard-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-container">
                <div className="dashboard-error">
                    <p>{error}</p>
                    <button onClick={fetchAllData} className="retry-button">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h2>📊 Dashboard</h2>
                <button onClick={fetchAllData} className="refresh-button">
                    🔄 Refresh
                </button>
            </div>

            <OverviewCards data={data.summary} />

            <div className="charts-grid">
                <EmailGrowthChart data={data.growth} />
                <OrganizationDistribution data={data.distribution} />
            </div>

            <div className="charts-grid">
                <TopSenders data={data.topSenders} />
                <div className="chart-container">
                    <h3>💾 Storage Metrics</h3>
                    {data.storage && (
                        <div className="storage-metrics">
                            <div className="storage-stat">
                                <span className="storage-label">Total Storage:</span>
                                <span className="storage-value">
                                    {(data.storage.totalStorageBytes / (1024 * 1024)).toFixed(2)} MB
                                </span>
                            </div>
                            <div className="storage-stat">
                                <span className="storage-label">Downloaded Images:</span>
                                <span className="storage-value">{data.storage.downloadedImages}</span>
                            </div>
                            <div className="storage-stat">
                                <span className="storage-label">Failed Images:</span>
                                <span className="storage-value">{data.storage.failedImages}</span>
                            </div>
                            <div className="storage-stat">
                                <span className="storage-label">Success Rate:</span>
                                <span className="storage-value">{data.storage.successRate}%</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
