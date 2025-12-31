const cheerio = require('cheerio');

class HtmlRewriter {
    constructor(imageBaseUrl) {
        this.imageBaseUrl = imageBaseUrl || process.env.IMAGE_BASE_URL || 'http://localhost:3001/api/images';

        // Patterns to identify unsubscribe links
        this.unsubscribePatterns = [
            /unsubscribe/i,
            /opt[-\s]?out/i,
            /manage[-\s]?preferences/i,
            /manage[-\s]?subscription/i,
            /email[-\s]?settings/i,
            /remove[-\s]?me/i,
            /stop[-\s]?emails/i
        ];
    }

    /**
     * Rewrite HTML: replace image URLs and disable unsubscribe links
     * @param {string} htmlContent - Original HTML content
     * @param {object} imageMapping - Map of original URL -> local path
     * @returns {string} - Rewritten HTML
     */
    rewriteHtml(htmlContent, imageMapping = {}) {
        if (!htmlContent) {
            return '';
        }

        try {
            // Parse HTML with cheerio
            const $ = cheerio.load(htmlContent, {
                decodeEntities: false,
                xmlMode: false
            });

            // Rewrite image URLs
            this.rewriteImages($, imageMapping);

            // Disable unsubscribe links
            this.disableUnsubscribeLinks($);

            // Return rewritten HTML
            return $.html();
        } catch (error) {
            console.error('Error rewriting HTML:', error);
            // Return original HTML if parsing fails
            return htmlContent;
        }
    }

    /**
     * Rewrite all image URLs to point to local storage
     * @param {object} $ - Cheerio instance
     * @param {object} imageMapping - Map of original URL -> local path
     */
    rewriteImages($, imageMapping) {
        let imageCount = 0;

        // Rewrite <img> tags
        $('img').each((i, elem) => {
            const src = $(elem).attr('src');
            if (src && imageMapping[src]) {
                const newSrc = `${this.imageBaseUrl}/${imageMapping[src]}`;
                $(elem).attr('src', newSrc);
                $(elem).attr('data-original-src', src); // Preserve original
                imageCount++;
            }
        });

        // Rewrite CSS background images in inline styles
        $('[style*="background"]').each((i, elem) => {
            let style = $(elem).attr('style');
            if (style) {
                let modified = false;
                Object.keys(imageMapping).forEach(originalUrl => {
                    if (style.includes(originalUrl)) {
                        const newUrl = `${this.imageBaseUrl}/${imageMapping[originalUrl]}`;
                        style = style.replace(new RegExp(this.escapeRegex(originalUrl), 'g'), newUrl);
                        modified = true;
                    }
                });
                if (modified) {
                    $(elem).attr('style', style);
                    imageCount++;
                }
            }
        });

        // Rewrite inline CSS in <style> tags
        $('style').each((i, elem) => {
            let css = $(elem).html();
            if (css) {
                let modified = false;
                Object.keys(imageMapping).forEach(originalUrl => {
                    if (css.includes(originalUrl)) {
                        const newUrl = `${this.imageBaseUrl}/${imageMapping[originalUrl]}`;
                        css = css.replace(new RegExp(this.escapeRegex(originalUrl), 'g'), newUrl);
                        modified = true;
                    }
                });
                if (modified) {
                    $(elem).html(css);
                    imageCount++;
                }
            }
        });

        if (imageCount > 0) {
            console.log(`Rewrote ${imageCount} image references`);
        }
    }

    /**
     * Disable unsubscribe links by changing href to "#"
     * @param {object} $ - Cheerio instance
     */
    disableUnsubscribeLinks($) {
        let disabledCount = 0;

        $('a').each((i, elem) => {
            const href = $(elem).attr('href');
            const text = $(elem).text();
            const title = $(elem).attr('title') || '';

            // Check if this is an unsubscribe link
            if (this.isUnsubscribeLink(href, text, title)) {
                // Preserve original href
                $(elem).attr('data-original-href', href);

                // Disable the link
                $(elem).attr('href', '#');

                // Add a class for styling (optional)
                $(elem).addClass('unsubscribe-disabled');

                // Add title to indicate it's disabled
                $(elem).attr('title', 'Unsubscribe link disabled (archived email)');

                disabledCount++;
            }
        });

        if (disabledCount > 0) {
            console.log(`Disabled ${disabledCount} unsubscribe link(s)`);
        }
    }

    /**
     * Check if a link is an unsubscribe link
     * @param {string} href - Link href
     * @param {string} text - Link text
     * @param {string} title - Link title
     * @returns {boolean}
     */
    isUnsubscribeLink(href, text, title) {
        if (!href) return false;

        // Check href URL
        for (const pattern of this.unsubscribePatterns) {
            if (pattern.test(href)) {
                return true;
            }
        }

        // Check link text
        for (const pattern of this.unsubscribePatterns) {
            if (pattern.test(text)) {
                return true;
            }
        }

        // Check title attribute
        for (const pattern of this.unsubscribePatterns) {
            if (pattern.test(title)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Escape special regex characters in a string
     * @param {string} str - String to escape
     * @returns {string} - Escaped string
     */
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Extract and sanitize HTML for safe display
     * @param {string} htmlContent - HTML content
     * @returns {string} - Sanitized HTML
     */
    sanitizeForDisplay(htmlContent) {
        if (!htmlContent) {
            return '';
        }

        try {
            const $ = cheerio.load(htmlContent, {
                decodeEntities: false,
                xmlMode: false
            });

            // Remove potentially dangerous elements
            $('script').remove();
            $('iframe').remove();
            $('object').remove();
            $('embed').remove();
            $('form').remove();

            // Remove event handlers
            $('*').each((i, elem) => {
                const attribs = Object.keys(elem.attribs || {});
                attribs.forEach(attr => {
                    if (attr.startsWith('on')) {
                        $(elem).removeAttr(attr);
                    }
                });
            });

            return $.html();
        } catch (error) {
            console.error('Error sanitizing HTML:', error);
            return htmlContent;
        }
    }
}

module.exports = HtmlRewriter;
