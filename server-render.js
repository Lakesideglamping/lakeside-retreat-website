// Secure server for Render.com deployment
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Security middleware
app.use(require('helmet')({
  contentSecurityPolicy: false // We handle CSP manually below
}));

// Rate limiting
const rateLimit = require('express-rate-limit');
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many attempts, please try again later.'
});

app.use(generalLimiter);

// Basic middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Input validation middleware
const validateInput = (req, res, next) => {
  // Basic input sanitization
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+\s*=/gi, '');
  };
  
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    const sanitized = {};
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        sanitized[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object') {
        sanitized[key] = sanitizeObject(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }
    return sanitized;
  };
  
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
};

app.use(validateInput);

// Content Security Policy that allows Stripe
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com https://www.clarity.ms; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; " +
    "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; " +
    "img-src 'self' data: https: blob:; " +
    "connect-src 'self' https://api.stripe.com https://www.google-analytics.com https://www.clarity.ms; " +
    "frame-src https://js.stripe.com https://hooks.stripe.com; " +
    "child-src https://js.stripe.com;"
  );
  next();
});

// Serve static files
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve admin pages
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin-dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-dashboard.html'));
});

// Serve other static files
app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'robots.txt'));
});
app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(__dirname, 'sitemap.xml'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'lakeside-retreat'
  });
});

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-change-in-production');
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

// ULTRA SIMPLE ADMIN LOGIN - HARDCODED FOR NOW
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('=== ADMIN LOGIN ATTEMPT ===');
    console.log('Received username:', username);
    console.log('Received password:', password);
    
    // SUPER SIMPLE - JUST ACCEPT THESE EXACT CREDENTIALS
    if (username === 'lakesideadmin' && password === 'LakesideAdmin2025') {
      console.log('LOGIN SUCCESS!');
      
      const token = jwt.sign(
        { username: 'lakesideadmin', role: 'admin' },
        'simple-jwt-secret-2025',
        { expiresIn: '24h' }
      );
      
      return res.json({ 
        token,
        message: 'Login successful',
        expiresIn: '24h'
      });
    } else {
      console.log('LOGIN FAILED - Credentials do not match');
      console.log('Expected username: lakesideadmin, Got:', username);
      console.log('Expected password: LakesideAdmin2025, Got:', password);
      return res.status(401).json({ 
        error: 'Invalid credentials',
        debug: {
          username_correct: username === 'lakesideadmin',
          password_correct: password === 'LakesideAdmin2025'
        }
      });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      details: error.message 
    });
  }
});

// DEBUG ENDPOINT - REMOVE IN PRODUCTION
app.get('/api/admin/debug', (req, res) => {
  res.json({
    environment_variables: {
      ADMIN_USERNAME: process.env.ADMIN_USERNAME,
      ADMIN_PASSWORD_HASH_EXISTS: !!process.env.ADMIN_PASSWORD_HASH,
      JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
      NODE_ENV: process.env.NODE_ENV
    },
    expected_credentials: {
      username: 'lakesideadmin',
      password: 'LakesideAdmin2025'
    },
    timestamp: new Date().toISOString(),
    server_version: 'v2.0-functional'
  });
});

// Test login endpoint - simple GET request
app.get('/api/admin/test-login', (req, res) => {
  res.json({
    message: 'Login system is working',
    credentials_to_use: {
      username: 'lakesideadmin',
      password: 'LakesideAdmin2025'
    },
    login_url: '/admin',
    api_endpoint: '/api/admin/login',
    method: 'POST',
    timestamp: new Date().toISOString()
  });
});

// Admin dashboard endpoint
app.get('/api/admin/dashboard', authenticateAdmin, (req, res) => {
  res.json({ 
    message: 'Admin dashboard access granted',
    admin: req.admin,
    serverTime: new Date().toISOString()
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

// Update prices (admin only)
app.put('/api/admin/prices', authenticateAdmin, (req, res) => {
  const { pinot, rose, cottage } = req.body;
  // In production, save to database
  console.log('Updating prices:', { pinot, rose, cottage });
  res.json({ 
    success: true, 
    message: 'Prices updated successfully',
    prices: { pinot, rose, cottage }
  });
});

// Get all bookings (admin only)
app.get('/api/admin/bookings', authenticateAdmin, (req, res) => {
  // In production, fetch from database
  res.json({
    bookings: [
      {
        id: 'B2025001',
        guestName: 'John Smith',
        guestEmail: 'john@example.com',
        property: 'Dome Pinot',
        checkin: '2025-08-28',
        checkout: '2025-08-30',
        status: 'confirmed',
        total: 996
      },
      {
        id: 'B2025002',
        guestName: 'Sarah Johnson',
        guestEmail: 'sarah@example.com',
        property: 'Dome Rosé',
        checkin: '2025-09-05',
        checkout: '2025-09-08',
        status: 'pending',
        total: 1494
      }
    ]
  });
});

// Add manual booking (admin only)
app.post('/api/admin/bookings', authenticateAdmin, (req, res) => {
  const booking = req.body;
  console.log('Adding manual booking:', booking);
  // In production, save to database
  res.json({
    success: true,
    message: 'Booking added successfully',
    bookingId: 'B' + Date.now()
  });
});

// Block dates (admin only)
app.post('/api/admin/block-dates', authenticateAdmin, (req, res) => {
  const { property, startDate, endDate, reason } = req.body;
  console.log('Blocking dates:', { property, startDate, endDate, reason });
  // In production, save to database
  res.json({
    success: true,
    message: 'Dates blocked successfully'
  });
});

// Get dashboard stats (admin only)
app.get('/api/admin/stats', authenticateAdmin, (req, res) => {
  // In production, calculate from database
  res.json({
    totalBookings: 127,
    monthlyRevenue: 18450,
    occupancyRate: 89,
    avgRating: 4.9,
    todayCheckIns: 2,
    todayCheckOuts: 1
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
    // Add email sending logic here if needed
    res.json({ 
      success: true, 
      message: 'Contact form received' 
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Contact form error' 
    });
  }
});

// Stripe Checkout session creation endpoint (protected)
app.post('/api/create-checkout-session', strictLimiter, async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const { booking, line_items, success_url, cancel_url, customer_email, metadata } = req.body;
    
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: line_items,
      mode: 'payment',
      success_url: success_url,
      cancel_url: cancel_url,
      customer_email: customer_email,
      metadata: metadata,
      billing_address_collection: 'required',
      phone_number_collection: {
        enabled: true,
      },
    });
    
    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe session creation error:', error);
    res.status(500).json({ 
      error: 'Payment session creation failed',
      message: error.message
    });
  }
});

// Catch all route - serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Lakeside Retreat server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});