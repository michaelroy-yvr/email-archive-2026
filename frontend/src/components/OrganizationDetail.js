import React, { useState, useEffect } from 'react';
import { organizationsAPI } from '../services/api';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import './OrganizationDetail.css';

function OrganizationDetail({ organizationId, onClose, onViewEmails }) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (organizationId) {
            fetchStats();
        }
    }, [organizationId]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await organizationsAPI.getStats(organizationId);
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching organization stats:', error);
            setError('Failed to load organization statistics');
        } finally {
            setLoading(false);
        }
    };

    const getTypeEmoji = (type) => {
        const emojis = {
            political: '🏛️',
            nonprofit: '🤝',
            charity: '❤️',
            commercial: '💼',
            labour_union: '✊'
        };
        return emojis[type] || '📧';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatMonth = (monthString) => {
        if (!monthString) return '';
        const [year, month] = monthString.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    };

    if (loading) {
        return (
            <div className="org-detail-modal">
                <div className="org-detail-content">
                    <div className="loading">Loading organization details...</div>
                </div>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="org-detail-modal">
                <div className="org-detail-content">
                    <div className="error">{error || 'Organization not found'}</div>
                    <button onClick={onClose} className="close-btn">Close</button>
                </div>
            </div>
        );
    }

    const { organization, topSenders, timeline, dateRange } = stats;

    return (
        <div className="org-detail-modal" onClick={onClose}>
            <div className="org-detail-content" onClick={(e) => e.stopPropagation()}>
                <button className="close-modal-btn" onClick={onClose}>×</button>

                {/* Organization Header */}
                <div className="org-detail-header">
                    <div className="org-detail-title">
                        <span className="org-emoji-large">{getTypeEmoji(organization.type)}</span>
                        <div>
                            <h2>{organization.name}</h2>
                            <span className="org-type-label">{organization.type}</span>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="org-quick-stats">
                    <div className="stat-card">
                        <div className="stat-value">{organization.email_count.toLocaleString()}</div>
                        <div className="stat-label">Total Emails</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{topSenders.length}</div>
                        <div className="stat-label">Unique Senders</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{formatDate(dateRange.first_email)}</div>
                        <div className="stat-label">First Email</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{formatDate(dateRange.last_email)}</div>
                        <div className="stat-label">Most Recent</div>
                    </div>
                </div>

                {/* Organization Details */}
                {(organization.email_domain || organization.notes) && (
                    <div className="org-detail-info">
                        {organization.email_domain && (
                            <div className="info-row">
                                <strong>Email Domain:</strong>
                                <span>{organization.email_domain}</span>
                            </div>
                        )}
                        {organization.notes && (
                            <div className="info-row">
                                <strong>Notes:</strong>
                                <span>{organization.notes}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Email Timeline */}
                {timeline && timeline.length > 0 && (
                    <div className="org-chart-section">
                        <h3>📈 Email Timeline (Last 12 Months)</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart
                                data={timeline}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                <XAxis
                                    dataKey="month"
                                    tickFormatter={formatMonth}
                                    tick={{ fontSize: 11 }}
                                />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                    labelFormatter={formatMonth}
                                    formatter={(value) => [value, 'Emails']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#667eea"
                                    strokeWidth={2}
                                    dot={{ fill: '#667eea', r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Top Senders */}
                {topSenders && topSenders.length > 0 && (
                    <div className="org-chart-section">
                        <h3>👥 Top Senders</h3>
                        <ResponsiveContainer width="100%" height={Math.min(topSenders.length * 40 + 60, 400)}>
                            <BarChart
                                data={topSenders}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                <XAxis type="number" tick={{ fontSize: 12 }} />
                                <YAxis
                                    dataKey="sender_name"
                                    type="category"
                                    width={200}
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
                                                    <p>Emails: {data.count}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="count" fill="#667eea" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Sender Names Summary */}
                {topSenders && topSenders.length > 0 && (
                    <div className="org-chart-section">
                        <h3>📋 Sender Names Summary</h3>
                        <div className="sender-names-list">
                            {topSenders.map((sender, index) => (
                                <div key={index} className="sender-name-item">
                                    <div className="sender-name-info">
                                        <span className="sender-name">{sender.sender_name}</span>
                                        <span className="sender-email">{sender.from_address}</span>
                                    </div>
                                    <span className="sender-count">{sender.count} emails</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="org-detail-actions">
                    <button
                        className="view-emails-btn"
                        onClick={() => {
                            onViewEmails(organization.id);
                            onClose();
                        }}
                    >
                        View All Emails from {organization.name}
                    </button>
                    <button onClick={onClose} className="close-btn">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default OrganizationDetail;
