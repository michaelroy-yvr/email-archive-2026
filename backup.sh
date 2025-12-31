#!/bin/bash
# Email Archive Backup Script
# Backs up database, images, and configuration

# Configuration
BACKUP_BASE_DIR=~/email-archive-backups
PROJECT_DIR="/Users/michaelroy/Development/email_archive_2026"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_DIR="$BACKUP_BASE_DIR/$TIMESTAMP"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "📦 Starting backup..."
echo "Backup location: $BACKUP_DIR"
echo ""

# Backup database
echo "💾 Backing up database..."
if [ -f "$PROJECT_DIR/backend/emails.db" ]; then
    cp "$PROJECT_DIR/backend/emails.db" "$BACKUP_DIR/emails.db"
    DB_SIZE=$(du -h "$BACKUP_DIR/emails.db" | cut -f1)
    DB_EMAILS=$(sqlite3 "$BACKUP_DIR/emails.db" "SELECT COUNT(*) FROM emails;" 2>/dev/null || echo "N/A")
    echo "   ✓ Database backed up ($DB_SIZE, $DB_EMAILS emails)"
else
    echo "   ⚠ Database not found"
fi

# Backup OAuth tokens
echo "🔑 Backing up OAuth tokens..."
if [ -f "$PROJECT_DIR/backend/config/gmail-tokens.json" ]; then
    cp "$PROJECT_DIR/backend/config/gmail-tokens.json" "$BACKUP_DIR/gmail-tokens.json"
    echo "   ✓ OAuth tokens backed up"
else
    echo "   ⚠ OAuth tokens not found"
fi

# Backup images using rsync
echo "🖼️  Backing up images..."
if [ -d "$PROJECT_DIR/backend/storage" ]; then
    rsync -a "$PROJECT_DIR/backend/storage/" "$BACKUP_DIR/storage/" 2>/dev/null
    IMG_SIZE=$(du -sh "$BACKUP_DIR/storage" 2>/dev/null | cut -f1)
    IMG_COUNT=$(find "$BACKUP_DIR/storage" -type f 2>/dev/null | wc -l | tr -d ' ')
    echo "   ✓ Images backed up ($IMG_SIZE, $IMG_COUNT files)"
else
    echo "   ⚠ Storage directory not found"
fi

# Backup environment files
echo "⚙️  Backing up configuration..."
if [ -f "$PROJECT_DIR/backend/.env" ]; then
    cp "$PROJECT_DIR/backend/.env" "$BACKUP_DIR/backend.env"
    echo "   ✓ Backend config backed up"
fi
if [ -f "$PROJECT_DIR/frontend/.env" ]; then
    cp "$PROJECT_DIR/frontend/.env" "$BACKUP_DIR/frontend.env"
    echo "   ✓ Frontend config backed up"
fi

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

echo ""
echo "✅ Backup completed successfully!"
echo "📍 Location: $BACKUP_DIR"
echo "📊 Total size: $TOTAL_SIZE"
echo ""

# Clean up old backups (keep last 7)
echo "🧹 Cleaning up old backups (keeping last 7)..."
cd "$BACKUP_BASE_DIR"
ls -t | tail -n +8 | xargs -I {} rm -rf {}
BACKUP_COUNT=$(ls -1 | wc -l | tr -d ' ')
echo "   ✓ $BACKUP_COUNT backups retained"
echo ""

# Create a "latest" symlink
ln -sf "$BACKUP_DIR" "$BACKUP_BASE_DIR/latest"

echo "💡 Restore with: cp -r $BACKUP_BASE_DIR/latest/* $PROJECT_DIR/backend/"
