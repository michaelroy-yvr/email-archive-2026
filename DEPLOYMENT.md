# Deployment Guide - Email Archive 2026

This guide walks you through deploying the Email Archive application to Coolify with PostgreSQL and setting up Cloudflare Tunnels.

## Prerequisites

- Coolify instance running at `hosting.michaelroy.ca`
- Domain configured in Cloudflare: `michaelroy.ca`
- Cloudflare Tunnel already set up
- GitHub repository: `https://github.com/michaelroy-yvr/email-archive-2026`

## Part 1: Prepare Your Application

### 1.1 Install PostgreSQL Dependency

```bash
cd backend
npm install pg
```

### 1.2 Create Production Environment File

Create `.env.production` in the project root with these variables:

```env
# Database
POSTGRES_PASSWORD=<generate-strong-password>

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=<generate-strong-secret>

# Gmail OAuth (from Google Cloud Console)
GMAIL_CLIENT_ID=your-client-id
GMAIL_CLIENT_SECRET=your-client-secret

# OpenAI API Key
OPENAI_API_KEY=your-openai-key
```

**Important**: Add `.env.production` to your `.gitignore`!

### 1.3 Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to your project → APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add authorized redirect URI:
   ```
   https://emailarchive.michaelroy.ca/api/auth/gmail/callback
   ```
5. Save changes

### 1.4 Commit and Push Changes

```bash
git add docker-compose.yml backend/package.json backend/package-lock.json
git commit -m "Add PostgreSQL support for production deployment"
git push origin main
```

## Part 2: Deploy to Coolify

### 2.1 Create New Project in Coolify

1. Navigate to `https://hosting.michaelroy.ca`
2. Click **+ New** → **Project**
3. Name: `Email Archive`
4. Click **Create**

### 2.2 Add Application

1. Inside your new project, click **+ New Resource**
2. Select **Docker Compose**
3. Click **Continue**

### 2.3 Configure Source

1. **Source**: Select **Git Repository**
2. **Repository URL**: `https://github.com/michaelroy-yvr/email-archive-2026`
3. **Branch**: `main`
4. **Base Directory**: Leave blank (root)
5. **Docker Compose Location**: `docker-compose.yml`
6. Click **Continue**

### 2.4 Configure Environment Variables

In Coolify, add these environment variables:

```
POSTGRES_PASSWORD=<your-strong-password>
JWT_SECRET=<your-jwt-secret>
GMAIL_CLIENT_ID=<your-gmail-client-id>
GMAIL_CLIENT_SECRET=<your-gmail-client-secret>
OPENAI_API_KEY=<your-openai-api-key>
```

**Pro tip**: Mark `POSTGRES_PASSWORD`, `JWT_SECRET`, `GMAIL_CLIENT_SECRET`, and `OPENAI_API_KEY` as **secret** so they're not displayed in logs.

### 2.5 Configure Domains

1. In the application settings, go to **Domains**
2. Click **+ Add Domain**
3. Enter: `emailarchive.michaelroy.ca`
4. Save

### 2.6 Deploy

1. Click **Deploy** button
2. Wait for build to complete (this may take 5-10 minutes on first deploy)
3. Monitor the deployment logs for any errors

## Part 3: Set Up Cloudflare Tunnel

### 3.1 Get Coolify Internal URL

After deployment, Coolify will provide an internal URL like:
- `http://emailarchive-xyz:3001` (check in Coolify's network settings)

Note this down - you'll need it for the tunnel configuration.

### 3.2 Configure Cloudflare Tunnel

1. Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com)
2. Navigate to **Networks** → **Tunnels**
3. Click on your existing tunnel
4. Go to **Public Hostname** tab
5. Click **+ Add a public hostname**

Configure as follows:
- **Subdomain**: `emailarchive`
- **Domain**: `michaelroy.ca`
- **Type**: `HTTP`
- **URL**: `emailarchive:3001` (or the internal Docker network name Coolify assigns)

6. **Additional Settings**:
   - Enable **No TLS Verify** (since internal connection is HTTP)
   - Enable **HTTP Host Header**: `emailarchive.michaelroy.ca`

7. Click **Save hostname**

### 3.3 Alternative: Direct Coolify Proxy

If your Coolify instance is already accessible via Cloudflare Tunnel, you can:

1. Use Coolify's built-in proxy
2. Set the tunnel to point to your Coolify instance
3. Let Coolify handle the routing based on the domain

## Part 4: Database Migration (One-Time Setup)

### 4.1 Access Application Container

```bash
# SSH into your Proxmox server
ssh user@your-proxmox-server

# Find the container ID
docker ps | grep emailarchive

# Access the container
docker exec -it <container-id> sh
```

### 4.2 Initialize Database Schema

```bash
cd /app/backend
node src/config/database.js
```

The PostgreSQL schema will be automatically created on first run.

### 4.3 (Optional) Migrate Data from SQLite

If you have existing data in SQLite you want to migrate:

```bash
# This would require a custom migration script
# For now, start fresh with PostgreSQL
```

## Part 5: Verify Deployment

### 5.1 Check Application Health

1. Visit `https://emailarchive.michaelroy.ca`
2. You should see the Email Archive login page
3. Click **Login / Sign Up** and create the first user (you'll be admin)

### 5.2 Test Gmail Authentication

1. Click **Connect Gmail** (as admin)
2. Authenticate with Google
3. You should be redirected back successfully

### 5.3 Test Email Sync

1. Click **Sync Emails**
2. Monitor the sync process
3. Verify emails appear in the database

## Part 6: Security Best Practices

### 6.1 Enable Rate Limiting

Consider adding rate limiting middleware to prevent abuse (already included if using `express-rate-limit`)

### 6.2 Regular Backups

Set up automated backups for PostgreSQL:

```bash
# In Coolify, configure backup schedule for postgres_data volume
```

### 6.3 Monitor Logs

Regularly check application logs in Coolify for:
- Failed login attempts
- API errors
- Database issues

### 6.4 Update SSL/TLS

Cloudflare automatically provides SSL. Ensure:
- **SSL/TLS mode** in Cloudflare is set to **Full** or **Full (strict)**
- Certificate is valid

## Troubleshooting

### Issue: Container Won't Start

**Check logs:**
```bash
docker logs <container-id>
```

Common causes:
- Missing environment variables
- Database connection failure
- Port already in use

### Issue: Can't Access via Domain

**Verify:**
1. DNS is propagating (use `dig emailarchive.michaelroy.ca`)
2. Cloudflare Tunnel is running
3. Domain is correctly configured in Coolify

### Issue: Gmail OAuth Fails

**Check:**
1. Redirect URI matches exactly in Google Cloud Console
2. OAuth client is not restricted to localhost
3. Environment variables are correctly set

### Issue: Database Connection Error

**Verify:**
1. PostgreSQL container is running: `docker ps`
2. Credentials match in environment variables
3. Database name exists

## Maintenance

### Update Application

1. Push changes to GitHub
2. In Coolify, click **Redeploy**
3. Monitor deployment logs

### Backup Database

```bash
# Manual backup
docker exec <postgres-container> pg_dump -U emailarchive emailarchive > backup.sql

# Restore from backup
cat backup.sql | docker exec -i <postgres-container> psql -U emailarchive emailarchive
```

### View Logs

```bash
# Application logs
docker logs -f <emailarchive-container>

# PostgreSQL logs
docker logs -f <postgres-container>
```

## Support

For issues:
- Check Coolify documentation: https://coolify.io/docs
- Check Cloudflare Tunnel docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- Application logs in Coolify dashboard

---

Created: January 2026
