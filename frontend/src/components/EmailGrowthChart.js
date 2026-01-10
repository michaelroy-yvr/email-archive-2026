import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

function EmailGrowthChart({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="chart-container">
                <h3>📈 Email Growth (Last 30 Days)</h3>
                <div className="chart-empty">No data available</div>
            </div>
        );
    }

    // Format dates for display
    const formattedData = data.map(item => ({
        ...item,
        displayDate: new Date(item.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        })
    }));

    return (
        <div className="chart-container">
            <h3>📈 Email Growth (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={formattedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                        dataKey="displayDate"
                        tick={{ fontSize: 12 }}
                        interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #ccc',
                            borderRadius: '4px'
                        }}
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
    );
}

export default EmailGrowthChart;
