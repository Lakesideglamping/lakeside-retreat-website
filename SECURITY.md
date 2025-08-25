# SECURITY SETUP - CRITICAL

## IMMEDIATE ACTION REQUIRED

Your admin system currently has hardcoded credentials that MUST be changed immediately in production.

### 1. SET ENVIRONMENT VARIABLES ON RENDER

Go to your Render dashboard and set these environment variables:

```
ADMIN_USERNAME=your_secure_admin_username
ADMIN_PASSWORD=your_very_secure_password_123!
JWT_SECRET=random_32_character_string_here_change_this_immediately
NODE_ENV=production
```

### 2. GENERATE SECURE VALUES

**For JWT_SECRET**, use a random 32+ character string. You can generate one with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**For ADMIN_PASSWORD**, use a strong password with:
- At least 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Not a dictionary word

### 3. CURRENT VULNERABILITIES FIXED

✅ Disabled debug endpoints in production  
✅ Removed hardcoded credentials from public endpoints  
✅ Added environment variable support  
✅ Hidden credential details in error messages  

### 4. REMAINING SECURITY RECOMMENDATIONS

- [ ] Set up HTTPS-only cookies
- [ ] Add brute force protection
- [ ] Implement password hashing (bcrypt)
- [ ] Add session expiration
- [ ] Set up audit logging
- [ ] Regular security updates

### 5. URGENT: CHANGE CREDENTIALS NOW

The current default credentials (lakesideadmin/LakesideAdmin2025) are publicly visible in your codebase. Change them immediately in your Render environment variables.

## NEVER COMMIT REAL CREDENTIALS TO GIT

Always use environment variables for sensitive data.