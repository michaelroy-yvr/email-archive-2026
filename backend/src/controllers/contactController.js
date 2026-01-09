const nodemailer = require('nodemailer');

/**
 * Send contact form email
 */
exports.sendMessage = async (req, res, next) => {
    try {
        const { name, email, message, type } = req.body;

        // Validate required fields
        if (!name || !email || !message || !type) {
            return res.status(400).json({
                error: 'All fields are required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Invalid email address'
            });
        }

        // Map type to readable label
        const typeLabels = {
            bug: '🐛 Bug Report',
            feedback: '💡 Feedback',
            hello: '👋 Just Say Hi'
        };
        const typeLabel = typeLabels[type] || type;

        // Create transporter (using Gmail SMTP or other service)
        // For development, we'll use a simple SMTP setup
        // In production, use environment variables for credentials
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        // Email content
        const mailOptions = {
            from: `"Email Archive Contact Form" <${process.env.SMTP_USER}>`,
            to: 'hello@michaelroy.ca',
            replyTo: email,
            subject: `[Email Archive] ${typeLabel} from ${name}`,
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Type:</strong> ${typeLabel}</p>
                <p><strong>From:</strong> ${name} (${email})</p>
                <hr>
                <h3>Message:</h3>
                <p>${message.replace(/\n/g, '<br>')}</p>
                <hr>
                <p><em>Sent from Email Archive 2026 contact form</em></p>
            `,
            text: `
New Contact Form Submission

Type: ${typeLabel}
From: ${name} (${email})

Message:
${message}

---
Sent from Email Archive 2026 contact form
            `.trim()
        };

        // Send email
        await transporter.sendMail(mailOptions);

        console.log(`Contact form submission from ${name} (${email}) - Type: ${type}`);

        res.json({
            message: 'Message sent successfully'
        });
    } catch (error) {
        console.error('Error sending contact form email:');
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Full error:', error);

        // Check if it's a transporter error (missing SMTP config)
        if (error.code === 'EAUTH' || error.code === 'ECONNECTION' || !process.env.SMTP_USER) {
            console.log('SMTP not configured - returning user-friendly error');
            return res.status(500).json({
                error: 'Email service not configured. Please contact the administrator directly at hello@michaelroy.ca'
            });
        }

        // Return generic error
        return res.status(500).json({
            error: error.message || 'Failed to send message. Please try again later.'
        });
    }
};
