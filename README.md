# Email Archive 2026

A full-stack email archive application for managing and organizing Gmail emails with automatic organization assignment, analytics dashboard, and bulk management tools.

## Features

- 📧 **Email Management**: Browse, search, and filter archived emails
- 🏢 **Organization Assignment**: Automatically assign emails to organizations based on sender domain
- 📊 **Analytics Dashboard**: Comprehensive analytics with charts and visualizations
- 👥 **Bulk Operations**: Bulk assign emails by sender
- 🔄 **Gmail Sync**: Sync emails from Gmail with customizable queries
- 💾 **Image Archiving**: Download and store email images locally
- ⌨️ **Keyboard Shortcuts**: Powerful keyboard navigation and shortcuts for efficiency
- 🏷️ **Smart Tagging**: Tag emails as Graphic Email, Donation Matching, or Supporter Record
- ❤️ **Favorites & Collections**: Community favorites and personal collections
- 🔐 **User Authentication**: Secure login with admin and regular user roles

## Keyboard Shortcuts

### Navigation
| Key | Action |
|-----|--------|
| `D` | Go to Dashboard |
| `E` | Go to Emails view |
| `O` | Go to Organizations view |
| `A` | Go to Analytics view |
| `J` or `↓` | Navigate to next email in list |
| `K` or `↑` | Navigate to previous email in list |
| `Enter` | Open selected email |
| `Ctrl/Cmd + F` | Focus search box |
| `Delete` or `Backspace` | Clear search (when search has content) |

### Email View Actions
| Key | Action |
|-----|--------|
| `M` | Toggle mobile preview mode |
| `Shift + O` | Focus organization dropdown |

### Category Assignment (Email View)
| Key | Category |
|-----|----------|
| `1` | Fundraising 💰 |
| `2` | Event 📅 |
| `3` | Newsletter 📰 |
| `4` | Share 📢 |
| `5` | Action ✊ |
| `6` | Other 📋 |

### Tag Toggles (Admin Only - Email View)
| Key | Tag |
|-----|-----|
| `G` | Toggle Graphic Email 🖼️ |
| `T` | Toggle Donation Matching 🔄 |
| `S` | Toggle Supporter Record 📊 |
| `C` | Toggle Contest 🏆 |

## Tech Stack

### Backend
- Node.js + Express
- SQLite (better-sqlite3)
- Gmail API
- OAuth2 authentication

### Frontend
- React 19
- Recharts for visualizations
- Axios for API calls

## Project Structure

```
email_archive_2026/
├── backend/
│   ├── src/
│   │   ├── controllers/      # API endpoint handlers
│   │   ├── routes/           # Express routes
│   │   ├── services/         # Business logic (Gmail, email processing)
│   │   ├── config/           # Database and configuration
│   │   ├── db/               # Database schema
│   │   └── utils/            # Utility functions
│   ├── bulk-sync.js          # CLI sync script
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── services/         # API service layer
│   │   └── App.js            # Main application
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js 14+
- Gmail API credentials

### Backend Setup

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Configure environment variables (create `.env`):
   ```
   PORT=3001
   STORAGE_ROOT=./storage
   IMAGE_BASE_URL=/api/emails
   GMAIL_CLIENT_ID=your_client_id
   GMAIL_CLIENT_SECRET=your_client_secret
   GMAIL_REDIRECT_URI=http://localhost:3001/auth/gmail/callback
   ```

3. Start the server:
   ```bash
   npm start
   ```

### Frontend Setup

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Configure environment variables (create `.env`):
   ```
   REACT_APP_API_URL=http://localhost:3001/api
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## CLI Tools

### Bulk Sync Emails
```bash
cd backend
node bulk-sync.js [maxEmails] [query]

# Examples:
node bulk-sync.js 100                              # Sync 100 emails
node bulk-sync.js 200 "category:promotions"        # Sync 200 promotional emails
node bulk-sync.js 50 "is:unread"                   # Sync 50 unread emails
```

## Database Schema

- **emails**: Email metadata and content
- **organizations**: Organizations with email domains
- **images**: Downloaded image metadata
- **sync_status**: Gmail sync tracking

## API Endpoints

### Emails
- `GET /api/emails` - List emails with filters
- `GET /api/emails/:id` - Get single email
- `GET /api/emails/stats` - Email statistics
- `GET /api/emails/senders` - List unique senders

### Analytics
- `GET /api/emails/analytics/summary` - Dashboard summary
- `GET /api/emails/analytics/growth` - Email growth over time
- `GET /api/emails/analytics/by-organization` - Organization distribution
- `GET /api/emails/analytics/storage` - Storage metrics

### Organizations
- `GET /api/organizations` - List all organizations
- `POST /api/organizations` - Create organization
- `PUT /api/organizations/:id` - Update organization
- `DELETE /api/organizations/:id` - Delete organization
- `POST /api/organizations/bulk-assign` - Bulk assign by sender

## Data Backup

See [BACKUP.md](./BACKUP.md) for detailed backup instructions.

## License

Private project - All rights reserved
