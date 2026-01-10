import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

function OrganizationDistribution({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="chart-container">
                <h3>🥧 Organization Distribution</h3>
                <div className="chart-empty">No data available</div>
            </div>
        );
    }

    // Color palette for different organizations
    const COLORS = {
        nonprofit: '#48bb78',
        charity: '#ed8936',
        political: '#667eea',
        commercial: '#9f7aea',
        labour_union: '#f56565',
        null: '#a0aec0' // Unassigned
    };

    // Prepare data for pie chart
    const chartData = data.map(item => ({
        name: item.organizationName,
        value: item.count,
        percentage: item.percentage,
        type: item.organizationType
    }));

    // Custom label to show percentage
    const renderLabel = (entry) => {
        return `${entry.percentage}%`;
    };

    return (
        <div className="chart-container">
            <h3>🥧 Organization Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderLabel}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {chartData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={COLORS[entry.type] || COLORS.null}
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        content={({ payload }) => {
                            if (payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                    <div className="custom-tooltip">
                                        <p><strong>{data.name}</strong></p>
                                        <p>Emails: {data.value.toLocaleString()}</p>
                                        <p>Percentage: {data.percentage}%</p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export default OrganizationDistribution;
