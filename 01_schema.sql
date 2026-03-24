-- =============================================================================
-- ACCOMMODATION RENTAL PLATFORM - DATABASE SCHEMA
-- Airbnb-like platform complete MySQL implementation
-- =============================================================================
-- Execute this file first to create all tables with primary keys and foreign keys
-- =============================================================================

-- Drop database if exists and create fresh (optional - uncomment if needed)
-- DROP DATABASE IF EXISTS rental_platform;
-- CREATE DATABASE rental_platform;
-- USE rental_platform;

-- =============================================================================
-- TABLE 1: users
-- Stores all platform users (guests and hosts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    birth_date DATE,
    account_status ENUM('active', 'suspended') DEFAULT 'active',
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_host BOOLEAN DEFAULT FALSE,
    
    -- Indexes
    INDEX idx_email (email),
    INDEX idx_account_status (account_status),
    INDEX idx_is_host (is_host)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Platform users - both guests and hosts';

-- =============================================================================
-- TABLE 2: accommodations
-- Properties available for rent
-- =============================================================================
CREATE TABLE IF NOT EXISTS accommodations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    host_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('studio', 'apartment', 'house', 'villa', 'room') NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    capacity INT UNSIGNED NOT NULL,
    bedrooms INT UNSIGNED NOT NULL DEFAULT 0,
    bathrooms DECIMAL(3,1) UNSIGNED NOT NULL DEFAULT 0,
    base_price_night DECIMAL(10,2) UNSIGNED NOT NULL,
    is_validated BOOLEAN DEFAULT FALSE,
    has_alarm_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key to users (host)
    CONSTRAINT fk_accommodation_host 
        FOREIGN KEY (host_id) REFERENCES users(id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    
    -- Indexes for search performance
    INDEX idx_type (type),
    INDEX idx_city (city),
    INDEX idx_country (country),
    INDEX idx_capacity (capacity),
    INDEX idx_base_price (base_price_night),
    INDEX idx_is_validated (is_validated),
    INDEX idx_location (city, country),
    FULLTEXT INDEX idx_title_description (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Accommodation properties listed by hosts';

-- =============================================================================
-- TABLE 3: amenities
-- Available amenities that can be associated with accommodations
-- =============================================================================
CREATE TABLE IF NOT EXISTS amenities (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50),
    
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Available amenities (WiFi, Pool, Parking, etc.)';

-- =============================================================================
-- TABLE 4: accommodation_amenities
-- Junction table for many-to-many relationship
-- =============================================================================
CREATE TABLE IF NOT EXISTS accommodation_amenities (
    accommodation_id BIGINT UNSIGNED NOT NULL,
    amenity_id INT UNSIGNED NOT NULL,
    
    PRIMARY KEY (accommodation_id, amenity_id),
    
    CONSTRAINT fk_aa_accommodation 
        FOREIGN KEY (accommodation_id) REFERENCES accommodations(id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    
    CONSTRAINT fk_aa_amenity 
        FOREIGN KEY (amenity_id) REFERENCES amenities(id) 
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Junction table linking accommodations to their amenities';

-- =============================================================================
-- TABLE 5: availability
-- Tracks when accommodations are available or unavailable for booking
-- =============================================================================
CREATE TABLE IF NOT EXISTS availability (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    accommodation_id BIGINT UNSIGNED NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    reason VARCHAR(255),
    
    CONSTRAINT fk_availability_accommodation 
        FOREIGN KEY (accommodation_id) REFERENCES accommodations(id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    
    INDEX idx_accommodation_dates (accommodation_id, start_date, end_date),
    INDEX idx_is_available (is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Availability periods for accommodations';

-- =============================================================================
-- TABLE 6: pricing_rules
-- Dynamic pricing based on dates (seasonal, events)
-- =============================================================================
CREATE TABLE IF NOT EXISTS pricing_rules (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    accommodation_id BIGINT UNSIGNED NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    price_multiplier DECIMAL(4,2) UNSIGNED NOT NULL DEFAULT 1.00,
    reason VARCHAR(255),
    
    CONSTRAINT fk_pricing_accommodation 
        FOREIGN KEY (accommodation_id) REFERENCES accommodations(id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    
    INDEX idx_accommodation_pricing_dates (accommodation_id, start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Special pricing rules for peak seasons and events';

-- =============================================================================
-- TABLE 7: additional_fees
-- Extra fees for accommodations (cleaning, service, tax)
-- =============================================================================
CREATE TABLE IF NOT EXISTS additional_fees (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    accommodation_id BIGINT UNSIGNED NOT NULL,
    fee_type ENUM('cleaning', 'service', 'tax') NOT NULL,
    amount DECIMAL(10,2) UNSIGNED NOT NULL,
    is_percentage BOOLEAN DEFAULT FALSE,
    
    CONSTRAINT fk_fees_accommodation 
        FOREIGN KEY (accommodation_id) REFERENCES accommodations(id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    
    INDEX idx_accommodation_fee_type (accommodation_id, fee_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Additional fees applied to bookings';

-- =============================================================================
-- TABLE 8: cancellation_policies
-- Cancellation policy configuration per accommodation
-- =============================================================================
CREATE TABLE IF NOT EXISTS cancellation_policies (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    accommodation_id BIGINT UNSIGNED NOT NULL,
    policy_type ENUM('flexible', 'moderate', 'strict') NOT NULL DEFAULT 'moderate',
    days_before_full_refund INT UNSIGNED DEFAULT 7,
    partial_refund_percent DECIMAL(5,2) UNSIGNED DEFAULT 50.00,
    no_refund_days_before INT UNSIGNED DEFAULT 1,
    
    CONSTRAINT fk_policy_accommodation 
        FOREIGN KEY (accommodation_id) REFERENCES accommodations(id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    
    INDEX idx_accommodation_policy (accommodation_id),
    INDEX idx_policy_type (policy_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Cancellation policies for each accommodation';

-- =============================================================================
-- TABLE 9: bookings
-- Main booking records
-- =============================================================================
CREATE TABLE IF NOT EXISTS bookings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    guest_id BIGINT UNSIGNED NOT NULL,
    accommodation_id BIGINT UNSIGNED NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    status ENUM('pending', 'validated', 'canceled', 'completed') DEFAULT 'pending',
    total_amount DECIMAL(12,2) UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancellation_policy_id BIGINT UNSIGNED,
    
    CONSTRAINT fk_booking_guest 
        FOREIGN KEY (guest_id) REFERENCES users(id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    
    CONSTRAINT fk_booking_accommodation 
        FOREIGN KEY (accommodation_id) REFERENCES accommodations(id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    
    CONSTRAINT fk_booking_cancellation_policy 
        FOREIGN KEY (cancellation_policy_id) REFERENCES cancellation_policies(id) 
        ON DELETE SET NULL ON UPDATE CASCADE,
    
    -- Critical indexes for booking queries
    INDEX idx_guest_id (guest_id),
    INDEX idx_accommodation_id (accommodation_id),
    INDEX idx_check_in_date (check_in_date),
    INDEX idx_check_out_date (check_out_date),
    INDEX idx_booking_dates (check_in_date, check_out_date),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Booking records linking guests to accommodations';

-- =============================================================================
-- TABLE 10: payments
-- Payment records for bookings
-- =============================================================================
CREATE TABLE IF NOT EXISTS payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_type ENUM('deposit', 'balance', 'refund', 'full') NOT NULL,
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    payment_date TIMESTAMP NULL,
    transaction_reference VARCHAR(100),
    
    CONSTRAINT fk_payment_booking 
        FOREIGN KEY (booking_id) REFERENCES bookings(id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    
    INDEX idx_booking_id (booking_id),
    INDEX idx_payment_type (payment_type),
    INDEX idx_payment_status (status),
    INDEX idx_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Payment transactions for bookings';

-- =============================================================================
-- TABLE 11: reviews
-- Guest reviews for accommodations
-- =============================================================================
CREATE TABLE IF NOT EXISTS reviews (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL,
    accommodation_id BIGINT UNSIGNED NOT NULL,
    guest_id BIGINT UNSIGNED NOT NULL,
    rating INT UNSIGNED NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_review_booking 
        FOREIGN KEY (booking_id) REFERENCES bookings(id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    
    CONSTRAINT fk_review_accommodation 
        FOREIGN KEY (accommodation_id) REFERENCES accommodations(id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    
    CONSTRAINT fk_review_guest 
        FOREIGN KEY (guest_id) REFERENCES users(id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    
    -- Critical index for accommodation rating queries
    INDEX idx_accommodation_id (accommodation_id),
    INDEX idx_guest_id (guest_id),
    INDEX idx_rating (rating),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Guest reviews and ratings for accommodations';

-- =============================================================================
-- TABLE 12: messages
-- Communication between users (guests and hosts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sender_id BIGINT UNSIGNED NOT NULL,
    receiver_id BIGINT UNSIGNED NOT NULL,
    booking_id BIGINT UNSIGNED NULL,
    content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    
    CONSTRAINT fk_message_sender 
        FOREIGN KEY (sender_id) REFERENCES users(id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    
    CONSTRAINT fk_message_receiver 
        FOREIGN KEY (receiver_id) REFERENCES users(id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    
    CONSTRAINT fk_message_booking 
        FOREIGN KEY (booking_id) REFERENCES bookings(id) 
        ON DELETE SET NULL ON UPDATE CASCADE,
    
    INDEX idx_sender_id (sender_id),
    INDEX idx_receiver_id (receiver_id),
    INDEX idx_booking_id (booking_id),
    INDEX idx_sent_at (sent_at),
    INDEX idx_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Messages between guests and hosts';

-- =============================================================================
-- SCHEMA CREATION COMPLETE
-- =============================================================================
SELECT 'Schema created successfully!' AS status;
