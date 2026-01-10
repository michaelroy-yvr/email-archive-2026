import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

function TopSenders({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="chart-container">
                <h3>👥 Top 10 Senders</h3>
                <div className="chart-empty">No data available</div>
            </div>
        );
    }

    // Format data for chart - use email address as primary identifier
    const chartData = data.map(sender => ({
        name: sender.from_address,
        count: sender.count,
        nameCount: sender.name_count || 1
    }));

    return (
        <div className="chart-container">
            <h3>👥 Top 10 Senders</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                        dataKey="name"
                        type="category"
                        width={150}
                        tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                        content={({ payload }) => {
                            if (payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                    <div className="custom-tooltip">
                                        <p><strong>{data.name}</strong></p>
                                        <p>Emails: {data.count}</p>
                                        {data.nameCount > 1 && (
                                            <p style={{ fontSize: '0.85em', color: '#999' }}>
                                                {data.nameCount} sender names
                                            </p>
                                        )}
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
    );
}

export default TopSenders;
