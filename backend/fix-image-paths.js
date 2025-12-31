require('dotenv').config();
const db = require('./src/config/database');

console.log('Fixing image paths in database...\n');

// Get all images
const images = db.all('SELECT * FROM images WHERE download_success = 1');

console.log(`Found ${images.length} images to fix`);

images.forEach(image => {
    // Remove 'images/' prefix if it exists
    let newPath = image.local_path;
    if (newPath.startsWith('images/')) {
        newPath = newPath.replace('images/', '');

        db.run('UPDATE images SET local_path = ? WHERE id = ?', [newPath, image.id]);
        console.log(`Fixed: ${image.local_path} → ${newPath}`);
    }
});

console.log('\n✓ Image paths fixed!');
console.log('Please restart the backend server.');
process.exit(0);
