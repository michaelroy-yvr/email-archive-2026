require('dotenv').config();
const db = require('./src/config/database');
const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging Image Loading Issue\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 1. Check database image paths
console.log('1. Image paths in database:');
const images = db.all('SELECT id, email_id, local_path, download_success FROM images LIMIT 5');
images.forEach(img => {
    console.log(`   Image ${img.id}: ${img.local_path} (email ${img.email_id})`);
});
console.log('');

// 2. Check if files exist on disk
console.log('2. Checking if files exist on disk:');
const storageRoot = path.join(__dirname, 'storage');
images.forEach(img => {
    const filePath = path.join(storageRoot, 'images', img.local_path);
    const exists = fs.existsSync(filePath);
    console.log(`   ${img.local_path}: ${exists ? '✓ EXISTS' : '✗ NOT FOUND'}`);
    if (exists) {
        const stats = fs.statSync(filePath);
        console.log(`      Size: ${stats.size} bytes`);
    }
});
console.log('');

// 3. Check rewritten HTML
console.log('3. Sample rewritten HTML URLs:');
const email = db.get('SELECT id, rewritten_html_content FROM emails WHERE id = 1');
if (email && email.rewritten_html_content) {
    const imgMatches = email.rewritten_html_content.match(/src="([^"]+)"/g);
    if (imgMatches) {
        imgMatches.slice(0, 3).forEach(match => {
            console.log(`   ${match}`);
        });
    }
}
console.log('');

// 4. Show what the URLs should be
console.log('4. Expected image URLs:');
const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL || 'http://localhost:3001/api/images';
images.slice(0, 3).forEach(img => {
    const expectedURL = `${IMAGE_BASE_URL}/${img.local_path}`;
    console.log(`   ${expectedURL}`);
});
console.log('');

// 5. Check environment variables
console.log('5. Environment variables:');
console.log(`   IMAGE_BASE_URL: ${process.env.IMAGE_BASE_URL || '(not set, using default)'}`);
console.log(`   STORAGE_ROOT: ${process.env.STORAGE_ROOT || '(not set, using default)'}`);
console.log('');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('💡 Try accessing this URL in your browser:');
if (images.length > 0) {
    const testURL = `http://localhost:3001/api/images/${images[0].local_path}`;
    console.log(`   ${testURL}`);
    console.log('\n   If you see the image, the backend is working!');
    console.log('   If not, there\'s an issue with the static file serving.');
}

process.exit(0);
