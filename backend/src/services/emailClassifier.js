const OpenAI = require('openai');

class EmailClassifier {
    constructor() {
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    /**
     * Classify an email based on its subject and content
     * @param {string} subject - Email subject
     * @param {string} textContent - Email text content
     * @returns {Object} Classification results
     */
    async classifyEmail(subject, textContent) {
        if (!process.env.OPENAI_API_KEY) {
            console.warn('OPENAI_API_KEY not set, skipping classification');
            return this.getDefaultClassification();
        }

        try {
            // Truncate content if too long (keep first 3000 chars)
            const content = textContent ? textContent.substring(0, 3000) : '';

            const prompt = `Analyze this email and classify it based on its PRIMARY purpose and content features.

Email Subject: ${subject || 'No subject'}

Email Content (truncated):
${content || 'No content available'}

Respond ONLY with a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "category": "one of: fundraising, event, newsletter, share, action, other",
  "is_graphic_email": true or false,
  "has_donation_matching": true or false,
  "is_supporter_record": true or false,
  "confidence": 0.0 to 1.0
}

Category definitions (choose based on PRIMARY purpose):
- fundraising: The PRIMARY purpose is asking for money/donations. Even if wrapped in news/updates, if it contains donation asks, calls-to-action with dollar amounts, fundraising deadlines, or emphasizes financial support, classify as fundraising.
- event: The PRIMARY purpose is inviting to a specific online or offline event (webinar, rally, town hall, etc.)
- newsletter: ONLY purely informational updates, news digests, or recaps with NO donation requests or financial calls-to-action
- share: The PRIMARY purpose is asking to watch/read/share content (videos, articles, social media posts)
- action: The PRIMARY purpose is asking to take non-financial action (sign petition, contact representative, volunteer, etc.)
- other: Doesn't fit above categories

IMPORTANT DISTINCTION:
- If email mentions donations, fundraising goals, asks for money, or includes donate buttons → fundraising
- If email is purely informative with no financial asks → newsletter
- When in doubt between newsletter and fundraising, choose fundraising if ANY donation request is present

Feature definitions:
- is_graphic_email: Primarily images with little/no text (check if content is very short or mentions images heavily)
- has_donation_matching: Mentions donation matching, doubling, tripling, etc.
- is_supporter_record: Shows donation history or supporter status

Respond with ONLY the JSON object, nothing else.`;

            const completion = await this.client.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                temperature: 0.3,
                max_tokens: 500
            });

            const responseText = completion.choices[0].message.content.trim();

            // Parse JSON response
            const classification = JSON.parse(responseText);

            // Validate response
            if (!this.isValidClassification(classification)) {
                console.warn('Invalid classification response, using default');
                return this.getDefaultClassification();
            }

            return {
                category: classification.category,
                is_graphic_email: classification.is_graphic_email ? 1 : 0,
                has_donation_matching: classification.has_donation_matching ? 1 : 0,
                is_supporter_record: classification.is_supporter_record ? 1 : 0,
                confidence: classification.confidence || 0.8
            };

        } catch (error) {
            console.error('Error classifying email:', error.message);
            return this.getDefaultClassification();
        }
    }

    /**
     * Validate classification response
     */
    isValidClassification(classification) {
        const validCategories = ['fundraising', 'event', 'newsletter', 'share', 'action', 'other'];

        return (
            classification &&
            validCategories.includes(classification.category) &&
            typeof classification.is_graphic_email === 'boolean' &&
            typeof classification.has_donation_matching === 'boolean' &&
            typeof classification.is_supporter_record === 'boolean'
        );
    }

    /**
     * Get default classification when API fails or is not configured
     */
    getDefaultClassification() {
        return {
            category: 'other',
            is_graphic_email: 0,
            has_donation_matching: 0,
            is_supporter_record: 0,
            confidence: 0.0
        };
    }

    /**
     * Classify email in batch with rate limiting
     * @param {Array} emails - Array of {id, subject, textContent}
     * @param {Function} onProgress - Progress callback
     * @returns {Array} Classification results
     */
    async classifyBatch(emails, onProgress = null) {
        const results = [];
        const batchSize = 5; // Process 5 at a time to respect rate limits
        const delayMs = 1000; // 1 second delay between batches

        for (let i = 0; i < emails.length; i += batchSize) {
            const batch = emails.slice(i, i + batchSize);

            const batchPromises = batch.map(async (email) => {
                const classification = await this.classifyEmail(email.subject, email.textContent);
                return {
                    id: email.id,
                    ...classification
                };
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            if (onProgress) {
                onProgress(results.length, emails.length);
            }

            // Delay before next batch (except for last batch)
            if (i + batchSize < emails.length) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        return results;
    }
}

module.exports = EmailClassifier;
