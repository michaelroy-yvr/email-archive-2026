require('dotenv').config();
const db = require('./src/config/database');
const HtmlRewriter = require('./src/services/htmlRewriter');

console.log('🔄 Regenerating email HTML with correct image paths...\n');

const htmlRewriter = new HtmlRewriter(process.env.IMAGE_BASE_URL);

// Get all emails
const emails = db.all('SELECT id, html_content FROM emails WHERE html_content IS NOT NULL');

console.log(`Found ${emails.length} emails to process\n`);

emails.forEach(email => {
    // Get images for this email
    const images = db.all(
        'SELECT original_url, local_path FROM images WHERE email_id = ? AND download_success = 1',
        [email.id]
    );

    // Build image mapping
    const imageMapping = {};
    images.forEach(img => {
        imageMapping[img.original_url] = img.local_path;
    });

    // Rewrite HTML
    const rewrittenHtml = htmlRewriter.rewriteHtml(email.html_content, imageMapping);

    // Update database
    db.run(
        'UPDATE emails SET rewritten_html_content = ? WHERE id = ?',
        [rewrittenHtml, email.id]
    );

    console.log(`✓ Email ${email.id}: Rewrote ${Object.keys(imageMapping).length} image URLs`);
});

console.log('\n✅ Done! All email HTML has been regenerated.');
console.log('Please refresh the frontend to see the images.\n');

process.exit(0);
