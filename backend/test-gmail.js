require('dotenv').config();
const gmailService = require('./src/services/gmailService');

async function test() {
    try {
        console.log('Testing Gmail API connection...\n');
        
        // Get user email
        const email = await gmailService.getUserEmail();
        console.log('✓ Connected as:', email);
        
        // Fetch a few promotional emails
        console.log('\nFetching 5 promotional emails...');
        const emails = await gmailService.fetchEmailList('category:promotions', 5);
        console.log(`✓ Found ${emails.length} emails`);
        
        if (emails.length > 0) {
            console.log('\nFetching details of first email...');
            const details = await gmailService.getEmailDetails(emails[0].id);
            
            // Extract subject
            const subjectHeader = details.payload.headers.find(h => h.name === 'Subject');
            const fromHeader = details.payload.headers.find(h => h.name === 'From');
            
            console.log('✓ Email details retrieved:');
            console.log('  Subject:', subjectHeader?.value || 'No subject');
            console.log('  From:', fromHeader?.value || 'Unknown');
            console.log('  Date:', new Date(parseInt(details.internalDate)).toLocaleString());
        }
        
        console.log('\n✅ Gmail API is working perfectly!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

test();
