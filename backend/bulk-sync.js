require('dotenv').config();
const gmailService = require('./src/services/gmailService');
const EmailProcessor = require('./src/services/emailProcessor');

async function bulkSync() {
    // Parse command-line arguments
    const args = process.argv.slice(2);
    const MAX_EMAILS = args[0] ? parseInt(args[0], 10) : 500;
    const QUERY = args[1] || 'category:promotions';

    // Validate maxEmails argument
    if (isNaN(MAX_EMAILS) || MAX_EMAILS <= 0) {
        console.error('❌ Error: Invalid number of emails. Please provide a positive integer.');
        console.log('\nUsage: node bulk-sync.js [maxEmails] [query]');
        console.log('Examples:');
        console.log('  node bulk-sync.js 100');
        console.log('  node bulk-sync.js 100 "category:promotions"');
        console.log('  node bulk-sync.js 50 "is:unread"');
        process.exit(1);
    }

    console.log(`\n🔄 Starting bulk sync of ${MAX_EMAILS} emails...\n`);
    console.log(`📋 Query: ${QUERY}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
        const processor = new EmailProcessor();

        // Fetch emails from Gmail
        console.log(`📧 Fetching ${MAX_EMAILS} emails from Gmail...\n`);
        const emailList = await gmailService.fetchEmailList(QUERY, MAX_EMAILS);
        console.log(`✓ Found ${emailList.length} emails\n`);

        let processed = 0;
        let skipped = 0;
        let errors = 0;

        // Process each email
        for (let i = 0; i < emailList.length; i++) {
            try {
                const emailRef = emailList[i];
                const progress = `[${i + 1}/${emailList.length}]`;

                // Get full email details
                const emailDetails = await gmailService.getEmailDetails(emailRef.id);

                // Extract subject for logging
                const subjectHeader = emailDetails.payload.headers.find(h => h.name === 'Subject');
                const subject = subjectHeader?.value?.substring(0, 60) || '(No subject)';

                console.log(`${progress} Processing: ${subject}...`);

                // Process email
                const emailId = await processor.processEmail(emailDetails);

                if (emailId) {
                    processed++;
                    console.log(`${progress} ✓ Processed (ID: ${emailId})\n`);
                }

                // Show progress every 10 emails
                if ((i + 1) % 10 === 0) {
                    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                    console.log(`Progress: ${i + 1}/${emailList.length} emails processed`);
                    console.log(`Processed: ${processed} | Skipped: ${skipped} | Errors: ${errors}`);
                    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
                }

            } catch (error) {
                if (error.message.includes('already exists')) {
                    skipped++;
                    console.log(`${progress} ⊘ Already exists\n`);
                } else {
                    errors++;
                    console.error(`${progress} ✗ Error: ${error.message}\n`);
                }
            }
        }

        // Final summary
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Bulk Sync Complete!\n');
        console.log(`Total Fetched: ${emailList.length}`);
        console.log(`Successfully Processed: ${processed}`);
        console.log(`Already Existed: ${skipped}`);
        console.log(`Errors: ${errors}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Show stats
        const stats = await processor.getStats();
        console.log('📊 Archive Statistics:');
        console.log(`   Total Emails: ${stats.totalEmails}`);
        console.log(`   Total Images: ${stats.totalImages}`);
        console.log(`   Failed Images: ${stats.failedImages}\n`);

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Bulk sync failed:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

bulkSync();
