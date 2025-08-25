// Simplified server for Render.com deployment
const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10001;

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
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serve static files
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

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

// Catch all route - serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Lakeside Retreat server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});