-- Marketing Email Archive Database Schema
-- SQLite schema designed for future PostgreSQL migration

-- organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email_domain TEXT,
    type TEXT CHECK(type IN ('nonprofit', 'charity', 'political', 'commercial', 'labour_union')) NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
CREATE INDEX IF NOT EXISTS idx_organizations_domain ON organizations(email_domain);

-- emails table
CREATE TABLE IF NOT EXISTS emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gmail_message_id TEXT UNIQUE NOT NULL,
    gmail_thread_id TEXT,
    organization_id INTEGER,
    subject TEXT,
    from_address TEXT NOT NULL,
    from_name TEXT,
    to_address TEXT,
    date_received DATETIME NOT NULL,
    html_content TEXT,
    rewritten_html_content TEXT,
    text_content TEXT,
    labels TEXT,
    has_images BOOLEAN DEFAULT 0,
    images_downloaded BOOLEAN DEFAULT 0,
    image_download_attempts INTEGER DEFAULT 0,
    last_image_download_attempt DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_emails_gmail_id ON emails(gmail_message_id);
CREATE INDEX IF NOT EXISTS idx_emails_organization ON emails(organization_id);
CREATE INDEX IF NOT EXISTS idx_emails_date ON emails(date_received DESC);
CREATE INDEX IF NOT EXISTS idx_emails_from ON emails(from_address);
CREATE INDEX IF NOT EXISTS idx_emails_images_status ON emails(has_images, images_downloaded);

-- images table
CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_id INTEGER NOT NULL,
    original_url TEXT NOT NULL,
    local_path TEXT,
    file_size INTEGER,
    mime_type TEXT,
    width INTEGER,
    height INTEGER,
    download_success BOOLEAN DEFAULT 0,
    download_error TEXT,
    downloaded_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_images_email ON images(email_id);
CREATE INDEX IF NOT EXISTS idx_images_url ON images(original_url);
CREATE INDEX IF NOT EXISTS idx_images_download_status ON images(download_success);

-- sync_status table (tracks Gmail sync progress)
CREATE TABLE IF NOT EXISTS sync_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sync_type TEXT CHECK(sync_type IN ('initial', 'incremental')) NOT NULL,
    status TEXT CHECK(status IN ('running', 'completed', 'failed', 'paused')) NOT NULL,
    started_at DATETIME NOT NULL,
    completed_at DATETIME,
    emails_fetched INTEGER DEFAULT 0,
    emails_processed INTEGER DEFAULT 0,
    last_history_id TEXT,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_status_type ON sync_status(sync_type, status);
