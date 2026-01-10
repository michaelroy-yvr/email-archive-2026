# Deploy to Coolify - Quick Start Guide

This guide walks you through deploying Email Archive 2026 to your Coolify instance with Cloudflare Tunnel.

## Prerequisites Checklist

- [ ] Coolify running at `hosting.michaelroy.ca`
- [ ] GitHub repo: `https://github.com/michaelroy-yvr/email-archive-2026`
- [ ] Domain in Cloudflare: `michaelroy.ca`
- [ ] Cloudflare Tunnel configured
- [ ] Gmail OAuth credentials from Google Cloud Console

## Step 1: Update Google Cloud Console

**Before deployment**, update your OAuth redirect URI:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to: **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   ```
   https://emailarchive.michaelroy.ca/api/auth/gmail/callback
   ```
5. Click **Save**

## Step 2: Generate Secrets

Generate a strong JWT secret:

```bash
openssl rand -base64 32
```

Save this output - you'll need it in the next step.

## Step 3: Create Resource in Coolify

### 3.1 Create New Project

1. Navigate to `https://hosting.michaelroy.ca`
2. Click **+ New** → **Project**
3. Name: `Email Archive`
4. Click **Create**

### 3.2 Add Docker Compose Application

1. Click **+ New Resource**
2. Select **Docker Compose**
3. Click **Continue**

### 3.3 Configure Git Source

- **Git Repository URL**: `https://github.com/michaelroy-yvr/email-archive-2026`
- **Branch**: `main`
- **Docker Compose Location**: `docker-compose.yml`
- Click **Continue**

### 3.4 Set Environment Variables

In the Environment section, add these variables:

| Variable | Value | Mark as Secret |
|----------|-------|----------------|
| `JWT_SECRET` | (value from openssl command) | ✅ Yes |
| `GMAIL_CLIENT_ID` | Your Gmail OAuth Client ID | ❌ No |
| `GMAIL_CLIENT_SECRET` | Your Gmail OAuth Client Secret | ✅ Yes |
| `OPENAI_API_KEY` | Your OpenAI API key | ✅ Yes |

**Tip**: Click the 🔒 icon next to secret values to hide them from logs.

### 3.5 Configure Network

1. Go to **Network** tab
2. Note the internal port: `3001`
3. Coolify will assign a container name like `emailarchive-xyz`

## Step 4: Deploy Application

1. Click **Deploy** button (top right)
2. Monitor build logs - first build takes ~5-10 minutes
3. Wait for status to show **Running** ✅

Common build issues:
- If build fails, check the logs for npm errors
- Ensure all environment variables are set
- Verify GitHub repo is accessible

## Step 5: Configure Cloudflare Tunnel

### Option A: Using Existing Tunnel

1. Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com)
2. Navigate to **Networks** → **Tunnels**
3. Click on your existing tunnel
4. Go to **Public Hostname** tab
5. Click **+ Add a public hostname**

Configure the hostname:

```
Subdomain: emailarchive
Domain: michaelroy.ca
Type: HTTP
URL: localhost:3001
```

**Important Settings**:
- ✅ Enable **No TLS Verify**
- ✅ Enable **HTTP Host Header**: `emailarchive.michaelroy.ca`

6. Click **Save hostname**

### Option B: Using Coolify's Built-in Proxy

If your Coolify instance already uses Cloudflare Tunnel:

1. In Coolify, go to **Domains** section
2. Add domain: `emailarchive.michaelroy.ca`
3. Coolify will handle the routing
4. Ensure your tunnel points to your Coolify instance

## Step 6: Verify Deployment

### 6.1 Test Application Access

1. Visit: `https://emailarchive.michaelroy.ca`
2. You should see the Email Archive homepage
3. Click **Login / Sign Up**

### 6.2 Create Admin User

1. Register a new account (first user becomes admin automatically)
2. You should be redirected to the dashboard
3. Verify you see "Admin" label next to your name

### 6.3 Test Gmail Sync

1. Click **Connect Gmail** button
2. Authenticate with Google
3. Should redirect back successfully
4. Click **Sync Emails**
5. Monitor sync progress
6. Verify emails appear in the Emails tab

### 6.4 Test Core Features

- [x] Login/Register works
- [x] Gmail OAuth works
- [x] Email sync works
- [x] Email list displays
- [x] Organization assignment works
- [x] Category assignment works
- [x] Tag toggles work
- [x] Collections feature works
- [x] Favorites feature works

## Step 7: Post-Deployment Configuration

### 7.1 Set Up Backups

In Coolify:
1. Go to your application → **Backups**
2. Enable automatic backups for `emailarchive_storage` volume
3. Set schedule: Daily at 2 AM
4. Retention: Keep 7 days

### 7.2 Monitor Application

Check logs regularly:
```bash
# In Coolify, go to Logs tab
# Or SSH into server and run:
docker logs -f <container-name>
```

Watch for:
- Error messages
- Failed login attempts
- Gmail API errors
- Database warnings

## Troubleshooting

### Application Won't Start

**Symptoms**: Container exits immediately

**Solutions**:
1. Check environment variables are set correctly
2. Review build logs for npm install errors
3. Verify `JWT_SECRET` is set
4. Check storage volume is created

### Can't Access via Domain

**Symptoms**: Domain shows "502 Bad Gateway" or timeout

**Solutions**:
1. Verify container is running: `docker ps`
2. Check Cloudflare Tunnel is active
3. Verify DNS is propagating: `dig emailarchive.michaelroy.ca`
4. Check port 3001 is exposed
5. Review Cloudflare Tunnel hostname configuration

### Gmail OAuth Fails

**Symptoms**: "redirect_uri_mismatch" error

**Solutions**:
1. Verify redirect URI in Google Cloud Console exactly matches:
   ```
   https://emailarchive.michaelroy.ca/api/auth/gmail/callback
   ```
2. Check `GMAIL_REDIRECT_URI` environment variable
3. Ensure no trailing slashes
4. Wait 5-10 minutes after Google Console changes

### Database Errors

**Symptoms**: "SQLITE_CANTOPEN" or similar

**Solutions**:
1. Check volume is mounted: `docker volume ls | grep emailarchive`
2. Verify permissions on storage directory
3. Check disk space on server
4. Restart container

### Slow Performance

**Solutions**:
1. Check server resources (CPU/RAM)
2. Review number of images downloaded
3. Consider cleaning old email images
4. Monitor database size

## Maintenance

### Update Application

When you push changes to GitHub:

1. In Coolify, click **Redeploy**
2. Or enable auto-deploy in settings
3. Monitor deployment logs
4. Verify application restarts successfully

### View Logs

```bash
# Application logs
docker logs -f emailarchive-xyz

# Last 100 lines
docker logs --tail 100 emailarchive-xyz

# Follow logs from specific time
docker logs --since 30m emailarchive-xyz
```

### Backup Database

```bash
# Manual backup via Coolify UI or:
docker cp emailarchive-xyz:/app/backend/storage/database ./backup-$(date +%Y%m%d)
```

### Restore from Backup

```bash
docker cp ./backup-20260110 emailarchive-xyz:/app/backend/storage/database
docker restart emailarchive-xyz
```

## Security Checklist

- [x] HTTPS enabled via Cloudflare
- [x] JWT secret is random and secure
- [x] Gmail OAuth credentials are secret
- [x] OpenAI API key is secret
- [ ] Regular backups configured
- [ ] Monitoring set up
- [ ] Firewall rules configured on server
- [ ] Coolify admin password is strong

## Next Steps

After successful deployment:

1. **Invite Users**: Share the URL with team members
2. **Sync Historical Emails**: Run full sync to import your email archive
3. **Create Organizations**: Set up organization records with email domains
4. **Configure Auto-Assignment**: Test subdomain matching works correctly
5. **Set Up Monitoring**: Consider adding uptime monitoring (e.g., UptimeRobot)

## Support

- **Coolify Docs**: https://coolify.io/docs
- **Cloudflare Tunnel Docs**: https://developers.cloudflare.com/cloudflare-one/
- **Application Issues**: Check GitHub Issues

---

**Deployment Date**: January 2026
**Application Version**: 1.0.0
**Database**: SQLite with Docker volume persistence
