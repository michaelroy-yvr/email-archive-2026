const gmailService = require('../services/gmailService');

/**
 * Start Gmail OAuth flow
 */
exports.startGmailAuth = (req, res) => {
    try {
        const authUrl = gmailService.getAuthUrl();
        res.json({
            authUrl,
            message: 'Please visit the auth URL to authenticate with Gmail'
        });
    } catch (error) {
        console.error('Error starting Gmail auth:', error);
        res.status(500).json({
            error: 'Failed to generate authentication URL',
            message: error.message
        });
    }
};

/**
 * Handle Gmail OAuth callback
 */
exports.gmailCallback = async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({
            error: 'Missing authorization code'
        });
    }

    try {
        await gmailService.authenticate(code);

        // Get user's email address
        const userEmail = await gmailService.getUserEmail();

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Gmail Authentication Success</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    }
                    .container {
                        background: white;
                        padding: 3rem;
                        border-radius: 12px;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                        text-align: center;
                        max-width: 500px;
                    }
                    .success-icon {
                        font-size: 4rem;
                        margin-bottom: 1rem;
                    }
                    h1 {
                        color: #10b981;
                        margin: 0 0 1rem 0;
                        font-size: 2rem;
                    }
                    p {
                        color: #6b7280;
                        line-height: 1.6;
                        margin: 0.5rem 0;
                    }
                    .email {
                        font-weight: 600;
                        color: #4b5563;
                        background: #f3f4f6;
                        padding: 0.5rem 1rem;
                        border-radius: 6px;
                        display: inline-block;
                        margin: 1rem 0;
                    }
                    .button {
                        display: inline-block;
                        margin-top: 2rem;
                        padding: 0.75rem 2rem;
                        background: #667eea;
                        color: white;
                        text-decoration: none;
                        border-radius: 6px;
                        font-weight: 600;
                        transition: background 0.2s;
                    }
                    .button:hover {
                        background: #5568d3;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="success-icon">✓</div>
                    <h1>Authentication Successful!</h1>
                    <p>Gmail account connected successfully</p>
                    <div class="email">${userEmail}</div>
                    <p>You can now close this window and return to the application.</p>
                    <a href="http://localhost:3000" class="button">Return to App</a>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Error in Gmail callback:', error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Gmail Authentication Failed</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        background: #fee;
                    }
                    .container {
                        background: white;
                        padding: 3rem;
                        border-radius: 12px;
                        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
                        text-align: center;
                        max-width: 500px;
                    }
                    h1 { color: #ef4444; }
                    pre {
                        background: #f3f4f6;
                        padding: 1rem;
                        border-radius: 6px;
                        text-align: left;
                        overflow-x: auto;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Authentication Failed</h1>
                    <p>There was an error authenticating with Gmail:</p>
                    <pre>${error.message}</pre>
                    <p>Please try again or check the server logs.</p>
                </div>
            </body>
            </html>
        `);
    }
};

/**
 * Get authentication status
 */
exports.getAuthStatus = async (req, res) => {
    try {
        const isAuthenticated = gmailService.isAuthenticated();

        if (isAuthenticated) {
            const userEmail = await gmailService.getUserEmail();
            res.json({
                authenticated: true,
                email: userEmail
            });
        } else {
            res.json({
                authenticated: false
            });
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        res.status(500).json({
            error: 'Failed to check authentication status',
            message: error.message
        });
    }
};
