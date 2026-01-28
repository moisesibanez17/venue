-- Event Management Platform - Database Schema
-- Execute this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'organizer', 'admin')),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- EVENTS TABLE
-- ============================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    tags TEXT[], -- Array of tags
    location_address TEXT,
    location_city VARCHAR(100),
    location_country VARCHAR(100),
    location_lat DECIMAL(10, 7),
    location_lng DECIMAL(10, 7),
    event_date_start TIMESTAMP NOT NULL,
    event_date_end TIMESTAMP NOT NULL,
    capacity INTEGER,
    image_url TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_date ON events(event_date_start);
CREATE INDEX idx_events_location_city ON events(location_city);

-- ============================================
-- TICKET TYPES TABLE
-- ============================================
CREATE TABLE ticket_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., "General", "VIP", "Early Bird"
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    quantity_total INTEGER NOT NULL,
    quantity_sold INTEGER DEFAULT 0,
    max_per_order INTEGER DEFAULT 10,
    sales_start TIMESTAMP,
    sales_end TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT check_quantity CHECK (quantity_sold <= quantity_total)
);

CREATE INDEX idx_ticket_types_event ON ticket_types(event_id);

-- ============================================
-- PROMO CODES TABLE
-- ============================================
CREATE TABLE promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT check_uses CHECK (current_uses <= max_uses)
);

CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_event ON promo_codes(event_id);

-- ============================================
-- PURCHASES TABLE
-- ============================================
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    ticket_type_id UUID NOT NULL REFERENCES ticket_types(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    promo_code_id UUID REFERENCES promo_codes(id),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    mercadopago_payment_id VARCHAR(255),
    mercadopago_preference_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_purchases_user ON purchases(user_id);
CREATE INDEX idx_purchases_event ON purchases(event_id);
CREATE INDEX idx_purchases_status ON purchases(payment_status);
CREATE INDEX idx_purchases_mp_payment ON purchases(mercadopago_payment_id);

-- ============================================
-- TICKETS TABLE (Individual tickets generated)
-- ============================================
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    ticket_type_id UUID NOT NULL REFERENCES ticket_types(id),
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    qr_code TEXT, -- QR code data or URL
    status VARCHAR(20) DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'cancelled', 'refunded')),
    checked_in_at TIMESTAMP,
    checked_in_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tickets_purchase ON tickets(purchase_id);
CREATE INDEX idx_tickets_user ON tickets(user_id);
CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_number ON tickets(ticket_number);
CREATE INDEX idx_tickets_status ON tickets(status);

-- ============================================
-- REVIEWS TABLE
-- ============================================
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(event_id, user_id) -- One review per user per event
);

CREATE INDEX idx_reviews_event ON reviews(event_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);

-- ============================================
-- FAVORITES TABLE
-- ============================================
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_event ON favorites(event_id);

-- ============================================
-- CHECK-INS TABLE
-- ============================================
CREATE TABLE check_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    checked_in_by UUID NOT NULL REFERENCES users(id),
    check_in_method VARCHAR(20) CHECK (check_in_method IN ('qr', 'manual')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_check_ins_ticket ON check_ins(ticket_id);
CREATE INDEX idx_check_ins_event ON check_ins(event_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_types_updated_at BEFORE UPDATE ON ticket_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ticket_number = 'TKT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 12));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ticket number generation
CREATE TRIGGER generate_ticket_number_trigger BEFORE INSERT ON tickets
    FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- View: Event statistics
CREATE OR REPLACE VIEW event_statistics AS
SELECT 
    e.id as event_id,
    e.title,
    e.organizer_id,
    COUNT(DISTINCT p.id) as total_purchases,
    SUM(p.quantity) as total_tickets_sold,
    SUM(p.total) as total_revenue,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'used') as tickets_checked_in,
    AVG(r.rating) as average_rating,
    COUNT(r.id) as review_count
FROM events e
LEFT JOIN purchases p ON e.id = p.event_id AND p.payment_status = 'completed'
LEFT JOIN tickets t ON e.id = t.event_id
LEFT JOIN reviews r ON e.id = r.event_id
GROUP BY e.id, e.title, e.organizer_id;

-- View: User purchase history
CREATE OR REPLACE VIEW user_purchase_history AS
SELECT 
    u.id as user_id,
    u.email,
    u.full_name,
    e.id as event_id,
    e.title as event_title,
    e.event_date_start,
    p.id as purchase_id,
    p.quantity,
    p.total,
    p.payment_status,
    p.created_at as purchase_date,
    COUNT(t.id) as tickets_count
FROM users u
JOIN purchases p ON u.id = p.user_id
JOIN events e ON p.event_id = e.id
LEFT JOIN tickets t ON p.id = t.purchase_id
GROUP BY u.id, u.email, u.full_name, e.id, e.title, e.event_date_start, 
         p.id, p.quantity, p.total, p.payment_status, p.created_at;

-- ============================================
-- Sample Data (Optional - for testing)
-- ============================================

-- Insert admin user (password: admin123 - hashed with bcrypt)
-- You need to hash this password using bcrypt in your application
INSERT INTO users (email, password_hash, full_name, role, is_verified) 
VALUES ('admin@eventplatform.com', '$2b$10$examplehash', 'Administrator', 'admin', TRUE);

COMMENT ON TABLE users IS 'User accounts with authentication and role management';
COMMENT ON TABLE events IS 'Events created by organizers';
COMMENT ON TABLE ticket_types IS 'Different ticket types/tiers for each event';
COMMENT ON TABLE purchases IS 'Purchase transactions';
COMMENT ON TABLE tickets IS 'Individual tickets generated from purchases';
COMMENT ON TABLE promo_codes IS 'Promotional discount codes';
COMMENT ON TABLE reviews IS 'User reviews and ratings for events';
COMMENT ON TABLE favorites IS 'User favorite events';
COMMENT ON TABLE check_ins IS 'Check-in records for event entry';
