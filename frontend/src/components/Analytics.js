import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import './Analytics.css';

function Analytics({ organizations, onApplyFiltersToEmails }) {
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState(null);
    const [filters, setFilters] = useState({
        organizationIds: [],
        organizationType: '',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const params = {};

            if (filters.organizationIds.length > 0) {
                params.organizationIds = filters.organizationIds.join(',');
            }
            if (filters.organizationType) {
                params.organizationType = filters.organizationType;
            }
            if (filters.startDate) {
                params.startDate = filters.startDate;
            }
            if (filters.endDate) {
                params.endDate = filters.endDate;
            }

            const response = await analyticsAPI.getFilteredAnalytics(params);
            setAnalytics(response.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleOrganizationToggle = (orgId) => {
        setFilters(prev => {
            const isSelected = prev.organizationIds.includes(orgId);
            return {
                ...prev,
                organizationIds: isSelected
                    ? prev.organizationIds.filter(id => id !== orgId)
                    : [...prev.organizationIds, orgId]
            };
        });
    };

    const handleApplyFilters = () => {
        fetchAnalytics();
    };

    const handleClearFilters = () => {
        setFilters({
            organizationIds: [],
            organizationType: '',
            startDate: '',
            endDate: ''
        });
        // Fetch all data
        setTimeout(() => fetchAnalytics(), 0);
    };

    const handleViewInEmails = () => {
        // Convert filters to emails tab format
        const emailFilters = {
            organizationId: filters.organizationIds.length === 1 ? filters.organizationIds[0] : '',
            organizationType: filters.organizationType,
            startDate: filters.startDate,
            endDate: filters.endDate
        };
        onApplyFiltersToEmails(emailFilters);
    };

    const formatMonth = (monthString) => {
        if (!monthString) return '';
        const [year, month] = monthString.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (loading && !analytics) {
        return <div className="loading">Loading analytics...</div>;
    }

    return (
        <div className="analytics-container">
            {/* Filter Controls */}
            <div className="analytics-filters">
                {/* Organization Multi-Select */}
                <div className="filter-group">
                    <label>Organizations ({filters.organizationIds.length > 0 ? filters.organizationIds.length : 'All'})</label>
                    <select
                        multiple
                        value={filters.organizationIds.map(id => id.toString())}
                        onChange={(e) => {
                            const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                            setFilters(prev => ({ ...prev, organizationIds: selected }));
                        }}
                        size="1"
                        style={{ height: '38px' }}
                    >
                        {organizations.map((org) => (
                            <option key={org.id} value={org.id}>
                                {org.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Organization Type */}
                <div className="filter-group">
                    <label>Organization Type</label>
                    <select
                        value={filters.organizationType}
                        onChange={(e) => handleFilterChange('organizationType', e.target.value)}
                    >
                        <option value="">All Types</option>
                        <option value="political">Political</option>
                        <option value="nonprofit">Nonprofit</option>
                        <option value="charity">Charity</option>
                        <option value="commercial">Commercial</option>
                        <option value="labour_union">Labour Union</option>
                    </select>
                </div>

                {/* Date Range */}
                <div className="filter-group">
                    <label>Date Range</label>
                    <div className="date-range">
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            placeholder="Start Date"
                        />
                        <span>to</span>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            placeholder="End Date"
                        />
                    </div>
                </div>

                {/* Filter Actions */}
                <div className="filter-actions">
                    <button onClick={handleApplyFilters} className="apply-btn">
                        Apply Filters
                    </button>
                    <button onClick={handleClearFilters} className="clear-btn">
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Analytics Results */}
            {analytics && (
                <div className="analytics-results">
                    {/* Summary Card */}
                    <div className="analytics-summary">
                        <div className="summary-card">
                            <div className="summary-value">{analytics.totalCount.toLocaleString()}</div>
                            <div className="summary-label">Total Messages</div>
                        </div>
                        {analytics.dateRange.first_email && (
                            <>
                                <div className="summary-card">
                                    <div className="summary-value">
                                        {new Date(analytics.dateRange.first_email).toLocaleDateString()}
                                    </div>
                                    <div className="summary-label">First Email</div>
                                </div>
                                <div className="summary-card">
                                    <div className="summary-value">
                                        {new Date(analytics.dateRange.last_email).toLocaleDateString()}
                                    </div>
                                    <div className="summary-label">Last Email</div>
                                </div>
                            </>
                        )}
                        <div className="summary-card action-card">
                            <button onClick={handleViewInEmails} className="view-emails-btn">
                                View These Emails
                            </button>
                        </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="charts-grid">
                        {/* Count by Year - Only show if spans multiple years */}
                        {analytics.byYear.length > 1 && (
                            <div className="chart-card">
                                <h3>📊 Emails by Year</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={analytics.byYear}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                        <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#667eea" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Count by Month - Only show if spans multiple months */}
                        {analytics.byMonth.length > 1 && (
                            <div className="chart-card">
                                <h3>📈 Emails by Month</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={analytics.byMonth}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                        <XAxis
                                            dataKey="month"
                                            tickFormatter={formatMonth}
                                            tick={{ fontSize: 11 }}
                                        />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip labelFormatter={formatMonth} />
                                        <Line
                                            type="monotone"
                                            dataKey="count"
                                            stroke="#667eea"
                                            strokeWidth={2}
                                            dot={{ fill: '#667eea', r: 4 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Count by Day - Bar Chart */}
                        {analytics.byDay.length > 0 && (
                            <div className="chart-card full-width">
                                <h3>📅 Emails by Day (Last 30 Days)</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={analytics.byDay}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                        <XAxis
                                            dataKey="day"
                                            tickFormatter={formatDate}
                                            tick={{ fontSize: 10 }}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString()} />
                                        <Bar dataKey="count" fill="#48bb78" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Count by Organization */}
                        {analytics.byOrganization.length > 0 && (
                            <div className="chart-card full-width">
                                <h3>🏢 Emails by Organization (Top 20)</h3>
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart
                                        data={analytics.byOrganization}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                        <XAxis type="number" tick={{ fontSize: 12 }} />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={200}
                                            tick={{ fontSize: 11 }}
                                        />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#764ba2" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Count by Sender */}
                        {analytics.bySender.length > 0 && (
                            <div className="chart-card full-width">
                                <h3>👥 Emails by Sender (Top 20)</h3>
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart
                                        data={analytics.bySender}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                        <XAxis type="number" tick={{ fontSize: 12 }} />
                                        <YAxis
                                            dataKey="sender_name"
                                            type="category"
                                            width={220}
                                            tick={{ fontSize: 11 }}
                                        />
                                        <Tooltip
                                            content={({ payload }) => {
                                                if (payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="custom-tooltip">
                                                            <p><strong>{data.sender_name}</strong></p>
                                                            <p style={{ fontSize: '0.85em', color: '#666' }}>{data.from_address}</p>
                                                            {data.organization_name && (
                                                                <p style={{ fontSize: '0.85em', color: '#667eea' }}>
                                                                    {data.organization_name}
                                                                </p>
                                                            )}
                                                            <p>Emails: {data.count}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="count" fill="#ed8936" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Analytics;
