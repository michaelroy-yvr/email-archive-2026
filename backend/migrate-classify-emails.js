require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const EmailClassifier = require('./src/services/emailClassifier');

const dbPath = path.join(__dirname, 'storage/database/emails.db');
const db = new Database(dbPath);

console.log('\n📧 Starting email classification migration...\n');

async function classifyExistingEmails() {
    try {
        // Get all emails that haven't been classified yet
        const unclassifiedEmails = db.prepare(`
            SELECT id, subject, text_content
            FROM emails
            WHERE category IS NULL
            ORDER BY date_received DESC
        `).all();

        if (unclassifiedEmails.length === 0) {
            console.log('✅ No unclassified emails found. All emails are already classified.\n');
            return;
        }

        console.log(`Found ${unclassifiedEmails.length} unclassified emails\n`);

        if (!process.env.OPENAI_API_KEY) {
            console.error('❌ OPENAI_API_KEY not set in environment variables');
            console.error('Please add your OpenAI API key to the .env file\n');
            process.exit(1);
        }

        // Initialize classifier
        const classifier = new EmailClassifier();

        // Prepare update statement
        const updateStmt = db.prepare(`
            UPDATE emails
            SET category = ?,
                is_graphic_email = ?,
                has_donation_matching = ?,
                is_supporter_record = ?,
                classified_at = CURRENT_TIMESTAMP,
                classification_confidence = ?
            WHERE id = ?
        `);

        // Progress callback
        const onProgress = (processed, total) => {
            const percentage = ((processed / total) * 100).toFixed(1);
            console.log(`Progress: ${processed}/${total} emails classified (${percentage}%)`);
        };

        // Classify emails in batches
        console.log('Starting classification process...\n');
        const startTime = Date.now();

        const results = await classifier.classifyBatch(unclassifiedEmails, onProgress);

        // Update database with results
        console.log('\nUpdating database with classification results...');

        db.exec('BEGIN TRANSACTION');

        let successCount = 0;
        for (const result of results) {
            try {
                updateStmt.run(
                    result.category,
                    result.is_graphic_email,
                    result.has_donation_matching,
                    result.is_supporter_record,
                    result.confidence,
                    result.id
                );
                successCount++;
            } catch (error) {
                console.error(`Failed to update email ${result.id}:`, error.message);
            }
        }

        db.exec('COMMIT');

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log('\n✅ Classification migration completed successfully!\n');
        console.log(`Total emails processed: ${results.length}`);
        console.log(`Successfully updated: ${successCount}`);
        console.log(`Time taken: ${duration} seconds\n`);

        // Show category breakdown
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

        console.log('Category breakdown:');
        breakdown.forEach(row => {
            console.log(`  ${row.category}: ${row.count} emails (avg confidence: ${row.avg_confidence})`);
        });

        // Show feature flags summary
        const features = db.prepare(`
            SELECT
                SUM(is_graphic_email) as graphic_emails,
                SUM(has_donation_matching) as donation_matching_emails,
                SUM(is_supporter_record) as supporter_record_emails
            FROM emails
            WHERE category IS NOT NULL
        `).get();

        console.log('\nContent features:');
        console.log(`  Graphic emails: ${features.graphic_emails}`);
        console.log(`  Donation matching emails: ${features.donation_matching_emails}`);
        console.log(`  Supporter record emails: ${features.supporter_record_emails}\n`);

    } catch (error) {
        db.exec('ROLLBACK');
        console.error('\n❌ Classification migration failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        db.close();
    }
}

// Run the migration
classifyExistingEmails();
