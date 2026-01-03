require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'storage/database/emails.db');
const db = new Database(dbPath);

console.log('\n📊 Email Classification Report\n');

// Get count of classified vs unclassified
const stats = db.prepare(`
    SELECT
        COUNT(*) as total_emails,
        SUM(CASE WHEN category IS NOT NULL THEN 1 ELSE 0 END) as classified,
        SUM(CASE WHEN category IS NULL THEN 1 ELSE 0 END) as unclassified
    FROM emails
`).get();

console.log('Overview:');
console.log(`  Total emails: ${stats.total_emails.toLocaleString()}`);
console.log(`  Classified: ${stats.classified.toLocaleString()} (${((stats.classified / stats.total_emails) * 100).toFixed(1)}%)`);
console.log(`  Unclassified: ${stats.unclassified.toLocaleString()}\n`);

// Get category breakdown
const breakdown = db.prepare(`
    SELECT
        category,
        COUNT(*) as count,
        ROUND(AVG(classification_confidence), 2) as avg_confidence
    FROM emails
    WHERE category IS NOT NULL
    GROUP BY category
    ORDER BY count DESC
`).all();

console.log('Category Breakdown:');
breakdown.forEach(row => {
    const icon = {
        'fundraising': '💰',
        'event': '📅',
        'newsletter': '📰',
        'share': '📢',
        'action': '✊',
        'other': '📋'
    }[row.category] || '❓';

    console.log(`  ${icon} ${row.category.padEnd(12)} ${row.count.toString().padStart(4)} emails (avg confidence: ${(row.avg_confidence * 100).toFixed(0)}%)`);
});

// Feature flags summary
const features = db.prepare(`
    SELECT
        SUM(is_graphic_email) as graphic_emails,
        SUM(has_donation_matching) as donation_matching_emails,
        SUM(is_supporter_record) as supporter_record_emails
    FROM emails
    WHERE category IS NOT NULL
`).get();

console.log('\nContent Features:');
console.log(`  🖼️  Graphic emails: ${features.graphic_emails}`);
console.log(`  🔄 Donation matching: ${features.donation_matching_emails}`);
console.log(`  📋 Supporter records: ${features.supporter_record_emails}\n`);

// Show 10 recent classified emails as examples
console.log('Recent Classified Emails (sample):');
console.log('─'.repeat(120));

const examples = db.prepare(`
    SELECT
        subject,
        category,
        ROUND(classification_confidence * 100) as confidence,
        from_address,
        date_received
    FROM emails
    WHERE category IS NOT NULL
    ORDER BY classified_at DESC
    LIMIT 10
`).all();

examples.forEach((email, i) => {
    const icon = {
        'fundraising': '💰',
        'event': '📅',
        'newsletter': '📰',
        'share': '📢',
        'action': '✊',
        'other': '📋'
    }[email.category] || '❓';

    const shortSubject = email.subject.substring(0, 60) + (email.subject.length > 60 ? '...' : '');
    console.log(`${(i + 1).toString().padStart(2)}. ${icon} ${email.category.padEnd(12)} (${email.confidence}%) - ${shortSubject}`);
    console.log(`    From: ${email.from_address} | ${new Date(email.date_received).toLocaleDateString()}\n`);
});

console.log('─'.repeat(120));
console.log('\n💡 To view classified emails in the app, use the category filter dropdown in the Emails tab.\n');

db.close();
