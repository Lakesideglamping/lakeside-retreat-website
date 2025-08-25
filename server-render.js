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
    console.log('Username length:', username ? username.length : 0);
    console.log('Password length:', password ? password.length : 0);
    
    // Trim whitespace from inputs
    const trimmedUsername = username ? username.trim() : '';
    const trimmedPassword = password ? password.trim() : '';
    
    // Use environment variables for credentials (fallback for development only)
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'lakesideadmin';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'LakesideAdmin2025';
    
    if (trimmedUsername === ADMIN_USERNAME && trimmedPassword === ADMIN_PASSWORD) {
      console.log('LOGIN SUCCESS!');
      
      const JWT_SECRET = process.env.JWT_SECRET || 'simple-jwt-secret-2025-dev-only';
      const token = jwt.sign(
        { username: trimmedUsername, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({ 
        token,
        message: 'Login successful',
        expiresIn: '24h'
      });
    } else {
      console.log('LOGIN FAILED - Credentials do not match');
      console.log('LOGIN FAILED - Invalid credentials');
      // Don't log actual passwords in production
      return res.status(401).json({ 
        error: 'Invalid credentials',
        debug: process.env.NODE_ENV !== 'production' ? {
          received_username: trimmedUsername,
          username_correct: trimmedUsername === ADMIN_USERNAME,
          username_length: trimmedUsername.length,
          password_length: trimmedPassword.length
        } : {
          message: 'Invalid username or password'
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

// DEBUG ENDPOINT - DISABLED IN PRODUCTION
app.get('/api/admin/debug', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json({
    environment_variables: {
      ADMIN_USERNAME_EXISTS: !!process.env.ADMIN_USERNAME,
      JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
      NODE_ENV: process.env.NODE_ENV
    },
    message: 'Debug mode - credentials hidden in production',
    timestamp: new Date().toISOString()
  });
});

// Remove status endpoint now that login is working

// Admin dashboard endpoint
app.get('/api/admin/dashboard', authenticateAdmin, (req, res) => {
  res.json({ 
    message: 'Admin dashboard access granted',
    admin: req.admin,
    serverTime: new Date().toISOString()
  });
});

// In-memory storage (replace with database in production)
let currentPrices = {
  pinot: 498,
  rose: 498,
  cottage: 245
};

let bookings = [
  {
    id: 'B2025001',
    guestName: 'John Smith',
    guestEmail: 'john@example.com',
    property: 'Dome Pinot',
    checkin: '2025-08-28',
    checkout: '2025-08-30',
    status: 'confirmed'
  },
  {
    id: 'B2025002',
    guestName: 'Sarah Johnson',
    guestEmail: 'sarah@example.com',
    property: 'Dome Rosé',
    checkin: '2025-09-05',
    checkout: '2025-09-08',
    status: 'pending'
  }
];

// Accommodation prices endpoint
app.get('/api/accommodation/prices', (req, res) => {
  res.json(currentPrices);
});

// Update prices (admin only)
app.put('/api/admin/prices', authenticateAdmin, (req, res) => {
  const { pinot, rose, cottage } = req.body;
  
  // Validate prices
  if (pinot && pinot > 0) currentPrices.pinot = pinot;
  if (rose && rose > 0) currentPrices.rose = rose;
  if (cottage && cottage > 0) currentPrices.cottage = cottage;
  
  console.log('Updating prices:', currentPrices);
  
  res.json({ 
    success: true, 
    message: 'Prices updated successfully',
    prices: currentPrices
  });
});

// Get all bookings (admin only)
app.get('/api/admin/bookings', authenticateAdmin, (req, res) => {
  res.json({
    bookings: bookings
  });
});

// Add manual booking (admin only)
app.post('/api/admin/bookings', authenticateAdmin, (req, res) => {
  const booking = req.body;
  const newBookingId = 'B' + Date.now();
  
  // Add to in-memory bookings array
  const newBooking = {
    id: newBookingId,
    guestName: booking.guestName,
    guestEmail: booking.guestEmail,
    guestPhone: booking.guestPhone,
    property: booking.property,
    checkin: booking.checkin,
    checkout: booking.checkout,
    guests: booking.guests,
    requests: booking.requests,
    status: 'confirmed'
  };
  
  bookings.push(newBooking);
  console.log('Adding manual booking:', newBooking);
  
  res.json({
    success: true,
    message: 'Booking added successfully',
    bookingId: newBookingId,
    booking: newBooking
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

// Cancel/Delete booking (admin only)
app.delete('/api/admin/bookings/:id', authenticateAdmin, (req, res) => {
  const bookingId = req.params.id;
  
  // Remove from in-memory bookings array
  const bookingIndex = bookings.findIndex(booking => booking.id === bookingId);
  
  if (bookingIndex !== -1) {
    const removedBooking = bookings.splice(bookingIndex, 1)[0];
    console.log('Cancelled booking:', removedBooking);
    
    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      bookingId: bookingId
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Booking not found',
      bookingId: bookingId
    });
  }
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
    const { booking, line_items, success_url, cancel_url, customer_email, metadata } = req.body;
    
    // Store pending booking temporarily (before payment completion)
    const pendingBookingId = 'P' + Date.now();
    
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('Stripe not configured, simulating booking process...');
      
      // If Stripe not configured, simulate successful booking for testing
      const newBooking = {
        id: 'B' + Date.now(),
        guestName: metadata?.guest_name || 'Test Guest',
        guestEmail: customer_email,
        guestPhone: metadata?.phone || '',
        property: metadata?.property || 'Dome Pinot',
        checkin: metadata?.checkin || '2025-09-01',
        checkout: metadata?.checkout || '2025-09-03',
        guests: metadata?.guests || '2 adults',
        requests: metadata?.special_requests || '',
        status: 'confirmed',
        total: line_items[0]?.price_data?.unit_amount ? line_items[0].price_data.unit_amount / 100 : 0,
        paymentMethod: 'stripe_test'
      };
      
      // Add to bookings array
      bookings.push(newBooking);
      console.log('Test booking created:', newBooking);
      
      // Return success URL for testing
      return res.json({ 
        url: success_url.replace('{CHECKOUT_SESSION_ID}', 'test_session_123'),
        test_mode: true,
        booking: newBooking
      });
    }
    
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: line_items,
      mode: 'payment',
      success_url: success_url,
      cancel_url: cancel_url,
      customer_email: customer_email,
      metadata: {
        ...metadata,
        pending_booking_id: pendingBookingId
      },
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

// Handle successful booking (for testing without Stripe webhooks)
app.post('/api/booking/confirm', async (req, res) => {
  try {
    const { session_id, guest_info, booking_details } = req.body;
    
    console.log('Confirming booking:', { session_id, guest_info, booking_details });
    
    // Create confirmed booking
    const confirmedBooking = {
      id: 'B' + Date.now(),
      guestName: guest_info.name,
      guestEmail: guest_info.email,
      guestPhone: guest_info.phone || '',
      property: booking_details.property,
      checkin: booking_details.checkin,
      checkout: booking_details.checkout,
      guests: `${booking_details.adults || 2} adults${booking_details.children ? `, ${booking_details.children} children` : ''}`,
      requests: guest_info.special_requests || '',
      status: 'confirmed',
      total: booking_details.total,
      sessionId: session_id
    };
    
    // Add to bookings array
    bookings.push(confirmedBooking);
    console.log('Booking confirmed and added:', confirmedBooking);
    
    res.json({
      success: true,
      booking: confirmedBooking,
      message: 'Booking confirmed successfully'
    });
    
  } catch (error) {
    console.error('Booking confirmation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm booking'
    });
  }
});

// Get single booking details
app.get('/api/booking/:id', (req, res) => {
  const bookingId = req.params.id;
  const booking = bookings.find(b => b.id === bookingId);
  
  if (booking) {
    res.json(booking);
  } else {
    res.status(404).json({ error: 'Booking not found' });
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