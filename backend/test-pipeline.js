require('dotenv').config();
const gmailService = require('./src/services/gmailService');
const EmailProcessor = require('./src/services/emailProcessor');
const db = require('./src/config/database');

async function testPipeline() {
    console.log('🧪 Testing Email Processing Pipeline\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
        // Initialize database
        await db.initialize();

        // Create email processor
        const processor = new EmailProcessor();

        // 1. Fetch emails from Gmail
        console.log('📧 Step 1: Fetching 3 marketing emails from Gmail...\n');
        const emailList = await gmailService.fetchEmailList('category:promotions', 3);
        console.log(`✓ Found ${emailList.length} emails\n`);

        // 2. Process each email
        console.log('⚙️  Step 2: Processing emails through the pipeline...\n');

        for (let i = 0; i < emailList.length; i++) {
            const emailRef = emailList[i];
            console.log(`\n[${i + 1}/${emailList.length}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

            // Get full email details
            const emailDetails = await gmailService.getEmailDetails(emailRef.id);

            // Process email through pipeline
            const emailId = await processor.processEmail(emailDetails);

            // Show brief stats
            const email = db.get('SELECT * FROM emails WHERE id = ?', [emailId]);
            const imageCount = db.get(
                'SELECT COUNT(*) as count FROM images WHERE email_id = ? AND download_success = 1',
                [emailId]
            );

            console.log(`\n✓ Processed: ${email.subject?.substring(0, 60) || '(No subject)'}...`);
            console.log(`  From: ${email.from_name || email.from_address}`);
            console.log(`  Images downloaded: ${imageCount.count}`);
        }

        // 3. Show overall statistics
        console.log('\n\n📊 Overall Statistics:\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const stats = await processor.getStats();
        const storageInfo = db.get(`
            SELECT
                SUM(file_size) as total_size,
                COUNT(*) as image_count
            FROM images
            WHERE download_success = 1
        `);

        console.log(`Total Emails Processed: ${stats.totalEmails}`);
        console.log(`Total Images Downloaded: ${stats.totalImages}`);
        console.log(`Failed Image Downloads: ${stats.failedImages}`);
        console.log(`Total Storage Used: ${formatBytes(storageInfo.total_size || 0)}`);

        // 4. Show sample rewritten email
        console.log('\n\n📄 Sample Rewritten Email:\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const sampleEmail = db.get(`
            SELECT id, subject, from_name, rewritten_html_content
            FROM emails
            ORDER BY id DESC
            LIMIT 1
        `);

        if (sampleEmail) {
            console.log(`Subject: ${sampleEmail.subject}`);
            console.log(`From: ${sampleEmail.from_name}`);
            console.log(`\nHTML Preview (first 500 chars):`);
            console.log(sampleEmail.rewritten_html_content?.substring(0, 500) + '...\n');
        }

        console.log('✅ Pipeline test completed successfully!\n');
        console.log('You can now view these emails by:');
        console.log('  1. Starting the backend server: npm start');
        console.log('  2. Building the frontend (coming next)');
        console.log('  3. Browsing to http://localhost:3000\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Pipeline test failed:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

testPipeline();
