# Gmail API Setup Guide

This guide will walk you through setting up Gmail API credentials in Google Cloud Console.

## Prerequisites
- A Google account (the one you want to use for accessing Gmail emails)
- Access to Google Cloud Console

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page
3. Click **"NEW PROJECT"**
4. Enter project details:
   - **Project Name**: `Email Archive` (or your preferred name)
   - **Organization**: Leave as default (No organization)
5. Click **"CREATE"**
6. Wait for the project to be created, then select it from the project dropdown

## Step 2: Enable Gmail API

1. In your Google Cloud Console, make sure your new project is selected
2. Go to **"APIs & Services"** > **"Library"** from the left sidebar
3. Search for **"Gmail API"**
4. Click on **"Gmail API"** in the results
5. Click the **"ENABLE"** button
6. Wait for the API to be enabled (should take a few seconds)

## Step 3: Configure OAuth Consent Screen

Before creating credentials, you need to configure the OAuth consent screen.

1. Go to **"APIs & Services"** > **"OAuth consent screen"** from the left sidebar
2. Select **"External"** user type (unless you have a Google Workspace account)
3. Click **"CREATE"**
4. Fill in the required information:

   **App Information:**
   - **App name**: `Email Archive`
   - **User support email**: Your email address
   - **App logo**: (optional, skip for now)

   **App Domain (optional):**
   - Leave blank for local development

   **Developer contact information:**
   - **Email addresses**: Your email address

5. Click **"SAVE AND CONTINUE"**

6. **Scopes** page:
   - Click **"ADD OR REMOVE SCOPES"**
   - Search for and select: `https://www.googleapis.com/auth/gmail.readonly`
   - Click **"UPDATE"**
   - Click **"SAVE AND CONTINUE"**

7. **Test users** page:
   - Click **"ADD USERS"**
   - Enter your Gmail address (the one you want to archive emails from)
   - Click **"ADD"**
   - Click **"SAVE AND CONTINUE"**

8. Review the summary and click **"BACK TO DASHBOARD"**

## Step 4: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** > **"Credentials"**
2. Click **"CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**
4. Configure the credentials:
   - **Application type**: Select **"Web application"**
   - **Name**: `Email Archive OAuth Client`

   **Authorized JavaScript origins:**
   - Click **"ADD URI"**
   - Add: `http://localhost:3001`

   **Authorized redirect URIs:**
   - Click **"ADD URI"**
   - Add: `http://localhost:3001/api/auth/gmail/callback`

5. Click **"CREATE"**

## Step 5: Save Your Credentials

After creating the OAuth client, a popup will appear with your credentials:

1. **Copy the Client ID** - it looks like: `xxxxx.apps.googleusercontent.com`
2. **Copy the Client Secret** - it looks like: `GOCSPX-xxxxx`
3. You can also download the JSON file for backup (click "DOWNLOAD JSON")
4. Click **"OK"**

> **Note:** You can always access these credentials later by going to "APIs & Services" > "Credentials" and clicking on your OAuth client name.

## Step 6: Update Backend .env File

Now update your backend `.env` file with the credentials:

1. Open `/Users/michaelroy/Development/email_archive_2026/backend/.env`
2. Update the following lines:

```bash
GMAIL_CLIENT_ID=your_actual_client_id_here.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_actual_client_secret_here
GMAIL_REDIRECT_URI=http://localhost:3001/api/auth/gmail/callback
```

Replace `your_actual_client_id_here` and `your_actual_client_secret_here` with the values you copied.

## Step 7: Verify Setup

Your `.env` file should now look something like this:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Gmail API Configuration
GMAIL_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-AbCdEfGhIjKlMnOpQrStUvWx
GMAIL_REDIRECT_URI=http://localhost:3001/api/auth/gmail/callback

# Storage Configuration
STORAGE_ROOT=/Users/michaelroy/Development/email_archive_2026/backend/storage
IMAGE_BASE_URL=http://localhost:3001/api/images

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

## Important Notes

### Testing Mode
Your app is currently in **Testing** mode, which means:
- Only test users you added can authenticate
- You'll see a warning screen saying "This app isn't verified" - click "Continue"
- You can add up to 100 test users

### Publishing Your App (Optional - For Production)
If you want anyone to use your app, you'll need to:
1. Submit your app for verification
2. This requires privacy policy, terms of service, and other documentation
3. For personal use, staying in Testing mode is fine

### Token Storage
The Gmail API will generate:
- **Access token**: Short-lived (1 hour), used for API requests
- **Refresh token**: Long-lived, used to get new access tokens

Our backend will store these tokens in `backend/config/gmail-tokens.json` after first authentication.

## Troubleshooting

### "Redirect URI mismatch" error
- Make sure the redirect URI in Google Cloud Console exactly matches: `http://localhost:3001/api/auth/gmail/callback`
- No trailing slash
- Must be HTTP (not HTTPS) for local development
- Port must match (3001)

### "Access blocked: This app's request is invalid"
- Make sure you've configured the OAuth consent screen
- Make sure you've added the Gmail API scope
- Make sure your email is added as a test user

### "This app isn't verified" warning
- This is normal for apps in Testing mode
- Click "Advanced" then "Go to Email Archive (unsafe)" to continue
- For personal use, this is fine

## Next Steps

Once you've completed this setup:
1. ✅ Your Gmail API credentials are configured
2. ✅ Your backend `.env` file is updated
3. ✅ You're ready to implement and test the Gmail service

You can now proceed with implementing the Gmail authentication flow in the backend!

## Quick Checklist

- [ ] Created Google Cloud Project
- [ ] Enabled Gmail API
- [ ] Configured OAuth consent screen
- [ ] Added test user (your Gmail address)
- [ ] Created OAuth 2.0 credentials
- [ ] Added redirect URI: `http://localhost:3001/api/auth/gmail/callback`
- [ ] Copied Client ID and Client Secret
- [ ] Updated backend `.env` file with credentials
- [ ] Verified `.env` file has correct values

## Useful Links

- [Google Cloud Console](https://console.cloud.google.com/)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [OAuth 2.0 Scopes](https://developers.google.com/gmail/api/auth/scopes)
