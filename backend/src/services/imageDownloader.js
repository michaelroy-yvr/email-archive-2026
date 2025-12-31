const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

class ImageDownloader {
    constructor(storageRoot) {
        this.storageRoot = storageRoot || process.env.STORAGE_ROOT || path.join(__dirname, '../../storage');
        this.timeout = 10000; // 10 second timeout
        this.maxRetries = 3;
        this.minImageSize = 100; // Skip tiny images (tracking pixels)
    }

    /**
     * Download all images from an email's HTML content
     * @param {number} emailId - Database email ID
     * @param {string} htmlContent - Email HTML content
     * @returns {Array} - Array of download results
     */
    async downloadEmailImages(emailId, htmlContent) {
        if (!htmlContent) {
            return [];
        }

        // Extract all image URLs from HTML
        const imageUrls = this.extractImageUrls(htmlContent);

        console.log(`Found ${imageUrls.length} image URLs in email ${emailId}`);

        const downloadResults = [];

        // Download each image
        for (const url of imageUrls) {
            const result = await this.downloadImage(emailId, url);
            downloadResults.push(result);

            // Small delay to avoid overwhelming servers
            await this.sleep(50);
        }

        const successCount = downloadResults.filter(r => r.success).length;
        console.log(`Downloaded ${successCount}/${downloadResults.length} images for email ${emailId}`);

        return downloadResults;
    }

    /**
     * Extract all image URLs from HTML content
     * @param {string} html - HTML content
     * @returns {Array} - Array of unique image URLs
     */
    extractImageUrls(html) {
        const urls = new Set();

        // Match <img src="...">
        const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
        let match;
        while ((match = imgRegex.exec(html)) !== null) {
            urls.add(match[1]);
        }

        // Match CSS background-image: url(...)
        const bgRegex = /background(?:-image)?:\s*url\(["']?([^"')]+)["']?\)/gi;
        while ((match = bgRegex.exec(html)) !== null) {
            urls.add(match[1]);
        }

        // Filter out invalid URLs and data URIs
        const validUrls = Array.from(urls).filter(url => {
            return this.isValidImageUrl(url);
        });

        return validUrls;
    }

    /**
     * Check if URL is valid for downloading
     * @param {string} url - URL to validate
     * @returns {boolean}
     */
    isValidImageUrl(url) {
        // Skip data URIs
        if (url.startsWith('data:')) {
            return false;
        }

        // Skip common tracking pixels (very small images)
        if (url.includes('1x1') || url.includes('pixel') || url.includes('tracker')) {
            // Still download but we'll filter by size later
        }

        // Must be HTTP(S) URL
        try {
            const parsed = new URL(url);
            return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
            return false;
        }
    }

    /**
     * Download a single image with retry logic
     * @param {number} emailId - Email ID
     * @param {string} url - Image URL
     * @param {number} retryCount - Current retry attempt
     * @returns {object} - Download result
     */
    async downloadImage(emailId, url, retryCount = 0) {
        try {
            // Create email-specific directory
            const emailDir = path.join(this.storageRoot, 'images', emailId.toString());
            await fs.mkdir(emailDir, { recursive: true });

            // Generate unique filename from URL hash
            const hash = crypto.createHash('md5').update(url).digest('hex');
            const ext = this.getExtensionFromUrl(url) || 'jpg';
            const filename = `${hash}.${ext}`;
            const localPath = path.join(emailDir, filename);

            // Check if already downloaded
            try {
                await fs.access(localPath);
                console.log(`Image already exists: ${filename}`);

                // Get file stats
                const stats = await fs.stat(localPath);
                const metadata = await sharp(localPath).metadata();

                return {
                    success: true,
                    originalUrl: url,
                    localPath: path.join(emailId.toString(), filename),
                    fileSize: stats.size,
                    mimeType: `image/${metadata.format}`,
                    width: metadata.width,
                    height: metadata.height,
                    cached: true
                };
            } catch {
                // File doesn't exist, continue with download
            }

            // Download image
            console.log(`Downloading: ${url.substring(0, 80)}...`);
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: this.timeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                maxRedirects: 5,
                validateStatus: (status) => status < 400
            });

            // Validate it's actually an image and get metadata
            const buffer = Buffer.from(response.data);

            // Skip very small images (likely tracking pixels)
            if (buffer.length < this.minImageSize) {
                return {
                    success: false,
                    originalUrl: url,
                    error: 'Image too small (likely tracking pixel)',
                    skipped: true
                };
            }

            let metadata;
            try {
                metadata = await sharp(buffer).metadata();
            } catch (error) {
                return {
                    success: false,
                    originalUrl: url,
                    error: 'Invalid image format: ' + error.message
                };
            }

            // Save to disk
            await fs.writeFile(localPath, buffer);

            // Return relative path for database (relative to storage/images/)
            const relativePath = path.join(emailId.toString(), filename);

            return {
                success: true,
                originalUrl: url,
                localPath: relativePath,
                fileSize: buffer.length,
                mimeType: response.headers['content-type'] || `image/${metadata.format}`,
                width: metadata.width,
                height: metadata.height
            };

        } catch (error) {
            // Retry logic
            if (retryCount < this.maxRetries) {
                console.log(`Retry ${retryCount + 1}/${this.maxRetries} for: ${url.substring(0, 60)}...`);
                await this.sleep(Math.pow(2, retryCount) * 1000); // Exponential backoff
                return this.downloadImage(emailId, url, retryCount + 1);
            }

            // All retries failed
            console.error(`Failed to download ${url}: ${error.message}`);
            return {
                success: false,
                originalUrl: url,
                error: error.message
            };
        }
    }

    /**
     * Get file extension from URL
     * @param {string} url - Image URL
     * @returns {string|null} - File extension or null
     */
    getExtensionFromUrl(url) {
        try {
            const pathname = new URL(url).pathname;
            const match = pathname.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
            if (match) {
                const ext = match[1].toLowerCase();
                // Common image extensions
                if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
                    return ext === 'jpeg' ? 'jpg' : ext;
                }
            }
        } catch {
            // Invalid URL
        }
        return null;
    }

    /**
     * Utility: Sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get statistics about downloaded images for an email
     * @param {number} emailId - Email ID
     * @returns {object} - Statistics
     */
    async getImageStats(emailId) {
        try {
            const emailDir = path.join(this.storageRoot, 'images', emailId.toString());
            const files = await fs.readdir(emailDir);

            let totalSize = 0;
            for (const file of files) {
                const stats = await fs.stat(path.join(emailDir, file));
                totalSize += stats.size;
            }

            return {
                count: files.length,
                totalSize,
                averageSize: files.length > 0 ? Math.round(totalSize / files.length) : 0
            };
        } catch {
            return { count: 0, totalSize: 0, averageSize: 0 };
        }
    }
}

module.exports = ImageDownloader;
