# Data Backup Instructions

This document provides instructions for backing up all critical data in the Email Archive application.

## What to Back Up

1. **SQLite Database** - Contains all emails, organizations, and metadata
2. **Downloaded Images** - Locally stored email images
3. **Gmail OAuth Tokens** - Authentication credentials
4. **Environment Configuration** - `.env` files

## Backup Locations

### Database File
- **Location**: `backend/emails.db`
- **Size**: Varies (grows with email count)
- **Contains**: All email metadata, organizations, images metadata, sync status

### Images Directory
- **Location**: `backend/storage/images/`
- **Size**: Varies (can be large)
- **Contains**: All downloaded email images

### OAuth Tokens
- **Location**: `backend/config/gmail-tokens.json`
- **Size**: ~1KB
- **Contains**: Gmail API refresh/access tokens
- **Security**: Keep secure - allows access to your Gmail

### Environment Files
- **Locations**:
  - `backend/.env`
  - `frontend/.env`
- **Contains**: Configuration and API credentials

## Backup Methods

### Method 1: Manual Backup (Recommended for Regular Backups)

Create a backup script:

```bash
#!/bin/bash
# backup.sh - Run this regularly to backup your data

BACKUP_DIR=~/email-archive-backups/$(date +%Y-%m-%d)
mkdir -p "$BACKUP_DIR"

# Backup database
cp /Users/michaelroy/Development/email_archive_2026/backend/emails.db "$BACKUP_DIR/"

# Backup OAuth tokens
cp /Users/michaelroy/Development/email_archive_2026/backend/config/gmail-tokens.json "$BACKUP_DIR/"

# Backup images (use rsync for efficiency)
rsync -av /Users/michaelroy/Development/email_archive_2026/backend/storage/ "$BACKUP_DIR/storage/"

# Backup environment files
cp /Users/michaelroy/Development/email_archive_2026/backend/.env "$BACKUP_DIR/backend.env"
cp /Users/michaelroy/Development/email_archive_2026/frontend/.env "$BACKUP_DIR/frontend.env" 2>/dev/null

echo "Backup completed: $BACKUP_DIR"
echo "Database size: $(du -h "$BACKUP_DIR/emails.db" | cut -f1)"
echo "Images size: $(du -sh "$BACKUP_DIR/storage" | cut -f1)"
```

Make it executable:
```bash
chmod +x backup.sh
```

Run it:
```bash
./backup.sh
```

### Method 2: Database-Only Quick Backup

```bash
# Quick database backup with timestamp
cp backend/emails.db backend/emails-backup-$(date +%Y%m%d-%H%M%S).db
```

### Method 3: Compressed Archive (For Long-term Storage)

```bash
# Create compressed backup including database and images
tar -czf email-archive-backup-$(date +%Y%m%d).tar.gz \
  backend/emails.db \
  backend/config/gmail-tokens.json \
  backend/storage/ \
  backend/.env \
  frontend/.env
```

### Method 4: Cloud Backup (Automated)

#### Using rsync to remote server:
```bash
rsync -avz \
  backend/emails.db \
  backend/storage/ \
  user@backup-server:/backups/email-archive/
```

#### Using rclone to cloud storage (Google Drive, Dropbox, etc.):
```bash
# Install rclone first: brew install rclone
# Configure: rclone config

# Backup to cloud
rclone sync backend/emails.db remote:email-archive/
rclone sync backend/storage/ remote:email-archive/storage/
```

## Automated Backup with Cron

Add to crontab for automatic daily backups:

```bash
# Edit crontab
crontab -e

# Add this line for daily backup at 2 AM:
0 2 * * * /path/to/backup.sh >> /path/to/backup.log 2>&1
```

## Restoration Instructions

### Restore Database
```bash
# Stop the backend server first
cp /path/to/backup/emails.db backend/emails.db
```

### Restore Images
```bash
# Stop the backend server first
rsync -av /path/to/backup/storage/ backend/storage/
```

### Restore OAuth Tokens
```bash
cp /path/to/backup/gmail-tokens.json backend/config/gmail-tokens.json
```

## Database Export to SQL

Export database to SQL format (portable):
```bash
sqlite3 backend/emails.db .dump > email-archive-backup-$(date +%Y%m%d).sql
```

Restore from SQL:
```bash
sqlite3 backend/emails.db < email-archive-backup-YYYYMMDD.sql
```

## Backup Verification

Check backup integrity:
```bash
# Verify database isn't corrupted
sqlite3 /path/to/backup/emails.db "PRAGMA integrity_check;"

# Check file sizes
du -sh /path/to/backup/emails.db
du -sh /path/to/backup/storage/

# Count records
sqlite3 /path/to/backup/emails.db "SELECT COUNT(*) FROM emails;"
```

## Current Database Stats

Check your current data size:
```bash
cd /Users/michaelroy/Development/email_archive_2026/backend

# Database size
du -h emails.db

# Images size
du -sh storage/

# Email count
sqlite3 emails.db "SELECT COUNT(*) FROM emails;"

# Organization count
sqlite3 emails.db "SELECT COUNT(*) FROM organizations;"

# Image count
sqlite3 emails.db "SELECT COUNT(*) FROM images;"
```

## Backup Schedule Recommendations

- **Daily**: Database file (small, quick)
- **Weekly**: Database + Images (full backup)
- **Monthly**: Compressed archive for long-term storage
- **Before major changes**: Manual backup

## Security Notes

⚠️ **Important Security Considerations:**

1. **OAuth Tokens**: Keep `gmail-tokens.json` secure - it grants access to your Gmail
2. **Environment Files**: `.env` files may contain API keys and secrets
3. **Database**: Contains all your email metadata - keep private
4. **Encryption**: Consider encrypting backups if storing in cloud:
   ```bash
   # Encrypt backup
   gpg -c email-archive-backup.tar.gz

   # Decrypt
   gpg email-archive-backup.tar.gz.gpg
   ```

## Storage Requirements

Estimated storage needed:
- Database: ~1-5 MB per 1000 emails (varies with content)
- Images: Varies greatly depending on email images (can be GB)
- Configuration: < 1 MB

Example for 1000 emails with images: ~100-500 MB total
