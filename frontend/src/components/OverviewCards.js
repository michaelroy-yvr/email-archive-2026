import React from 'react';

function OverviewCards({ data }) {
    if (!data) {
        return null;
    }

    const cards = [
        {
            title: 'Total Emails',
            value: data.totalEmails?.toLocaleString() || '0',
            icon: '📧',
            color: '#667eea'
        },
        {
            title: 'Organizations',
            value: data.totalOrganizations?.toLocaleString() || '0',
            icon: '🏢',
            color: '#48bb78'
        },
        {
            title: 'Unassigned',
            value: data.unassignedEmails?.toLocaleString() || '0',
            icon: '⚠️',
            color: '#f56565',
            subtitle: `${data.unassignedPercentage || 0}% of total`
        },
        {
            title: 'Total Images',
            value: data.totalImages?.toLocaleString() || '0',
            icon: '🖼️',
            color: '#9f7aea'
        }
    ];

    return (
        <div className="stats-grid">
            {cards.map((card, index) => (
                <div key={index} className="stat-card" style={{ borderTopColor: card.color }}>
                    <div className="stat-icon" style={{ color: card.color }}>
                        {card.icon}
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">{card.title}</div>
                        <div className="stat-value">{card.value}</div>
                        {card.subtitle && (
                            <div className="stat-subtitle">{card.subtitle}</div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default OverviewCards;
