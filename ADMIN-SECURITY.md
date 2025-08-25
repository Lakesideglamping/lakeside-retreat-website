# Admin Security Setup - Lakeside Retreat Review System

## 🔐 Authentication Overview

The review management system now has secure admin authentication protecting all administrative functions.

## 🚀 Quick Start

1. **Setup Admin User** (if not done):
   ```bash
   node setup-admin.js
   ```

2. **Start Server**:
   ```bash
   npm start
   ```

3. **Access Admin Panel**:
   - URL: `http://localhost:10000/admin/login`
   - Username: `sandy`
   - Password: `lakeside2024`

## 🛡️ Security Features

### Session-Based Authentication
- Secure HTTP sessions with 24-hour expiration
- Automatic logout on browser close
- Session validation on all admin routes

### Protected Endpoints
All admin API endpoints require authentication:
- `GET /api/reviews/admin/all` - View all reviews
- `POST /api/reviews/admin/moderate/:id` - Approve/reject reviews
- `POST /api/reviews/admin/feature/:id` - Feature reviews
- `POST /api/reviews/admin/reply/:id` - Add admin replies
- `POST /api/reviews/admin/notes/:id` - Update admin notes

### Password Security
- Bcrypt hashing with 10 salt rounds
- Database storage of hashed passwords only
- No plain text password storage

### Access Control
- Authentication checks on page load
- Automatic redirect to login if unauthorized
- Protected admin dashboard routes

## 📱 User Experience

### Login Process
1. Navigate to `/admin/login`
2. Enter credentials
3. Automatic redirect to review dashboard
4. Session maintained for 24 hours

### Admin Dashboard
- User info displayed in header
- Logout button always accessible
- All review management functions protected
- Seamless authentication checks

### Logout
- One-click logout button
- Session destruction
- Automatic redirect to login page

## 🔧 Configuration

### Environment Variables
```
SESSION_SECRET=your-session-secret-here
```

### Database Setup
Admin users are stored in the `admin_users` table:
- `id` - Auto-increment primary key
- `username` - Unique admin username
- `email` - Admin email address
- `password_hash` - Bcrypt hashed password
- `role` - Admin role (default: 'admin')
- `last_login` - Timestamp of last login
- `created_at` - Account creation timestamp

## 🚨 Production Recommendations

### Immediate Actions
1. **Change Default Password**:
   - Login with default credentials
   - Update password in database or create new user

2. **Set Secure Session Secret**:
   ```bash
   export SESSION_SECRET="your-very-secure-random-string-here"
   ```

3. **Enable HTTPS**:
   - Update session config: `cookie: { secure: true }`
   - Use SSL certificates in production

### Security Enhancements
- Implement password change functionality
- Add failed login attempt tracking
- Enable two-factor authentication
- Add admin user management interface
- Implement role-based permissions
- Add audit logging for admin actions

## 🎯 What's Protected

✅ **Admin Dashboard** - `/admin/reviews`
✅ **Review Moderation** - Approve/reject/feature reviews
✅ **Admin Replies** - Public responses to reviews  
✅ **Admin Notes** - Internal review notes
✅ **Review Statistics** - Admin view of all stats

❌ **Public Endpoints** - Still accessible:
- Guest review submissions (`/submit-review`)
- Public review display (`/reviews`)
- Review statistics (`/api/reviews/stats`)

## 🔍 Monitoring

### Login Events
- Successful logins logged to console
- Failed login attempts tracked
- Last login timestamp updated

### Session Management
- Session creation/destruction logged
- 24-hour automatic expiration
- Browser close triggers logout

## 📞 Support

For security issues or questions:
- Email: info@lakesideretreat.co.nz
- Check server console logs for authentication errors
- Verify database connectivity for login issues

---

**Status**: ✅ Security implementation complete and active