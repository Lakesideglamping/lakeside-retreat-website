// Simplified server for Render.com deployment
const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const session = require('express-session');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Import reviews system
const { router: reviewsRouter, db } = require('./reviews-api.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Titan Email (Nodemailer) configuration
let transporter = null;

if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false // Allow self-signed certificates
    }
  });
  console.log('📧 Titan Email configured for delivery');
} else {
  console.log('⚠️  Email credentials not found - emails will be logged only');
}

// Email configuration
const EMAIL_CONFIG = {
  from: process.env.FROM_EMAIL || 'info@lakesideretreat.co.nz',
  to: 'info@lakesideretreat.co.nz', // Where form submissions should be sent
  replyTo: process.env.FROM_EMAIL || 'info@lakesideretreat.co.nz'
};

// Basic middleware
app.use(cors({
  credentials: true,
  origin: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Session middleware for admin authentication
app.use(session({
  secret: process.env.SESSION_SECRET || 'lakeside-retreat-admin-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static files
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  } else {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required',
      redirect: '/admin/login'
    });
  }
}

// Admin authentication endpoints
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password required' 
      });
    }

    // Check admin user in database
    db.get('SELECT * FROM admin_users WHERE username = ?', [username], async (err, admin) => {
      if (err) {
        console.error('Database error:', err.message);
        return res.status(500).json({ 
          success: false, 
          error: 'Login system error' 
        });
      }

      if (!admin) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid credentials' 
        });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, admin.password_hash);
      if (!validPassword) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid credentials' 
        });
      }

      // Create session
      req.session.adminId = admin.id;
      req.session.adminUsername = admin.username;
      req.session.adminRole = admin.role;

      // Update last login
      db.run('UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [admin.id]);

      res.json({ 
        success: true, 
        message: 'Login successful',
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role
        }
      });
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Login failed' 
    });
  }
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ 
        success: false, 
        error: 'Logout failed' 
      });
    }
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  });
});

app.get('/api/admin/check', (req, res) => {
  if (req.session && req.session.adminId) {
    res.json({ 
      authenticated: true,
      admin: {
        id: req.session.adminId,
        username: req.session.adminUsername,
        role: req.session.adminRole
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Reviews API endpoints (public endpoints remain unprotected)
app.use('/api/reviews', reviewsRouter);

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve other static files
app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'robots.txt'));
});
app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(__dirname, 'sitemap.xml'));
});

// Review submission page
app.get('/submit-review', (req, res) => {
  res.sendFile(path.join(__dirname, 'submit-review.html'));
});

// Admin login page
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-login.html'));
});

// Protected admin review management
app.get('/admin/reviews', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-reviews.html'));
});

// Protected review import page
app.get('/admin/import', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'import-reviews.html'));
});

// Public reviews page
app.get('/reviews', (req, res) => {
  res.sendFile(path.join(__dirname, 'reviews.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'lakeside-retreat'
  });
});

// Accommodation prices endpoint
app.get('/api/accommodation/prices', (req, res) => {
  res.json({
    pinot: 498,
    rose: 498,
    cottage: 245
  });
});

// Basic booking endpoint (you can expand this)
app.post('/api/booking/create', async (req, res) => {
  try {
    // Add your booking logic here
    console.log('Booking request:', req.body);
    res.json({ 
      success: true, 
      message: 'Booking endpoint ready',
      data: req.body 
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Booking processing error' 
    });
  }
});

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  try {
    console.log('Contact form submission:', req.body);
    
    const { name, email, phone, subject, message, timestamp } = req.body;
    
    // Validate required fields
    if (!name || !email || !message || !subject) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Create email content
    const emailSubject = `New Contact Form: ${subject} - ${name}`;
    const emailBody = `
New contact form submission from Lakeside Retreat website:

Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}
Subject: ${subject}
Submitted: ${timestamp || new Date().toISOString()}

Message:
${message}

---
This email was sent from the Lakeside Retreat contact form.
Reply directly to this email to respond to ${name} at ${email}.
    `;
    
    // Email options
    const mailOptions = {
      from: EMAIL_CONFIG.from,
      to: EMAIL_CONFIG.to,
      replyTo: email, // Reply will go directly to the person who submitted the form
      subject: emailSubject,
      text: emailBody,
      html: emailBody.replace(/\n/g, '<br>')
    };
    
    // Try to send email via Titan
    if (transporter) {
      try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent via Titan for contact form from ${name} (${email})`);
        
        res.json({ 
          success: true, 
          message: 'Thank you for your message! We\'ll get back to you within 4 hours during business hours.' 
        });
      } catch (emailError) {
        console.error('❌ Titan email sending failed:', emailError.message);
        
        // Still return success to user but log the email failure
        res.json({ 
          success: true, 
          message: 'Thank you for your message! We\'ve received your submission and will get back to you soon.',
          emailWarning: 'Email delivery may be delayed'
        });
      }
    } else {
      // No email service configured - just log and return success
      console.log(`📝 Contact form logged (no email service): ${name} (${email}) - Subject: ${subject}`);
      console.log(`📝 Message: ${message}`);
      
      res.json({ 
        success: true, 
        message: 'Thank you for your message! We\'ve received your submission and will get back to you soon.'
      });
    }
    
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'There was an error processing your message. Please try again or email us directly at info@lakesideretreat.co.nz' 
    });
  }
});

// Catch all route - serve index.html for client-side routing (but exclude admin routes)
app.get('*', (req, res) => {
  // Don't catch admin routes
  if (req.path.startsWith('/admin') || req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Lakeside Retreat server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});