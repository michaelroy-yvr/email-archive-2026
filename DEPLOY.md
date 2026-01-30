# Deployment Guide

This project deploys the frontend to GitHub Pages and the backend to a Proxmox LXC with Cloudflare Tunnel.

## Architecture

```
[GitHub Pages]                    [Proxmox LXC]
emailarchive.michaelroy.ca  -->   api.emailarchive.michaelroy.ca
       |                                   |
   React SPA                         Node.js API
                                          |
                                   Cloudflare Tunnel
```

---

## Frontend Deployment (GitHub Pages)

### Automatic Deployment

The frontend deploys automatically when you push changes to `main` that affect the `frontend/` directory.

The GitHub Actions workflow (`.github/workflows/deploy-frontend.yml`) handles:
- Building the React app with the production API URL
- Deploying to the `gh-pages` branch
- Setting the custom domain (CNAME)

### Manual Deployment

```bash
cd frontend
npm install --legacy-peer-deps
npm run deploy
```

### DNS Configuration

Add a CNAME record in Cloudflare DNS:

| Type  | Name         | Content                                    |
|-------|--------------|-------------------------------------------|
| CNAME | emailarchive | michaelroy-yvr.github.io                  |

### GitHub Pages Settings

1. Go to repo Settings → Pages
2. Source: Deploy from branch `gh-pages`
3. Custom domain: `emailarchive.michaelroy.ca`
4. Enforce HTTPS: Enabled

---

## Backend Deployment (Proxmox LXC)

### 1. Create LXC Container

In Proxmox:
- Template: Debian 12 or Ubuntu 22.04
- Resources: 1-2 CPU cores, 1-2GB RAM, 10GB+ disk
- Network: DHCP or static IP on your LAN

### 2. Initial Setup

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Create app directory
mkdir -p /opt/emailarchive
cd /opt/emailarchive
```

### 3. Deploy Application

Option A: Clone from GitHub
```bash
git clone https://github.com/michaelroy-yvr/email-archive-2026.git .
cd backend
npm ci --omit=dev
```

Option B: Copy from local machine
```bash
# From your local machine:
rsync -avz --exclude 'node_modules' --exclude '.env' \
  /path/to/email_archive_2026/backend/ \
  root@lxc-ip:/opt/emailarchive/backend/

# On the LXC:
cd /opt/emailarchive/backend
npm ci --omit=dev
```

### 4. Configure Environment

```bash
cp .env.example .env
nano .env
```

Update these values for production:

```env
# Server
PORT=3001
NODE_ENV=production

# Gmail API (update redirect URI for production)
GMAIL_CLIENT_ID=your_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_secret
GMAIL_REDIRECT_URI=https://api.emailarchive.michaelroy.ca/api/auth/gmail/callback

# Storage (use absolute paths)
STORAGE_ROOT=/opt/emailarchive/backend/storage
IMAGE_BASE_URL=https://api.emailarchive.michaelroy.ca/api/images

# Frontend URL (for CORS - handled in code, but good to set)
FRONTEND_URL=https://emailarchive.michaelroy.ca

# JWT Secret (generate a secure random string)
JWT_SECRET=<run: openssl rand -base64 32>

# OpenAI (for email classification)
OPENAI_API_KEY=sk-proj-...

# SMTP (optional, for contact form)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 5. Create Storage Directories

```bash
mkdir -p /opt/emailarchive/backend/storage/{database,images,html}
chown -R root:root /opt/emailarchive
```

### 6. Start with PM2

```bash
cd /opt/emailarchive/backend

# Start the app
pm2 start src/app.js --name emailarchive

# Save PM2 process list
pm2 save

# Enable PM2 startup on boot
pm2 startup
```

Useful PM2 commands:
```bash
pm2 logs emailarchive    # View logs
pm2 restart emailarchive # Restart app
pm2 stop emailarchive    # Stop app
pm2 monit                # Monitor dashboard
```

### 7. Configure Cloudflare Tunnel

On your LXC or a machine that can reach the LXC:

```bash
# Install cloudflared
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared.deb

# Authenticate with Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create emailarchive-api

# Configure tunnel
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << EOF
tunnel: emailarchive-api
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: api.emailarchive.michaelroy.ca
    service: http://localhost:3001
  - service: http_status:404
EOF

# Add DNS record (this creates the CNAME automatically)
cloudflared tunnel route dns emailarchive-api api.emailarchive.michaelroy.ca

# Run tunnel (test)
cloudflared tunnel run emailarchive-api

# Install as service
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

### 8. Update Google OAuth

In Google Cloud Console, add the production callback URL to your OAuth credentials:
- `https://api.emailarchive.michaelroy.ca/api/auth/gmail/callback`

---

## Verify Deployment

1. **Frontend**: Visit `https://emailarchive.michaelroy.ca`
2. **Backend health**: `curl https://api.emailarchive.michaelroy.ca/api/health`
3. **Check CORS**: Open browser console on frontend, verify no CORS errors

---

## Updating

### Frontend
Push to `main` branch - GitHub Actions will auto-deploy.

### Backend
```bash
cd /opt/emailarchive
git pull
cd backend
npm ci --omit=dev
pm2 restart emailarchive
```

---

## Backup

Important data to backup from the LXC:
- `/opt/emailarchive/backend/storage/database/emails.db` - SQLite database
- `/opt/emailarchive/backend/storage/images/` - Downloaded email images
- `/opt/emailarchive/backend/.env` - Environment configuration
