require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'storage/database/emails.db');
const db = new Database(dbPath);

console.log('\n📋 All Classified Emails\n');
console.log('─'.repeat(140));

const classifiedEmails = db.prepare(`
    SELECT
        id,
        subject,
        category,
        ROUND(classification_confidence * 100) as confidence,
        is_graphic_email,
        has_donation_matching,
        is_supporter_record,
        from_address,
        date_received
    FROM emails
    WHERE category IS NOT NULL
    ORDER BY classified_at DESC
`).all();

console.log(`Total classified: ${classifiedEmails.length}\n`);

classifiedEmails.forEach((email, i) => {
    const icon = {
        'fundraising': '💰',
        'event': '📅',
        'newsletter': '📰',
        'share': '📢',
        'action': '✊',
        'other': '📋'
    }[email.category] || '❓';

    const flags = [];
    if (email.is_graphic_email) flags.push('🖼️');
    if (email.has_donation_matching) flags.push('🔄');
    if (email.is_supporter_record) flags.push('📊');
    const flagStr = flags.length > 0 ? ` [${flags.join(' ')}]` : '';

    console.log(`${(i + 1).toString().padStart(3)}. ${icon} ${email.category.padEnd(12)} (${email.confidence}%)${flagStr}`);
    console.log(`     ID: ${email.id} | ${new Date(email.date_received).toLocaleDateString()}`);
    console.log(`     From: ${email.from_address}`);
    console.log(`     Subject: ${email.subject}`);
    console.log('');
});

console.log('─'.repeat(140));
console.log('\nLegend: 🖼️ = Graphic email | 🔄 = Donation matching | 📊 = Supporter record\n');

db.close();
