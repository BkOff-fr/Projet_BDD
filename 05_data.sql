-- =============================================================================
-- ACCOMMODATION RENTAL PLATFORM - COMPREHENSIVE TEST DATA
-- Test dataset covering all scenarios and edge cases
-- =============================================================================
-- Execute this file AFTER 01_schema.sql and 02_constraints_triggers.sql
-- =============================================================================

-- Disable foreign key checks temporarily for clean data insertion
SET FOREIGN_KEY_CHECKS = 0;

-- Clear existing data (optional - uncomment if needed)
-- DELETE FROM messages;
-- DELETE FROM reviews;
-- DELETE FROM payments;
-- DELETE FROM bookings;
-- DELETE FROM cancellation_policies;
-- DELETE FROM additional_fees;
-- DELETE FROM pricing_rules;
-- DELETE FROM availability;
-- DELETE FROM accommodation_amenities;
-- DELETE FROM amenities;
-- DELETE FROM accommodations;
-- DELETE FROM users;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- SECTION 1: USERS
-- Mix of hosts and guests with various account statuses
-- =============================================================================

-- Hosts
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, birth_date, account_status, registration_date, is_host) VALUES
(1, 'host.john@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John', 'Smith', '+1-555-0101', '1985-03-15', 'active', '2023-01-10 09:30:00', TRUE),
(2, 'host.sarah@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sarah', 'Johnson', '+1-555-0102', '1990-07-22', 'active', '2023-02-15 14:20:00', TRUE),
(3, 'host.michael@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Michael', 'Brown', '+1-555-0103', '1978-11-08', 'active', '2023-03-20 11:45:00', TRUE),
(4, 'host.emily@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Emily', 'Davis', '+1-555-0104', '1988-05-30', 'suspended', '2023-04-05 16:00:00', TRUE),
(5, 'host.david@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'David', 'Wilson', '+1-555-0105', '1982-09-12', 'active', '2023-05-18 08:15:00', TRUE);

-- Guests (including some who will become frequent bookers)
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, birth_date, account_status, registration_date, is_host) VALUES
(6, 'guest.alice@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Alice', 'Anderson', '+1-555-0201', '1992-04-18', 'active', '2023-01-25 10:00:00', FALSE),
(7, 'guest.bob@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Bob', 'Martinez', '+1-555-0202', '1987-08-05', 'active', '2023-02-10 13:30:00', FALSE),
(8, 'guest.carol@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Carol', 'Taylor', '+1-555-0203', '1995-12-20', 'active', '2023-03-15 09:45:00', FALSE),
(9, 'guest.daniel@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Daniel', 'Garcia', '+1-555-0204', '1980-06-25', 'active', '2023-04-20 15:20:00', FALSE),
(10, 'guest.elena@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Elena', 'Rodriguez', '+1-555-0205', '1993-10-10', 'active', '2023-05-05 11:00:00', FALSE),
(11, 'guest.frank@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Frank', 'Lee', '+1-555-0206', '1989-02-14', 'active', '2023-06-12 14:45:00', FALSE),
(12, 'guest.grace@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Grace', 'Chen', '+1-555-0207', '1991-11-30', 'active', '2023-07-08 10:30:00', FALSE),
(13, 'guest.henry@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Henry', 'Wang', '+1-555-0208', '1984-07-07', 'suspended', '2023-08-15 16:15:00', FALSE),
(14, 'guest.isabel@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Isabel', 'Kim', '+1-555-0209', '1996-03-22', 'active', '2023-09-01 08:45:00', FALSE),
(15, 'guest.james@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'James', 'Patel', '+1-555-0210', '1986-09-18', 'active', '2023-10-10 12:00:00', FALSE);

SELECT 'Users inserted successfully!' AS status;

-- =============================================================================
-- SECTION 2: AMENITIES
-- Common amenities for accommodations
-- =============================================================================

INSERT INTO amenities (id, name, icon) VALUES
(1, 'WiFi', 'wifi'),
(2, 'Kitchen', 'kitchen'),
(3, 'Pool', 'pool'),
(4, 'Parking', 'car'),
(5, 'Air Conditioning', 'ac'),
(6, 'Heating', 'heater'),
(7, 'Washer', 'washer'),
(8, 'Dryer', 'dryer'),
(9, 'TV', 'tv'),
(10, 'Gym', 'dumbbell'),
(11, 'Balcony', 'balcony'),
(12, 'Garden', 'tree'),
(13, 'Pets Allowed', 'paw'),
(14, 'Smoking Allowed', 'smoking'),
(15, 'Wheelchair Accessible', 'wheelchair');

SELECT 'Amenities inserted successfully!' AS status;

-- =============================================================================
-- SECTION 3: ACCOMMODATIONS
-- Mix of validated/non-validated and compliant/non-compliant properties
-- =============================================================================

-- Validated accommodations (can be booked)
INSERT INTO accommodations (id, host_id, title, description, type, address, city, country, capacity, bedrooms, bathrooms, base_price_night, is_validated, has_alarm_system, created_at) VALUES
(1, 1, 'Cozy Downtown Studio', 'Perfect studio apartment in the heart of downtown. Walking distance to restaurants and shops.', 'studio', '123 Main St, Apt 4B', 'New York', 'USA', 2, 0, 1, 85.00, TRUE, FALSE, '2023-02-01 10:00:00'),
(2, 1, 'Modern Manhattan Apartment', 'Spacious 2-bedroom apartment with stunning city views.', 'apartment', '456 Park Ave, Unit 12', 'New York', 'USA', 4, 2, 1, 150.00, TRUE, TRUE, '2023-02-15 14:30:00'),
(3, 2, 'Beachfront Villa', 'Luxurious villa with private pool and direct beach access.', 'villa', '789 Ocean Drive', 'Miami', 'USA', 8, 4, 3, 450.00, TRUE, TRUE, '2023-03-10 09:00:00'),
(4, 2, 'Downtown Miami Loft', 'Stylish loft in the arts district.', 'apartment', '321 Art District Blvd', 'Miami', 'USA', 3, 1, 1, 120.00, TRUE, FALSE, '2023-03-25 11:00:00'),
(5, 3, 'Suburban Family Home', 'Perfect for families, quiet neighborhood, large backyard.', 'house', '555 Maple Street', 'Austin', 'USA', 6, 3, 2, 180.00, TRUE, TRUE, '2023-04-05 15:00:00'),
(6, 3, 'Private Room in Shared House', 'Comfortable room in a friendly shared house.', 'room', '888 Oak Avenue', 'Austin', 'USA', 2, 1, 1, 45.00, TRUE, FALSE, '2023-04-20 10:30:00'),
(7, 5, 'Lake House Retreat', 'Beautiful lake house with dock and water activities.', 'house', '111 Lakeview Road', 'Austin', 'USA', 10, 5, 3, 350.00, TRUE, TRUE, '2023-06-01 08:00:00');

-- Non-validated accommodations (cannot be booked - pending approval)
INSERT INTO accommodations (id, host_id, title, description, type, address, city, country, capacity, bedrooms, bathrooms, base_price_night, is_validated, has_alarm_system, created_at) VALUES
(8, 4, 'Budget Room', 'Simple room for budget travelers.', 'room', '999 Budget Lane', 'New York', 'USA', 1, 1, 1, 30.00, FALSE, FALSE, '2023-04-10 16:00:00'),
(9, 5, 'Mountain Cabin', 'Rustic cabin in the mountains.', 'house', '777 Mountain Trail', 'Denver', 'USA', 4, 2, 1, 200.00, FALSE, FALSE, '2023-06-15 12:00:00');

-- Non-compliant accommodations (Villa/House without alarm system - cannot be booked)
INSERT INTO accommodations (id, host_id, title, description, type, address, city, country, capacity, bedrooms, bathrooms, base_price_night, is_validated, has_alarm_system, created_at) VALUES
(10, 1, 'Luxury Villa No Alarm', 'Beautiful villa but missing required alarm system.', 'villa', '1000 Luxury Lane', 'Los Angeles', 'USA', 6, 3, 2, 500.00, TRUE, FALSE, '2023-05-20 14:00:00'),
(11, 2, 'House Without Security', 'Nice house but non-compliant.', 'house', '2000 Security Blvd', 'Miami', 'USA', 5, 3, 2, 220.00, TRUE, FALSE, '2023-05-25 10:00:00');

-- Accommodation never booked (for testing)
INSERT INTO accommodations (id, host_id, title, description, type, address, city, country, capacity, bedrooms, bathrooms, base_price_night, is_validated, has_alarm_system, created_at) VALUES
(12, 3, 'Desert Oasis', 'Unique desert property, never been booked yet.', 'house', '3000 Desert Road', 'Phoenix', 'USA', 4, 2, 2, 175.00, TRUE, TRUE, '2023-07-01 09:00:00');

SELECT 'Accommodations inserted successfully!' AS status;

-- =============================================================================
-- SECTION 4: ACCOMMODATION AMENITIES (Junction Table)
-- Link accommodations to their amenities
-- =============================================================================

INSERT INTO accommodation_amenities (accommodation_id, amenity_id) VALUES
-- Studio (1)
(1, 1), (1, 2), (1, 5), (1, 9),
-- Manhattan Apartment (2)
(2, 1), (2, 2), (2, 4), (2, 5), (2, 6), (2, 7), (2, 8), (2, 9), (2, 11),
-- Beachfront Villa (3)
(3, 1), (3, 2), (3, 3), (3, 4), (3, 5), (3, 6), (3, 7), (3, 8), (3, 9), (3, 11), (3, 12),
-- Miami Loft (4)
(4, 1), (4, 2), (4, 5), (4, 9), (4, 11),
-- Suburban Home (5)
(5, 1), (5, 2), (5, 4), (5, 5), (5, 6), (5, 7), (5, 8), (5, 9), (5, 12), (5, 13),
-- Private Room (6)
(6, 1), (6, 5), (6, 9),
-- Lake House (7)
(7, 1), (7, 2), (7, 3), (7, 4), (7, 5), (7, 6), (7, 7), (7, 8), (7, 9), (7, 12);

SELECT 'Accommodation amenities inserted successfully!' AS status;

-- =============================================================================
-- SECTION 5: AVAILABILITY
-- Available and unavailable periods
-- =============================================================================

-- Available periods (default - most dates available)
INSERT INTO availability (id, accommodation_id, start_date, end_date, is_available, reason) VALUES
(1, 1, '2024-01-01', '2024-12-31', TRUE, NULL),
(2, 2, '2024-01-01', '2024-12-31', TRUE, NULL),
(3, 3, '2024-01-01', '2024-12-31', TRUE, NULL),
(4, 4, '2024-01-01', '2024-12-31', TRUE, NULL),
(5, 5, '2024-01-01', '2024-12-31', TRUE, NULL),
(6, 6, '2024-01-01', '2024-12-31', TRUE, NULL),
(7, 7, '2024-01-01', '2024-12-31', TRUE, NULL);

-- Unavailable periods (blocked dates)
INSERT INTO availability (id, accommodation_id, start_date, end_date, is_available, reason) VALUES
(8, 1, '2024-07-04', '2024-07-06', FALSE, 'Host maintenance'),
(9, 2, '2024-12-24', '2024-12-26', FALSE, 'Host family visit'),
(10, 3, '2024-08-15', '2024-08-20', FALSE, 'Hurricane season closure'),
(11, 5, '2024-11-25', '2024-11-30', FALSE, 'Thanksgiving holiday'),
(12, 7, '2024-06-15', '2024-06-20', FALSE, 'Host personal use');

SELECT 'Availability inserted successfully!' AS status;

-- =============================================================================
-- SECTION 6: PRICING RULES
-- Seasonal and event-based pricing
-- =============================================================================

INSERT INTO pricing_rules (id, accommodation_id, start_date, end_date, price_multiplier, reason) VALUES
-- Summer peak season
(1, 1, '2024-06-01', '2024-08-31', 1.30, 'Summer peak season'),
(2, 2, '2024-06-01', '2024-08-31', 1.40, 'Summer peak season'),
(3, 3, '2024-06-01', '2024-08-31', 1.50, 'Summer peak season'),
-- Holiday pricing
(4, 2, '2024-12-20', '2024-12-31', 1.80, 'Holiday season'),
(5, 3, '2024-12-20', '2024-12-31', 2.00, 'Holiday season'),
-- Spring break
(6, 3, '2024-03-01', '2024-03-31', 1.40, 'Spring break'),
(7, 4, '2024-03-01', '2024-03-31', 1.25, 'Spring break'),
-- SXSW in Austin
(8, 5, '2024-03-08', '2024-03-17', 1.60, 'SXSW Festival'),
(9, 6, '2024-03-08', '2024-03-17', 1.50, 'SXSW Festival'),
-- Memorial Day weekend
(10, 7, '2024-05-24', '2024-05-27', 1.35, 'Memorial Day weekend');

SELECT 'Pricing rules inserted successfully!' AS status;

-- =============================================================================
-- SECTION 7: ADDITIONAL FEES
-- Cleaning, service, and tax fees
-- =============================================================================

INSERT INTO additional_fees (id, accommodation_id, fee_type, amount, is_percentage) VALUES
-- Cleaning fees (fixed)
(1, 1, 'cleaning', 50.00, FALSE),
(2, 2, 'cleaning', 75.00, FALSE),
(3, 3, 'cleaning', 150.00, FALSE),
(4, 4, 'cleaning', 60.00, FALSE),
(5, 5, 'cleaning', 100.00, FALSE),
(6, 6, 'cleaning', 25.00, FALSE),
(7, 7, 'cleaning', 125.00, FALSE),
-- Service fees (percentage)
(8, 1, 'service', 12.00, TRUE),
(9, 2, 'service', 12.00, TRUE),
(10, 3, 'service', 10.00, TRUE),
(11, 4, 'service', 12.00, TRUE),
(12, 5, 'service', 10.00, TRUE),
(13, 6, 'service', 15.00, TRUE),
(14, 7, 'service', 10.00, TRUE),
-- Tax fees (percentage)
(15, 1, 'tax', 8.50, TRUE),
(16, 2, 'tax', 8.50, TRUE),
(17, 3, 'tax', 7.00, TRUE),
(18, 4, 'tax', 7.00, TRUE),
(19, 5, 'tax', 8.25, TRUE),
(20, 6, 'tax', 8.25, TRUE),
(21, 7, 'tax', 8.25, TRUE);

SELECT 'Additional fees inserted successfully!' AS status;

-- =============================================================================
-- SECTION 8: CANCELLATION POLICIES
-- Note: Default policies are created by trigger, but we can add custom ones
-- =============================================================================

-- Update some policies to different types for testing
UPDATE cancellation_policies SET policy_type = 'flexible', days_before_full_refund = 5 
WHERE accommodation_id = 1;

UPDATE cancellation_policies SET policy_type = 'strict', days_before_full_refund = 14, partial_refund_percent = 25.00 
WHERE accommodation_id = 3;

UPDATE cancellation_policies SET policy_type = 'strict', days_before_full_refund = 14, partial_refund_percent = 30.00 
WHERE accommodation_id = 7;

SELECT 'Cancellation policies updated successfully!' AS status;

-- =============================================================================
-- SECTION 9: BOOKINGS
-- Mix of pending, validated, canceled, and completed bookings
-- Note: total_amount is calculated by trigger
-- =============================================================================

-- Temporarily disable triggers for manual insertion with specific amounts
-- (In production, triggers would calculate this automatically)

-- Validated bookings (confirmed, upcoming or current)
INSERT INTO bookings (id, guest_id, accommodation_id, check_in_date, check_out_date, status, total_amount, created_at, cancellation_policy_id) VALUES
(1, 6, 1, '2024-07-15', '2024-07-20', 'validated', 542.50, '2024-01-15 10:00:00', 1),
(2, 7, 2, '2024-08-01', '2024-08-05', 'validated', 795.60, '2024-01-20 14:30:00', 2),
(3, 8, 3, '2024-09-10', '2024-09-15', 'validated', 2925.00, '2024-02-01 09:00:00', 3),
(4, 9, 4, '2024-07-20', '2024-07-25', 'validated', 735.00, '2024-02-10 11:00:00', 4),
(5, 10, 5, '2024-08-15', '2024-08-20', 'validated', 1185.00, '2024-03-01 15:00:00', 5);

-- Completed bookings (past stays, eligible for reviews)
INSERT INTO bookings (id, guest_id, accommodation_id, check_in_date, check_out_date, status, total_amount, created_at, cancellation_policy_id) VALUES
(6, 6, 2, '2024-01-10', '2024-01-15', 'completed', 750.00, '2023-12-01 10:00:00', 2),
(7, 7, 1, '2024-02-14', '2024-02-16', 'completed', 225.00, '2023-12-15 14:00:00', 1),
(8, 8, 5, '2024-03-05', '2024-03-10', 'completed', 1050.00, '2024-01-10 09:00:00', 5),
(9, 9, 3, '2024-04-01', '2024-04-05', 'completed', 2100.00, '2024-02-15 11:30:00', 3),
(10, 10, 4, '2024-05-20', '2024-05-25', 'completed', 675.00, '2024-04-01 16:00:00', 4),
(11, 11, 6, '2024-03-12', '2024-03-15', 'completed', 172.50, '2024-02-01 10:00:00', 6),
(12, 12, 7, '2024-06-01', '2024-06-05', 'completed', 1680.00, '2024-04-15 14:00:00', 7),
(13, 6, 3, '2024-05-15', '2024-05-20', 'completed', 2625.00, '2024-03-20 09:30:00', 3),
(14, 7, 4, '2024-04-10', '2024-04-14', 'completed', 540.00, '2024-02-28 11:00:00', 4),
(15, 8, 1, '2024-06-10', '2024-06-12', 'completed', 195.00, '2024-05-01 15:30:00', 1);

-- Canceled bookings
INSERT INTO bookings (id, guest_id, accommodation_id, check_in_date, check_out_date, status, total_amount, created_at, cancellation_policy_id) VALUES
(16, 11, 2, '2024-07-01', '2024-07-07', 'canceled', 1080.00, '2024-01-05 10:00:00', 2),
(17, 12, 5, '2024-08-01', '2024-08-05', 'canceled', 840.00, '2024-02-20 14:00:00', 5),
(18, 13, 1, '2024-09-01', '2024-09-05', 'canceled', 390.00, '2024-03-10 09:00:00', 1),
(19, 14, 4, '2024-07-10', '2024-07-15', 'canceled', 675.00, '2024-04-05 11:30:00', 4),
(20, 15, 6, '2024-08-20', '2024-08-25', 'canceled', 287.50, '2024-05-15 16:00:00', 6);

-- Pending bookings (awaiting confirmation)
INSERT INTO bookings (id, guest_id, accommodation_id, check_in_date, check_out_date, status, total_amount, created_at, cancellation_policy_id) VALUES
(21, 14, 1, '2024-10-01', '2024-10-05', 'pending', 390.00, '2024-06-01 10:00:00', 1),
(22, 15, 2, '2024-11-15', '2024-11-20', 'pending', 975.00, '2024-06-15 14:00:00', 2);

-- High-volume guest bookings (Alice - guest 6 has many bookings)
INSERT INTO bookings (id, guest_id, accommodation_id, check_in_date, check_out_date, status, total_amount, created_at, cancellation_policy_id) VALUES
(23, 6, 4, '2024-11-01', '2024-11-05', 'validated', 600.00, '2024-05-20 10:00:00', 4),
(24, 6, 5, '2024-12-10', '2024-12-15', 'pending', 1050.00, '2024-06-10 14:00:00', 5),
(25, 6, 7, '2024-12-20', '2024-12-25', 'validated', 2100.00, '2024-06-20 09:00:00', 7);

SELECT 'Bookings inserted successfully!' AS status;

-- =============================================================================
-- SECTION 10: PAYMENTS
-- Various payment statuses for bookings
-- =============================================================================

INSERT INTO payments (id, booking_id, amount, payment_type, status, payment_date, transaction_reference) VALUES
-- Completed payments
(1, 1, 542.50, 'full', 'completed', '2024-01-15 10:30:00', 'TXN-20240115-001'),
(2, 6, 750.00, 'full', 'completed', '2023-12-01 10:15:00', 'TXN-20231201-001'),
(3, 7, 225.00, 'full', 'completed', '2023-12-15 14:30:00', 'TXN-20231215-001'),
(4, 8, 500.00, 'deposit', 'completed', '2024-01-10 09:30:00', 'TXN-20240110-001'),
(5, 8, 550.00, 'balance', 'completed', '2024-02-20 10:00:00', 'TXN-20240220-001'),
(6, 9, 2100.00, 'full', 'completed', '2024-02-15 12:00:00', 'TXN-20240215-001'),
(7, 10, 675.00, 'full', 'completed', '2024-04-01 16:30:00', 'TXN-20240401-001'),
(8, 11, 172.50, 'full', 'completed', '2024-02-01 10:30:00', 'TXN-20240201-001'),
(9, 12, 1680.00, 'full', 'completed', '2024-04-15 14:30:00', 'TXN-20240415-001'),
(10, 13, 2625.00, 'full', 'completed', '2024-03-20 10:00:00', 'TXN-20240320-001'),
(11, 14, 540.00, 'full', 'completed', '2024-02-28 11:30:00', 'TXN-20240228-001'),
(12, 15, 195.00, 'full', 'completed', '2024-05-01 16:00:00', 'TXN-20240501-001'),

-- Pending payments
(13, 2, 795.60, 'full', 'pending', NULL, NULL),
(14, 3, 1462.50, 'deposit', 'pending', NULL, NULL),
(15, 4, 367.50, 'deposit', 'pending', NULL, NULL),
(16, 21, 195.00, 'deposit', 'pending', NULL, NULL),

-- Failed payments
(17, 5, 592.50, 'deposit', 'failed', '2024-03-01 15:30:00', 'TXN-FAILED-001'),

-- Refunded payments (for canceled bookings)
(18, 16, 1080.00, 'refund', 'completed', '2024-01-20 10:00:00', 'REFUND-20240120-001'),
(19, 17, 840.00, 'refund', 'completed', '2024-02-25 14:00:00', 'REFUND-20240225-001'),
(20, 18, 390.00, 'refund', 'completed', '2024-03-15 09:30:00', 'REFUND-20240315-001'),
(21, 19, 337.50, 'refund', 'completed', '2024-04-10 11:00:00', 'REFUND-20240410-001'),
(22, 20, 143.75, 'refund', 'completed', '2024-05-20 16:00:00', 'REFUND-20240520-001');

SELECT 'Payments inserted successfully!' AS status;

-- =============================================================================
-- SECTION 11: REVIEWS
-- Mix of positive and negative reviews with comments
-- =============================================================================

-- Positive reviews (4-5 stars)
INSERT INTO reviews (id, booking_id, accommodation_id, guest_id, rating, comment, created_at) VALUES
(1, 6, 2, 6, 5, 'Absolutely fantastic apartment! The view was incredible and everything was spotless. John was a great host, very responsive. Would definitely stay again!', '2024-01-16 10:00:00'),
(2, 7, 1, 7, 4, 'Great location in downtown. The studio was cozy and had everything I needed. Minor issue with the WiFi but John fixed it quickly.', '2024-02-17 14:00:00'),
(3, 8, 5, 8, 5, 'Perfect for our family vacation! The backyard was amazing for the kids. Michael was very accommodating with our early check-in request.', '2024-03-11 09:00:00'),
(4, 9, 3, 9, 5, 'Paradise! The private pool and beach access made this the best vacation ever. Sarah thought of every detail.', '2024-04-06 11:00:00'),
(5, 10, 4, 10, 4, 'Stylish loft in a great location. Close to all the art galleries and restaurants. Would recommend!', '2024-05-26 15:00:00'),
(6, 11, 6, 11, 4, 'Clean room, friendly housemates. Great value for the price. Would stay again.', '2024-03-16 10:00:00'),
(7, 12, 7, 12, 5, 'The lake house exceeded all expectations! We spent every evening on the dock watching the sunset. David was an amazing host.', '2024-06-06 14:00:00'),
(8, 13, 3, 6, 5, 'Second time staying here and just as wonderful as the first! Sarah is the best host.', '2024-05-21 09:30:00'),
(9, 14, 4, 7, 4, 'Lovely arts district location. The loft is exactly as pictured. Minor noise from the street but expected in this area.', '2024-04-15 11:00:00'),
(10, 15, 1, 8, 4, 'Perfect for a quick weekend getaway. Clean and well-located.', '2024-06-13 16:00:00');

-- Negative reviews (1-3 stars)
INSERT INTO reviews (id, booking_id, accommodation_id, guest_id, rating, comment, created_at) VALUES
(11, 6, 2, 6, 2, 'The apartment was not clean when we arrived. Had to wait 2 hours for cleaning. Very disappointing start to our vacation.', '2024-01-16 12:00:00'),
(12, 8, 5, 8, 3, 'House was okay but the AC was not working properly during our stay. Made for some uncomfortable nights.', '2024-03-12 10:00:00'),
(13, 9, 3, 9, 1, 'Terrible experience! Pool was dirty, beach access was blocked by construction. False advertising!', '2024-04-07 09:00:00'),
(14, 10, 4, 10, 2, 'Very noisy at night, could not sleep. The loft is above a bar that plays loud music until 3am. Not mentioned in listing!', '2024-05-27 14:00:00'),
(15, 11, 6, 11, 3, 'Room was fine but shared bathroom was always occupied. Need more facilities for number of guests.', '2024-03-17 11:00:00'),
(16, 12, 7, 12, 2, 'Beautiful location but house was poorly maintained. Several appliances were broken. Expected better for the price.', '2024-06-07 10:00:00');

-- Mixed reviews (3 stars)
INSERT INTO reviews (id, booking_id, accommodation_id, guest_id, rating, comment, created_at) VALUES
(17, 13, 3, 6, 3, 'Good location and amenities but overpriced for what you get. Could find better value elsewhere.', '2024-05-22 15:00:00'),
(18, 14, 4, 7, 3, 'Average experience. Nothing special but nothing terrible either.', '2024-04-16 09:00:00'),
(19, 15, 1, 8, 3, 'Studio is small as expected but the bed was uncomfortable. Okay for short stays only.', '2024-06-14 10:00:00');

SELECT 'Reviews inserted successfully!' AS status;

-- =============================================================================
-- SECTION 12: MESSAGES
-- Communication between guests and hosts
-- =============================================================================

INSERT INTO messages (id, sender_id, receiver_id, booking_id, content, sent_at, is_read) VALUES
-- Booking 1 messages
(1, 6, 1, 1, 'Hi John! Looking forward to our stay. Is early check-in possible?', '2024-01-15 10:30:00', TRUE),
(2, 1, 6, 1, 'Hi Alice! Yes, we can arrange early check-in at 1pm. See you then!', '2024-01-15 11:00:00', TRUE),
(3, 6, 1, 1, 'Perfect, thank you!', '2024-01-15 11:15:00', TRUE),

-- Booking 3 messages
(4, 8, 2, 3, 'Hello Sarah, we are celebrating our anniversary. Any special arrangements possible?', '2024-02-01 09:30:00', TRUE),
(5, 2, 8, 3, 'Congratulations! I will leave a bottle of champagne and some chocolates for you.', '2024-02-01 10:00:00', TRUE),
(6, 8, 2, 3, 'That is so kind, thank you very much!', '2024-02-01 10:15:00', TRUE),

-- General inquiry (no booking)
(7, 9, 3, NULL, 'Hi Michael, is your house pet-friendly? We have a small dog.', '2024-03-01 14:00:00', TRUE),
(8, 3, 9, NULL, 'Yes, we accept well-behaved pets. There is a $50 pet fee.', '2024-03-01 14:30:00', FALSE),

-- Booking 6 messages (completed stay)
(9, 6, 1, 6, 'Thank you for the wonderful stay! The apartment was perfect.', '2024-01-16 09:00:00', TRUE),
(10, 1, 6, 6, 'So glad you enjoyed it! Hope to host you again soon.', '2024-01-16 09:30:00', TRUE),

-- Cancellation message
(11, 11, 1, 16, 'I need to cancel my booking due to a family emergency. Sorry for the short notice.', '2024-01-10 09:00:00', TRUE),
(12, 1, 11, 16, 'No problem, I understand. I have processed the cancellation.', '2024-01-10 10:00:00', TRUE),

-- More messages
(13, 10, 2, 4, 'Hi Sarah, what is the parking situation at the loft?', '2024-02-10 11:30:00', TRUE),
(14, 2, 10, 4, 'There is street parking available and a garage nearby for $20/day.', '2024-02-10 12:00:00', TRUE),
(15, 12, 5, 12, 'David, we are arriving late around 10pm. Is that okay?', '2024-05-30 15:00:00', TRUE),
(16, 5, 12, 12, 'No problem at all! I will leave the key in the lockbox.', '2024-05-30 15:30:00', FALSE);

SELECT 'Messages inserted successfully!' AS status;

-- =============================================================================
-- SECTION 13: INVALID BOOKING ATTEMPTS (Commented Out)
-- These would fail due to trigger constraints - shown for documentation
-- =============================================================================

/*
-- ATTEMPT 1: Booking unavailable dates
-- This would fail because accommodation 1 has unavailable period July 4-6
INSERT INTO bookings (guest_id, accommodation_id, check_in_date, check_out_date, status) 
VALUES (6, 1, '2024-07-04', '2024-07-06', 'pending');
-- ERROR: Accommodation is not available for the selected dates

-- ATTEMPT 2: Booking non-compliant property (Villa without alarm)
-- This would fail because accommodation 10 is a villa without alarm system
INSERT INTO bookings (guest_id, accommodation_id, check_in_date, check_out_date, status) 
VALUES (6, 10, '2024-08-01', '2024-08-07', 'pending');
-- ERROR: This property type requires an alarm system for booking

-- ATTEMPT 3: Booking non-validated accommodation
-- This would fail because accommodation 8 is not validated
INSERT INTO bookings (guest_id, accommodation_id, check_in_date, check_out_date, status) 
VALUES (7, 8, '2024-09-01', '2024-09-05', 'pending');
-- ERROR: Accommodation does not exist or is not validated

-- ATTEMPT 4: Overlapping booking
-- This would fail because accommodation 1 is already booked July 15-20
INSERT INTO bookings (guest_id, accommodation_id, check_in_date, check_out_date, status) 
VALUES (7, 1, '2024-07-18', '2024-07-22', 'pending');
-- ERROR: Accommodation is already booked for the selected dates

-- ATTEMPT 5: Invalid date range (checkout before checkin)
-- This would fail due to CHECK constraint
INSERT INTO bookings (guest_id, accommodation_id, check_in_date, check_out_date, status) 
VALUES (8, 2, '2024-08-10', '2024-08-05', 'pending');
-- ERROR: CHECK constraint violation

-- ATTEMPT 6: Duplicate review
-- This would fail because booking 6 already has a review
INSERT INTO reviews (booking_id, accommodation_id, guest_id, rating, comment) 
VALUES (6, 2, 6, 5, 'Another review');
-- ERROR: A review already exists for this booking

-- ATTEMPT 7: Review for non-completed booking
-- This would fail because booking 1 is not completed
INSERT INTO reviews (booking_id, accommodation_id, guest_id, rating, comment) 
VALUES (1, 1, 6, 4, 'Early review');
-- ERROR: Can only review completed bookings

-- ATTEMPT 8: Invalid rating
-- This would fail due to CHECK constraint
INSERT INTO reviews (booking_id, accommodation_id, guest_id, rating, comment) 
VALUES (6, 2, 6, 6, 'Invalid rating');
-- ERROR: CHECK constraint violation (rating must be 1-5)

-- ATTEMPT 9: Message to self
-- This would fail due to CHECK constraint
INSERT INTO messages (sender_id, receiver_id, content) 
VALUES (1, 1, 'Message to myself');
-- ERROR: CHECK constraint violation (sender != receiver)

-- ATTEMPT 10: Negative base price
-- This would fail due to CHECK constraint
UPDATE accommodations SET base_price_night = -100 WHERE id = 1;
-- ERROR: CHECK constraint violation (price must be positive)
*/

SELECT 'Invalid booking attempts documented (commented out)' AS status;

-- =============================================================================
-- SECTION 14: ADDITIONAL TEST DATA FOR EDGE CASES
-- =============================================================================

-- Add more bookings for high-volume guest (Alice - user 6)
INSERT INTO bookings (id, guest_id, accommodation_id, check_in_date, check_out_date, status, total_amount, created_at, cancellation_policy_id) VALUES
(26, 6, 2, '2024-02-01', '2024-02-05', 'completed', 600.00, '2024-01-01 10:00:00', 2),
(27, 6, 3, '2024-03-01', '2024-03-05', 'completed', 1800.00, '2024-02-01 14:00:00', 3),
(28, 6, 4, '2024-04-01', '2024-04-05', 'completed', 600.00, '2024-03-01 09:00:00', 4),
(29, 6, 5, '2024-05-01', '2024-05-05', 'completed', 840.00, '2024-04-01 11:00:00', 5),
(30, 6, 6, '2024-06-01', '2024-06-05', 'completed', 287.50, '2024-05-01 15:00:00', 6);

-- Add corresponding payments
INSERT INTO payments (id, booking_id, amount, payment_type, status, payment_date, transaction_reference) VALUES
(23, 26, 600.00, 'full', 'completed', '2024-01-01 10:30:00', 'TXN-20240101-001'),
(24, 27, 1800.00, 'full', 'completed', '2024-02-01 14:30:00', 'TXN-20240201-001'),
(25, 28, 600.00, 'full', 'completed', '2024-03-01 09:30:00', 'TXN-20240301-001'),
(26, 29, 840.00, 'full', 'completed', '2024-04-01 11:30:00', 'TXN-20240401-001'),
(27, 30, 287.50, 'full', 'completed', '2024-05-01 15:30:00', 'TXN-20240501-001');

-- Add corresponding reviews for high-volume guest
INSERT INTO reviews (id, booking_id, accommodation_id, guest_id, rating, comment, created_at) VALUES
(20, 26, 2, 6, 5, 'Another great stay at Johns apartment!', '2024-02-06 10:00:00'),
(21, 27, 3, 6, 5, 'Sarahs villa never disappoints!', '2024-03-06 09:00:00'),
(22, 28, 4, 6, 4, 'Great arts district location as always.', '2024-04-06 11:00:00'),
(23, 29, 5, 6, 5, 'Perfect family home, kids loved the backyard!', '2024-05-06 14:00:00'),
(24, 30, 6, 6, 4, 'Clean room, good value.', '2024-06-06 10:00:00');

-- Add a few more low-volume guest bookings for comparison
INSERT INTO bookings (id, guest_id, accommodation_id, check_in_date, check_out_date, status, total_amount, created_at, cancellation_policy_id) VALUES
(31, 15, 1, '2024-09-15', '2024-09-20', 'validated', 475.00, '2024-07-01 10:00:00', 1),
(32, 14, 2, '2024-10-10', '2024-10-15', 'pending', 937.50, '2024-07-15 14:00:00', 2);

INSERT INTO payments (id, booking_id, amount, payment_type, status, payment_date, transaction_reference) VALUES
(28, 31, 237.50, 'deposit', 'completed', '2024-07-01 10:30:00', 'TXN-20240701-001'),
(29, 32, 468.75, 'deposit', 'pending', NULL, NULL);

SELECT 'Additional test data inserted successfully!' AS status;

-- =============================================================================
-- TEST DATA INSERTION COMPLETE
-- =============================================================================

-- Summary of inserted data
SELECT 'TEST DATA SUMMARY' AS section, '' AS count
UNION ALL
SELECT 'Users', COUNT(*) FROM users
UNION ALL
SELECT 'Hosts', COUNT(*) FROM users WHERE is_host = TRUE
UNION ALL
SELECT 'Guests', COUNT(*) FROM users WHERE is_host = FALSE
UNION ALL
SELECT 'Amenities', COUNT(*) FROM amenities
UNION ALL
SELECT 'Accommodations', COUNT(*) FROM accommodations
UNION ALL
SELECT 'Validated Accommodations', COUNT(*) FROM accommodations WHERE is_validated = TRUE
UNION ALL
SELECT 'Non-Validated Accommodations', COUNT(*) FROM accommodations WHERE is_validated = FALSE
UNION ALL
SELECT 'Accommodation Amenities', COUNT(*) FROM accommodation_amenities
UNION ALL
SELECT 'Availability Records', COUNT(*) FROM availability
UNION ALL
SELECT 'Pricing Rules', COUNT(*) FROM pricing_rules
UNION ALL
SELECT 'Additional Fees', COUNT(*) FROM additional_fees
UNION ALL
SELECT 'Cancellation Policies', COUNT(*) FROM cancellation_policies
UNION ALL
SELECT 'Bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'Pending Bookings', COUNT(*) FROM bookings WHERE status = 'pending'
UNION ALL
SELECT 'Validated Bookings', COUNT(*) FROM bookings WHERE status = 'validated'
UNION ALL
SELECT 'Completed Bookings', COUNT(*) FROM bookings WHERE status = 'completed'
UNION ALL
SELECT 'Canceled Bookings', COUNT(*) FROM bookings WHERE status = 'canceled'
UNION ALL
SELECT 'Payments', COUNT(*) FROM payments
UNION ALL
SELECT 'Reviews', COUNT(*) FROM reviews
UNION ALL
SELECT 'Messages', COUNT(*) FROM messages;
