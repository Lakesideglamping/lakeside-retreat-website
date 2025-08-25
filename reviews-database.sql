-- Lakeside Retreat Reviews Database Schema
-- SQLite database structure for guest feedback system

-- Main reviews table
CREATE TABLE reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_name VARCHAR(100) NOT NULL,
    guest_email VARCHAR(150) NOT NULL,
    guest_location VARCHAR(100),
    accommodation_type VARCHAR(50) NOT NULL, -- 'pinot-dome', 'rose-dome', 'lakeside-cottage'
    stay_dates VARCHAR(100), -- e.g., "March 15-18, 2025"
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
    location_rating INTEGER CHECK (location_rating >= 1 AND location_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    review_title VARCHAR(200),
    review_text TEXT NOT NULL,
    highlight_positive TEXT, -- What they loved most
    suggestions TEXT, -- Any suggestions for improvement
    would_recommend BOOLEAN DEFAULT 1,
    guest_photo_url VARCHAR(255),
    review_photos TEXT, -- JSON array of photo URLs
    source VARCHAR(50) DEFAULT 'website', -- 'website', 'airbnb', 'booking.com', 'direct'
    booking_reference VARCHAR(100),
    verified_stay BOOLEAN DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    admin_notes TEXT,
    admin_reply TEXT,
    admin_reply_date DATETIME,
    featured BOOLEAN DEFAULT 0, -- For highlighting exceptional reviews
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    approved_by VARCHAR(100)
);

-- Admin users table
CREATE TABLE admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(150) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin', -- 'admin', 'moderator'
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Review moderation log
CREATE TABLE review_moderation_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_id INTEGER NOT NULL,
    admin_user_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'approved', 'rejected', 'edited', 'replied'
    old_values TEXT, -- JSON of previous values
    new_values TEXT, -- JSON of new values
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (review_id) REFERENCES reviews(id),
    FOREIGN KEY (admin_user_id) REFERENCES admin_users(id)
);

-- Email notifications queue
CREATE TABLE email_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_email VARCHAR(150) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    notification_type VARCHAR(50), -- 'guest_confirmation', 'admin_new_review', 'review_approved'
    review_id INTEGER,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    attempts INTEGER DEFAULT 0,
    last_attempt DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME,
    FOREIGN KEY (review_id) REFERENCES reviews(id)
);

-- Indexes for better performance
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_accommodation ON reviews(accommodation_type);
CREATE INDEX idx_reviews_rating ON reviews(overall_rating);
CREATE INDEX idx_reviews_created ON reviews(created_at);
CREATE INDEX idx_reviews_featured ON reviews(featured);

-- Sample admin user (password: 'admin123' - change this!)
INSERT INTO admin_users (username, password_hash, email, role) VALUES 
('sandy', '$2b$10$rEKwrGmx8LKyQzOhN3kO2ukPdGU9YH6kQ2.vH4j0QJ5Y8YDN3KZNS', 'info@lakesideretreat.co.nz', 'admin');

-- Sample reviews data for testing
INSERT INTO reviews (
    guest_name, guest_email, guest_location, accommodation_type, stay_dates,
    overall_rating, cleanliness_rating, location_rating, value_rating, communication_rating,
    review_title, review_text, highlight_positive, would_recommend, source, status, approved_at
) VALUES 
(
    'Sarah & Mike Johnson', 'sarah@example.com', 'Auckland, New Zealand', 'pinot-dome', 'March 15-18, 2025',
    5, 5, 5, 4, 5,
    'Absolutely magical weekend getaway!',
    'Our stay at the Pinot Dome exceeded every expectation. The accommodation was spotless, the views were breathtaking, and Sandy was incredibly helpful with local wine recommendations. Waking up to the lake views and vineyard landscape was pure magic. The spa was the perfect way to unwind after a day of wine tasting.',
    'The private spa and stunning lake views were unforgettable. Sandy''s wine recommendations were spot-on!',
    1, 'website', 'approved', CURRENT_TIMESTAMP
),
(
    'David Chen', 'david@example.com', 'Melbourne, Australia', 'lakeside-cottage', 'February 8-12, 2025',
    5, 5, 5, 5, 5,
    'Perfect for our family holiday',
    'The Lakeside Cottage was ideal for our family of four. Kids loved having direct lake access, and we appreciated the full kitchen facilities. The cottage was beautifully appointed with everything we needed. Stephen and Sandy were wonderful hosts - always available but never intrusive. The location is unbeatable for exploring Central Otago.',
    'Direct lake access and full kitchen made it perfect for families. Hosts were exceptional.',
    1, 'booking.com', 'approved', CURRENT_TIMESTAMP
),
(
    'Emma Thompson', 'emma@example.com', 'London, UK', 'rose-dome', 'January 20-25, 2025',
    5, 5, 4, 4, 5,
    'Unique eco-luxury experience',
    'Coming from London, we were amazed by the sustainable luxury of the Rose Dome. The solar-powered accommodation didn''t compromise on comfort at all. The breakfast was delicious with local products, and the spa sessions after exploring nearby vineyards were heavenly. An unforgettable introduction to New Zealand wine country.',
    'The combination of sustainability and luxury was impressive. Breakfast with local products was a lovely touch.',
    1, 'airbnb', 'approved', CURRENT_TIMESTAMP
);