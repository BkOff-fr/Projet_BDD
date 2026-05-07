-- =============================================================================
-- ACCOMMODATION RENTAL PLATFORM - SCHEMA
-- EC08-BDD Project — full coverage of the project specification
-- Idempotent: drop in dependency order, then recreate.
-- =============================================================================
-- Question-marker legend (used throughout the SQL files):
--   [§ 3]  → Functional scope of the platform (cf. PDF section 3)
--   [§ 4a] → Business constraints (PK / FK / CHECK / TRIGGER)
--   [§ 4b] → Daily dashboard: lowest rating per accommodation
--   [§ 4c] → Search performance by type
--   [§ 4d] → Mandatory security requirements (alarm system)
--   [§ 4e] → Test dataset variety + invalid attempts
--   [§ 4f] → Marketing list with average rating
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS pricing_rules;
DROP TABLE IF EXISTS availability;
DROP TABLE IF EXISTS accommodation_fees;
DROP TABLE IF EXISTS accommodation_amenities;
DROP TABLE IF EXISTS amenities;
DROP TABLE IF EXISTS accommodations;
DROP TABLE IF EXISTS cancellation_policies;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- USERS
-- A single account can act as guest and/or host (is_host flag).
-- created_at represents seniority on the platform.
-- =============================================================================
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    profile_picture VARCHAR(512),
    is_host BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_email_format CHECK (email LIKE '%_@_%._%'),
    INDEX idx_users_email (email),
    INDEX idx_users_is_host (is_host)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- [§ 3] [§ 4a]  CANCELLATION_POLICIES
-- Each policy defines refund windows. A booking cancelled X days before
-- check-in qualifies for a full / partial / no refund.
-- =============================================================================
CREATE TABLE cancellation_policies (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    full_refund_days_before INT NOT NULL,
    partial_refund_days_before INT NOT NULL,
    partial_refund_percentage DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_policy_full_window CHECK (full_refund_days_before >= 0),
    CONSTRAINT chk_policy_partial_window CHECK (partial_refund_days_before >= 0),
    CONSTRAINT chk_policy_window_order CHECK (full_refund_days_before >= partial_refund_days_before),
    CONSTRAINT chk_policy_partial_pct CHECK (partial_refund_percentage BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- [§ 3] [§ 4d] [§ 4e]  ACCOMMODATIONS
-- Inherent property characteristics, distinct from host info (FK only).
--   is_validated  : platform-level approval gate         [§ 4e]
--   has_alarm_system / has_smoke_detector : security    [§ 4d]
-- =============================================================================
CREATE TABLE accommodations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    host_id BIGINT UNSIGNED NOT NULL,
    cancellation_policy_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type ENUM('apartment','house','villa','condo','cabin','guesthouse','studio','private_room') NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    max_guests INT NOT NULL,
    bedrooms INT NOT NULL,
    beds INT NOT NULL,
    bathrooms DECIMAL(3,1) NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    minimum_nights INT NOT NULL DEFAULT 1,
    maximum_nights INT,
    instant_book BOOLEAN NOT NULL DEFAULT FALSE,
    house_rules TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_validated BOOLEAN NOT NULL DEFAULT FALSE,           -- [§ 4e]
    has_alarm_system BOOLEAN NOT NULL DEFAULT FALSE,       -- [§ 4d]
    has_smoke_detector BOOLEAN NOT NULL DEFAULT FALSE,     -- [§ 4d]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_accommodation_host FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_accommodation_policy FOREIGN KEY (cancellation_policy_id) REFERENCES cancellation_policies(id),
    CONSTRAINT chk_acc_capacity CHECK (max_guests >= 1),
    CONSTRAINT chk_acc_bedrooms CHECK (bedrooms >= 0),
    CONSTRAINT chk_acc_beds CHECK (beds >= 1),
    CONSTRAINT chk_acc_bathrooms CHECK (bathrooms >= 0),
    CONSTRAINT chk_acc_price CHECK (price_per_night > 0),
    CONSTRAINT chk_acc_min_nights CHECK (minimum_nights >= 1),
    CONSTRAINT chk_acc_max_nights CHECK (maximum_nights IS NULL OR maximum_nights >= minimum_nights),
    -- [§ 4d] No validation without an alarm system
    CONSTRAINT chk_acc_validation_requires_alarm
        CHECK (is_validated = FALSE OR has_alarm_system = TRUE),
    INDEX idx_accommodations_type (type),
    INDEX idx_accommodations_city (city),
    INDEX idx_accommodations_host (host_id),
    INDEX idx_accommodations_validated (is_validated),
    -- [§ 4c] Composite index covering the search filter (type, city, validated, active)
    INDEX idx_accommodations_search (type, city, is_validated, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- AMENITIES (independent reference table)
-- =============================================================================
CREATE TABLE amenities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    icon VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ACCOMMODATION_AMENITIES (M:N junction)
-- =============================================================================
CREATE TABLE accommodation_amenities (
    accommodation_id BIGINT UNSIGNED NOT NULL,
    amenity_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (accommodation_id, amenity_id),
    CONSTRAINT fk_aa_accommodation FOREIGN KEY (accommodation_id) REFERENCES accommodations(id) ON DELETE CASCADE,
    CONSTRAINT fk_aa_amenity FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- [§ 3]  ACCOMMODATION_FEES (cleaning, service, tax, etc.)
-- Separated from accommodations to keep that table identity-only.
-- Used to reconstruct the total cost of a stay (cf. Q2 in 04_queries.sql).
-- =============================================================================
CREATE TABLE accommodation_fees (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    accommodation_id BIGINT UNSIGNED NOT NULL,
    fee_type ENUM('cleaning','service','tax','pet','other') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    is_percentage BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_fee_accommodation FOREIGN KEY (accommodation_id) REFERENCES accommodations(id) ON DELETE CASCADE,
    CONSTRAINT chk_fee_amount CHECK (amount >= 0),
    CONSTRAINT chk_fee_percentage CHECK (is_percentage = FALSE OR amount <= 100),
    UNIQUE KEY uk_acc_fee_type (accommodation_id, fee_type),
    INDEX idx_fees_accommodation (accommodation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- [§ 3]  AVAILABILITY (host-defined blocked or open periods)
-- A booking must NOT overlap a row where is_available = FALSE.
-- Enforced by trigger trg_booking_validate_before_insert in 02_*.sql.
-- =============================================================================
CREATE TABLE availability (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    accommodation_id BIGINT UNSIGNED NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_availability_accommodation FOREIGN KEY (accommodation_id) REFERENCES accommodations(id) ON DELETE CASCADE,
    CONSTRAINT chk_availability_dates CHECK (end_date >= start_date),
    INDEX idx_availability_accommodation (accommodation_id),
    INDEX idx_availability_dates (accommodation_id, start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- [§ 3]  PRICING_RULES (seasonal / event / promotion adjustments)
-- A rule increases or decreases the base nightly price for a date window.
-- =============================================================================
CREATE TABLE pricing_rules (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    accommodation_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rule_type ENUM('fixed_increase','percentage_increase','fixed_decrease','percentage_decrease') NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pricing_accommodation FOREIGN KEY (accommodation_id) REFERENCES accommodations(id) ON DELETE CASCADE,
    CONSTRAINT chk_pricing_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_pricing_value_positive CHECK (value > 0),
    CONSTRAINT chk_pricing_pct_decrease_range CHECK (
        rule_type <> 'percentage_decrease' OR value <= 100
    ),
    INDEX idx_pricing_accommodation (accommodation_id),
    INDEX idx_pricing_dates (accommodation_id, start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- [§ 3]  BOOKINGS
-- Lifecycle statuses: pending → confirmed → completed, or → cancelled.
-- cancelled_at is set automatically when status transitions to 'cancelled'
-- (trigger in 02_constraints_triggers.sql). Used for refund computation.
-- =============================================================================
CREATE TABLE bookings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    accommodation_id BIGINT UNSIGNED NOT NULL,
    guest_id BIGINT UNSIGNED NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    num_guests INT NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    status ENUM('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
    special_requests TEXT,
    cancelled_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_booking_accommodation FOREIGN KEY (accommodation_id) REFERENCES accommodations(id) ON DELETE CASCADE,
    CONSTRAINT fk_booking_guest FOREIGN KEY (guest_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_booking_dates CHECK (check_out_date > check_in_date),
    CONSTRAINT chk_booking_num_guests CHECK (num_guests >= 1),
    CONSTRAINT chk_booking_total_price CHECK (total_price >= 0),
    INDEX idx_bookings_accommodation (accommodation_id),
    INDEX idx_bookings_guest (guest_id),
    INDEX idx_bookings_status (status),
    INDEX idx_bookings_dates (accommodation_id, check_in_date, check_out_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- [§ 3]  REVIEWS (one per booking; reviewer & accommodation derived via
-- booking — 3NF: avoids transitive dependencies)
-- =============================================================================
CREATE TABLE reviews (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL UNIQUE,
    rating INT NOT NULL,
    comment TEXT,
    cleanliness_rating INT,
    accuracy_rating INT,
    checkin_rating INT,
    communication_rating INT,
    location_rating INT,
    value_rating INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT chk_review_cleanliness CHECK (cleanliness_rating IS NULL OR cleanliness_rating BETWEEN 1 AND 5),
    CONSTRAINT chk_review_accuracy CHECK (accuracy_rating IS NULL OR accuracy_rating BETWEEN 1 AND 5),
    CONSTRAINT chk_review_checkin CHECK (checkin_rating IS NULL OR checkin_rating BETWEEN 1 AND 5),
    CONSTRAINT chk_review_communication CHECK (communication_rating IS NULL OR communication_rating BETWEEN 1 AND 5),
    CONSTRAINT chk_review_location CHECK (location_rating IS NULL OR location_rating BETWEEN 1 AND 5),
    CONSTRAINT chk_review_value CHECK (value_rating IS NULL OR value_rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- [§ 3]  MESSAGES (between users, optionally tied to an accommodation)
-- =============================================================================
CREATE TABLE messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sender_id BIGINT UNSIGNED NOT NULL,
    receiver_id BIGINT UNSIGNED NOT NULL,
    accommodation_id BIGINT UNSIGNED,
    content VARCHAR(2000) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_message_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_message_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_message_accommodation FOREIGN KEY (accommodation_id) REFERENCES accommodations(id) ON DELETE SET NULL,
    CONSTRAINT chk_message_distinct CHECK (sender_id <> receiver_id),
    INDEX idx_messages_thread (sender_id, receiver_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- [§ 3]  PAYMENTS (multi-step transactions per booking — deposit, balance, refund)
-- =============================================================================
CREATE TABLE payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_type ENUM('deposit','balance','full','refund','penalty') NOT NULL DEFAULT 'full',
    payment_method ENUM('credit_card','paypal','bank_transfer') NOT NULL,
    status ENUM('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
    transaction_id VARCHAR(100),
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT chk_payment_amount CHECK (amount > 0),
    INDEX idx_payments_booking (booking_id),
    INDEX idx_payments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Schema created successfully.' AS status;
