# Security & Deployment Guide

## 🔒 Security Checklist

### Environment Variables (NEVER commit these)
- ✅ `.env` is in `.gitignore`
- ✅ Use `.env.example` as a template
- ✅ All sensitive credentials are in environment variables:
  - `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET`
  - `OPENAI_API_KEY`
  - `JWT_SECRET`

### Database Security
- ✅ Database files (`.db`, `.sqlite`) are in `.gitignore`
- ✅ User passwords are hashed with bcryptjs (10 rounds)
- ✅ JWT tokens expire after 30 days
- ⚠️ **For production**: Use a proper database (PostgreSQL) instead of SQLite

### API Security
- ✅ CORS configured to specific frontend URL
- ✅ JWT authentication for protected routes
- ✅ Admin-only routes check `isAdmin` flag
- ✅ Gmail OAuth tokens stored outside git
- ⚠️ **For production**: Implement rate limiting
- ⚠️ **For production**: Add HTTPS/SSL

### File Storage
- ✅ Uploaded images stored in `backend/storage/` (excluded from git)
- ✅ Gmail tokens in `gmail-tokens.json` (excluded from git)

## 🚀 Production Deployment Checklist

### Before Deployment

1. **Generate secure JWT secret**
   ```bash
   openssl rand -base64 32
   ```
   Add this to your production `.env` file

2. **Update environment variables**
   - Set `NODE_ENV=production`
   - Update `FRONTEND_URL` to your production domain
   - Update `GMAIL_REDIRECT_URI` to production callback URL
   - Set strong `JWT_SECRET`

3. **Build frontend**
   ```bash
   cd frontend
   npm run build
   ```

4. **Configure reverse proxy (nginx/Apache)**
   - Serve frontend build files
   - Proxy API requests to backend on port 3001
   - Enable HTTPS/SSL
   - Only expose ports 80 and 443

### Port Configuration

**Development:**
- Frontend: `http://localhost:3000` (React dev server)
- Backend: `http://localhost:3001` (Express API)

**Production:**
- Port 80/443 (HTTPS) - Reverse proxy serves frontend and proxies API
- Port 3001 - Backend (not exposed publicly, accessed via reverse proxy)

### Additional Security Measures

1. **Firewall Rules**
   ```bash
   # Only allow HTTP/HTTPS traffic
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

2. **Rate Limiting**
   ```bash
   npm install express-rate-limit
   ```
   Add to `backend/src/app.js`:
   ```javascript
   const rateLimit = require('express-rate-limit');

   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });

   app.use('/api/', limiter);
   ```

3. **Helmet.js for security headers**
   ```bash
   npm install helmet
   ```
   Add to `backend/src/app.js`:
   ```javascript
   const helmet = require('helmet');
   app.use(helmet());
   ```

4. **Database Migration to PostgreSQL**
   - SQLite is not recommended for production
   - Migrate to PostgreSQL for better concurrency and security

## 🔐 Password & Access Management

### User Passwords
- Minimum 8 characters recommended (enforce in frontend)
- Hashed with bcryptjs (salt rounds: 10)
- Never stored in plain text

### Admin Access
- First admin: `mikelroy@gmail.com`
- Admins can promote/demote other users
- Admin actions logged to console (consider audit log)

## 📝 Sensitive Files

**NEVER commit these:**
- `.env` - API keys and secrets
- `*.db`, `*.sqlite` - Database files
- `backend/config/gmail-tokens.json` - OAuth tokens
- `backend/storage/*` - User data and images

**Safe to commit:**
- `.env.example` - Template with placeholder values
- Migration scripts - No sensitive data
- Source code - No hardcoded credentials

## 🛡️ OWASP Top 10 Protection

- ✅ SQL Injection: Using parameterized queries
- ✅ Authentication: JWT with bcrypt password hashing
- ✅ Sensitive Data: Environment variables, .gitignore
- ⚠️ XML External Entities: Not applicable (no XML)
- ⚠️ Broken Access Control: Admin middleware checks
- ✅ Security Misconfiguration: CORS, environment-based config
- ⚠️ XSS: Using React (auto-escapes), iframe sandbox
- ⚠️ Insecure Deserialization: JSON only
- ⚠️ Components with Known Vulnerabilities: Run `npm audit`
- ⚠️ Insufficient Logging: Console logs (enhance for production)

## 🔍 Regular Maintenance

```bash
# Check for vulnerable dependencies
npm audit

# Update dependencies
npm update

# Review security advisories
npm audit fix
```

## 📞 Support

For security issues, contact: mikelroy@gmail.com
