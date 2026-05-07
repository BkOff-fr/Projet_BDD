-- =============================================================================
-- [§ 4e]  TEST DATASET — contrasting use cases:
--   - validated and non-validated accommodations               [§ 4e]
--   - compliant (alarm) and non-compliant (no alarm)            [§ 4d]
--   - bookings in every status: pending / confirmed /
--     completed / cancelled                                     [§ 4e]
--   - both highly positive and highly negative reviews          [§ 4e]
--   - users with many bookings vs only one                      [§ 4e]
--   - at least one accommodation never booked                   [§ 4e + § 4f]
--   - 10 invalid attempts that the database must reject
--     (commented at the end of this file)                       [§ 4e]
-- All passwords are bcrypt of "password123".
-- =============================================================================

SET @pw := '$2a$10$tPxu/jcK4J80JxRRa7iK8utkf8ri6dq2UJJ6YATfoRk3A9LFg7Ha2';

-- =============================================================================
-- USERS  (1–5 hosts, 6 dual, 7–15 guests)
-- =============================================================================
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, is_host, is_active, created_at) VALUES
(1, 'john.smith@example.com',     @pw, 'John',    'Smith',     '+1-202-555-0101', TRUE,  TRUE, '2022-01-15 10:00:00'),
(2, 'sarah.johnson@example.com',  @pw, 'Sarah',   'Johnson',   '+1-202-555-0102', TRUE,  TRUE, '2022-03-20 09:00:00'),
(3, 'michael.brown@example.com',  @pw, 'Michael', 'Brown',     '+1-202-555-0103', TRUE,  TRUE, '2022-06-01 14:00:00'),
(4, 'emma.wilson@example.com',    @pw, 'Emma',    'Wilson',    '+1-202-555-0104', TRUE,  TRUE, '2022-09-12 11:00:00'),
(5, 'david.lee@example.com',      @pw, 'David',   'Lee',       '+1-202-555-0105', TRUE,  TRUE, '2023-01-05 08:30:00'),
(6, 'alice.guest@example.com',    @pw, 'Alice',   'Martin',    '+1-202-555-0106', TRUE,  TRUE, '2023-02-10 16:00:00'),
(7, 'bob.guest@example.com',      @pw, 'Bob',     'Garcia',    '+1-202-555-0107', FALSE, TRUE, '2023-04-18 12:00:00'),
(8, 'carol.guest@example.com',    @pw, 'Carol',   'Rodriguez', '+1-202-555-0108', FALSE, TRUE, '2023-05-22 09:30:00'),
(9, 'dan.guest@example.com',      @pw, 'Dan',     'Lopez',     '+1-202-555-0109', FALSE, TRUE, '2023-07-08 11:15:00'),
(10,'emily.guest@example.com',    @pw, 'Emily',   'Gonzalez',  '+1-202-555-0110', FALSE, TRUE, '2023-08-30 14:45:00'),
(11,'frank.guest@example.com',    @pw, 'Frank',   'Perez',     '+1-202-555-0111', FALSE, TRUE, '2023-10-12 10:00:00'),
(12,'grace.guest@example.com',    @pw, 'Grace',   'Sanchez',   '+1-202-555-0112', FALSE, TRUE, '2024-01-20 15:30:00'),
(13,'henry.guest@example.com',    @pw, 'Henry',   'Ramirez',   '+1-202-555-0113', FALSE, TRUE, '2024-03-05 09:00:00'),
(14,'iris.guest@example.com',     @pw, 'Iris',    'Torres',    '+1-202-555-0114', FALSE, TRUE, '2024-06-18 13:00:00'),
(15,'jack.newbie@example.com',    @pw, 'Jack',    'Flores',    '+1-202-555-0115', FALSE, TRUE, '2026-04-01 10:00:00');

-- =============================================================================
-- [§ 3]  CANCELLATION_POLICIES (refund rules)
-- =============================================================================
INSERT INTO cancellation_policies (id, name, description, full_refund_days_before, partial_refund_days_before, partial_refund_percentage) VALUES
(1, 'flexible', 'Full refund up to 24 hours before check-in. 50% refund after.',                 1,  0, 50.00),
(2, 'moderate', 'Full refund up to 5 days before check-in. 50% refund within 5 days.',           5,  1, 50.00),
(3, 'strict',   'Full refund up to 30 days before check-in. 50% up to 14 days. No refund after.',30, 14, 50.00),
(4, 'no_refund','No refund regardless of cancellation date.',                                      0,  0,  0.00);

-- =============================================================================
-- [§ 4d] [§ 4e] [§ 4f]  ACCOMMODATIONS
--   1–10 : validated + compliant (have bookings)
--   11   : validated + compliant — NEVER booked     [§ 4e + § 4f]
--   12   : NOT validated + compliant alarm           [§ 4e non-validated]
--   13   : NOT validated + NO alarm                  [§ 4d non-compliant]
-- =============================================================================
INSERT INTO accommodations (id, host_id, cancellation_policy_id, title, description, type, address, city, country, latitude, longitude, max_guests, bedrooms, beds, bathrooms, price_per_night, minimum_nights, maximum_nights, instant_book, house_rules, is_active, is_validated, has_alarm_system, has_smoke_detector) VALUES
(1, 1, 1, 'Cozy Downtown Studio',       'Modern studio in the heart of the city, walking distance to everything.', 'studio',     '123 Main St',     'New York',   'USA', 40.7128,  -74.0060, 2, 0, 1, 1.0,  95.00, 1, 30, TRUE,  'No smoking. No parties.',                  TRUE, TRUE, TRUE, TRUE),
(2, 1, 2, 'Luxury Penthouse with View', 'Stunning penthouse with panoramic city skyline view and rooftop terrace.', 'apartment',  '456 Park Ave',    'New York',   'USA', 40.7610,  -73.9690, 4, 2, 2, 2.0, 185.00, 2, 60, FALSE, 'Quiet hours 10pm-7am.',                   TRUE, TRUE, TRUE, TRUE),
(3, 2, 3, 'Beachfront Villa Paradise',  'Private villa on the beach with infinity pool and direct sand access.',   'villa',      '789 Ocean Dr',    'Miami',      'USA', 25.7907,  -80.1300, 8, 4, 5, 3.5, 450.00, 3, 30, FALSE, 'No pets. No smoking. Pool closes at 11pm.',TRUE, TRUE, TRUE, TRUE),
(4, 3, 1, 'Trendy Arts District Loft',  'Industrial loft in the arts district, perfect for creatives.',            'apartment',  '321 Gallery Way', 'Austin',     'USA', 30.2672,  -97.7431, 3, 1, 2, 1.0, 130.00, 2, 21, TRUE,  'No loud music after 10pm.',                TRUE, TRUE, TRUE, TRUE),
(5, 3, 2, 'Family Suburban House',      'Spacious family home with backyard, ideal for vacations with kids.',      'house',      '654 Oak Lane',    'Austin',     'USA', 30.4133,  -97.8000, 6, 3, 4, 2.5, 210.00, 3, 30, FALSE, 'Family-friendly only.',                    TRUE, TRUE, TRUE, TRUE),
(6, 4, 1, 'Charming Guesthouse Room',   'Private room in a quiet guesthouse, great budget option.',                'guesthouse', '12 Birch Rd',     'Boulder',    'USA', 40.0150, -105.2705, 2, 1, 1, 1.0,  55.00, 1, 14, TRUE,  'Shared bathroom. Quiet please.',           TRUE, TRUE, TRUE, TRUE),
(7, 5, 3, 'Lakeside Cabin Getaway',     'Peaceful cabin on the lake with private dock and fire pit.',              'cabin',      '88 Pine Trail',   'Lake Tahoe', 'USA', 39.0968, -120.0324, 4, 2, 3, 1.5, 340.00, 2, 28, FALSE, 'No smoking indoors.',                      TRUE, TRUE, TRUE, TRUE),
(8, 1, 2, 'Brooklyn Brownstone Apt',    'Classic brownstone apartment in a quiet neighborhood, close to subway.',  'apartment',  '22 Brooklyn Pl',  'New York',   'USA', 40.6782,  -73.9442, 4, 2, 2, 1.5, 140.00, 2, 30, TRUE,  'No smoking.',                              TRUE, TRUE, TRUE, TRUE),
(9, 2, 1, 'Miami Condo with Pool',      'Modern condo with shared pool and gym, 5 minutes from the beach.',        'condo',      '900 Collins Ave', 'Miami',      'USA', 25.7825,  -80.1340, 4, 2, 2, 2.0, 175.00, 2, 21, TRUE,  'Resort fees apply.',                       TRUE, TRUE, TRUE, TRUE),
(10,4, 2, 'Mountain Cabin Retreat',     'Quiet rustic cabin near hiking trails, fireplace included.',              'cabin',      '15 Summit Rd',    'Boulder',    'USA', 40.0500, -105.3000, 4, 2, 2, 1.0, 155.00, 2, 21, FALSE, 'No smoking. Bring warm clothes!',          TRUE, TRUE, TRUE, TRUE),
-- 11: validated + compliant, never booked → tests § 4f (LEFT JOIN must keep it visible)
(11,5, 1, 'New Listing — Boulder Loft', 'Brand-new urban loft, just listed and not yet booked.',                   'apartment',  '777 Pearl St',    'Boulder',    'USA', 40.0200, -105.2700, 2, 1, 1, 1.0, 120.00, 1, 14, TRUE,  'No smoking.',                              TRUE, TRUE, TRUE, TRUE),
-- 12: not yet validated by the platform → § 4e non-validated, cannot be booked (trigger rejects)
(12,5, 1, 'Pending Review — Lake View', 'Submitted by host but pending platform validation.',                      'cabin',      '90 Pine Trail',   'Lake Tahoe', 'USA', 39.0980, -120.0330, 4, 2, 2, 1.0, 200.00, 2, 14, FALSE, 'TBD',                                      TRUE, FALSE, TRUE, TRUE),
-- 13: missing alarm → § 4d non-compliant, cannot be validated (CHECK) and cannot be booked (trigger)
(13,4, 4, 'Old Cabin — No Alarm Yet',   'Listed but missing mandatory alarm system, awaiting hardware install.',   'cabin',      '40 Forest Way',   'Boulder',    'USA', 40.0300, -105.2900, 4, 2, 2, 1.0, 110.00, 2, 14, FALSE, 'Hardware install pending.',                TRUE, FALSE, FALSE, TRUE);

-- =============================================================================
-- AMENITIES
-- =============================================================================
INSERT INTO amenities (id, name, category, icon) VALUES
(1, 'WiFi',            'essentials',    'wifi'),
(2, 'Air conditioning','essentials',    'snowflake'),
(3, 'Heating',         'essentials',    'flame'),
(4, 'Kitchen',         'essentials',    'utensils'),
(5, 'Washer',          'essentials',    'washing-machine'),
(6, 'Dryer',           'essentials',    'wind'),
(7, 'TV',              'entertainment', 'tv'),
(8, 'Pool',            'features',      'waves'),
(9, 'Hot tub',         'features',      'droplet'),
(10,'Free parking',    'features',      'parking'),
(11,'Gym',             'features',      'dumbbell'),
(12,'Beach access',    'location',      'umbrella'),
(13,'Lake access',     'location',      'fish'),
(14,'Fireplace',       'features',      'flame'),
(15,'Pet friendly',    'policy',        'paw-print');

INSERT INTO accommodation_amenities (accommodation_id, amenity_id) VALUES
(1,1),(1,2),(1,3),(1,4),(1,7),
(2,1),(2,2),(2,3),(2,4),(2,5),(2,7),(2,11),
(3,1),(3,2),(3,3),(3,4),(3,5),(3,6),(3,7),(3,8),(3,12),
(4,1),(4,2),(4,3),(4,4),(4,7),
(5,1),(5,2),(5,3),(5,4),(5,5),(5,6),(5,7),(5,10),(5,15),
(6,1),(6,3),(6,4),
(7,1),(7,3),(7,4),(7,7),(7,9),(7,13),(7,14),
(8,1),(8,2),(8,3),(8,4),(8,5),(8,7),
(9,1),(9,2),(9,3),(9,4),(9,7),(9,8),(9,11),
(10,1),(10,3),(10,4),(10,7),(10,14),(10,15),
(11,1),(11,2),(11,3),(11,4),
(12,1),(12,3),(12,14);

-- =============================================================================
-- ACCOMMODATION_FEES (cleaning + service for each rentable property)
-- =============================================================================
INSERT INTO accommodation_fees (accommodation_id, fee_type, amount, is_percentage) VALUES
(1, 'cleaning', 50.00,  FALSE), (1, 'service', 12.00, TRUE),
(2, 'cleaning', 75.00,  FALSE), (2, 'service', 12.00, TRUE),
(3, 'cleaning', 200.00, FALSE), (3, 'service', 10.00, TRUE), (3,'pet', 50.00, FALSE),
(4, 'cleaning', 60.00,  FALSE), (4, 'service', 12.00, TRUE),
(5, 'cleaning', 100.00, FALSE), (5, 'service', 10.00, TRUE),
(6, 'cleaning', 20.00,  FALSE), (6, 'service', 15.00, TRUE),
(7, 'cleaning', 90.00,  FALSE), (7, 'service', 10.00, TRUE),
(8, 'cleaning', 50.00,  FALSE), (8, 'service', 12.00, TRUE),
(9, 'cleaning', 60.00,  FALSE), (9, 'service', 12.00, TRUE),
(10,'cleaning', 50.00,  FALSE), (10,'service', 10.00, TRUE),
(11,'cleaning', 40.00,  FALSE), (11,'service', 10.00, TRUE);

-- =============================================================================
-- AVAILABILITY (host-defined blocked windows)
-- =============================================================================
INSERT INTO availability (accommodation_id, start_date, end_date, is_available, reason) VALUES
(1, '2026-12-23', '2026-12-31', FALSE, 'Owner using the property for the holidays'),
(3, '2026-11-01', '2026-11-15', FALSE, 'Maintenance and renovation'),
(7, '2026-10-15', '2026-10-25', FALSE, 'Seasonal closure'),
(11,'2026-08-10', '2026-08-15', FALSE, 'Personal use by host');

-- =============================================================================
-- PRICING_RULES (seasonal adjustments)
-- =============================================================================
INSERT INTO pricing_rules (accommodation_id, name, description, start_date, end_date, rule_type, value, is_active) VALUES
(1, 'NYE bump',          'New Year holiday surge',     '2026-12-26', '2027-01-02', 'percentage_increase', 50.00, TRUE),
(3, 'Summer beach peak', 'Peak summer pricing',        '2026-06-15', '2026-08-31', 'percentage_increase', 30.00, TRUE),
(7, 'Winter discount',   'Off-season lake discount',   '2026-11-01', '2027-02-28', 'percentage_decrease', 20.00, TRUE),
(5, 'Spring promo',      'Limited-time spring promo',  '2026-03-01', '2026-04-30', 'fixed_decrease',      20.00, TRUE);

-- =============================================================================
-- BOOKINGS
-- All completed bookings have check_out_date <= today (2026-05-06) so the
-- review trigger accepts the matching reviews.
-- =============================================================================

-- Past completed bookings (eligible for reviews)
INSERT INTO bookings (id, accommodation_id, guest_id, check_in_date, check_out_date, num_guests, total_price, status, special_requests, created_at) VALUES
(1,  2, 6,  '2024-01-10', '2024-01-15', 2, 1050.00, 'completed', NULL,                       '2023-12-01 10:00:00'),
(2,  1, 7,  '2024-02-14', '2024-02-16', 2,  240.00, 'completed', 'Late check-in around 9pm', '2023-12-15 14:00:00'),
(3,  5, 8,  '2024-03-05', '2024-03-10', 5, 1150.00, 'completed', 'Travelling with kids',     '2024-01-10 09:00:00'),
(4,  3, 9,  '2024-04-01', '2024-04-05', 6, 2000.00, 'completed', NULL,                       '2024-02-15 11:30:00'),
(5,  4, 10, '2024-05-20', '2024-05-25', 3,  710.00, 'completed', NULL,                       '2024-04-01 16:00:00'),
(6,  6, 11, '2024-03-12', '2024-03-15', 1,  185.00, 'completed', NULL,                       '2024-02-01 10:00:00'),
(7,  7, 12, '2024-06-01', '2024-06-05', 4, 1450.00, 'completed', 'Quiet stay please',        '2024-04-15 14:00:00'),
(8,  3, 6,  '2024-05-15', '2024-05-20', 4, 2450.00, 'completed', 'Anniversary trip',         '2024-03-20 09:30:00'),
(9,  4, 7,  '2024-04-10', '2024-04-14', 2,  580.00, 'completed', NULL,                       '2024-02-28 11:00:00'),
(10, 1, 8,  '2024-06-10', '2024-06-12', 1,  240.00, 'completed', NULL,                       '2024-05-01 15:30:00'),
(11, 8, 9,  '2024-07-15', '2024-07-20', 3,  790.00, 'completed', NULL,                       '2024-04-15 10:00:00'),
(12, 9, 10, '2024-08-01', '2024-08-05', 4,  872.00, 'completed', NULL,                       '2024-04-20 14:30:00'),
(13, 7, 11, '2024-09-10', '2024-09-15', 4, 1850.00, 'completed', 'Need crib for baby',       '2024-05-01 09:00:00'),
(14,10, 6,  '2024-07-20', '2024-07-25', 2,  885.00, 'completed', NULL,                       '2024-04-10 11:00:00'),
(15, 5, 13, '2024-08-15', '2024-08-20', 5, 1150.00, 'completed', NULL,                       '2024-05-01 15:00:00'),
(16, 2, 6,  '2025-01-05', '2025-01-09', 2,  860.00, 'completed', NULL,                       '2024-11-15 10:00:00'),
(17, 3, 6,  '2025-06-12', '2025-06-18', 5, 3050.00, 'completed', NULL,                       '2025-04-10 09:00:00');

-- Future confirmed bookings (after today)
INSERT INTO bookings (id, accommodation_id, guest_id, check_in_date, check_out_date, num_guests, total_price, status, special_requests, created_at) VALUES
(18, 8, 9,  '2026-07-15', '2026-07-20', 3,  790.00, 'confirmed', NULL,                       '2026-04-15 10:00:00'),
(19, 9, 10, '2026-08-01', '2026-08-05', 4,  872.00, 'confirmed', NULL,                       '2026-04-20 14:30:00'),
(20, 7, 11, '2026-09-10', '2026-09-15', 4, 1850.00, 'confirmed', 'Need crib for baby',       '2026-05-01 09:00:00'),
(21,10, 12, '2026-07-22', '2026-07-25', 2,  535.00, 'confirmed', NULL,                       '2026-04-10 11:00:00'),
(22, 5, 13, '2026-08-15', '2026-08-20', 5, 1150.00, 'confirmed', NULL,                       '2026-05-01 15:00:00');

-- Pending bookings (awaiting host confirmation)
INSERT INTO bookings (id, accommodation_id, guest_id, check_in_date, check_out_date, num_guests, total_price, status, special_requests, created_at) VALUES
(23, 2, 14, '2026-10-01', '2026-10-05', 3,  852.00, 'pending', 'Possible early arrival',    '2026-04-01 10:00:00'),
(24, 3, 15, '2026-11-16', '2026-11-21', 4, 2450.00, 'pending', NULL,                        '2026-04-15 14:00:00');

-- Cancelled bookings (cancelled_at is auto-stamped by trigger on UPDATE,
-- but we set it explicitly here so historical INSERTs preserve the timestamp)
INSERT INTO bookings (id, accommodation_id, guest_id, check_in_date, check_out_date, num_guests, total_price, status, special_requests, cancelled_at, created_at) VALUES
(25, 1, 11, '2024-09-01', '2024-09-05', 2,  430.00, 'cancelled', NULL, '2024-08-15 12:00:00', '2024-03-10 09:00:00'),
(26, 5, 12, '2024-10-01', '2024-10-07', 4, 1360.00, 'cancelled', NULL, '2024-09-20 09:00:00', '2024-02-20 14:00:00'),
(27, 6, 13, '2024-08-20', '2024-08-25', 2,  295.00, 'cancelled', NULL, '2024-08-18 17:30:00', '2024-05-15 16:00:00');

-- =============================================================================
-- REVIEWS — one per completed booking; mix of strongly positive / negative.
-- =============================================================================
INSERT INTO reviews (id, booking_id, rating, comment, cleanliness_rating, accuracy_rating, checkin_rating, communication_rating, location_rating, value_rating, created_at) VALUES
(1,  1,  2, 'Apartment was not clean when we arrived. Disappointing start to our vacation.',                  2, 3, 4, 3, 5, 2, '2024-01-16 12:00:00'),
(2,  2,  4, 'Great location in downtown. The studio was cozy and had everything I needed.',                   4, 5, 5, 5, 5, 4, '2024-02-17 14:00:00'),
(3,  3,  3, 'House was okay but the AC was not working properly during our stay.',                            3, 4, 4, 4, 4, 3, '2024-03-12 10:00:00'),
(4,  4,  1, 'Terrible experience! Pool was dirty, beach access blocked by construction. False advertising!', 1, 1, 2, 2, 3, 1, '2024-04-07 09:00:00'),
(5,  5,  4, 'Stylish loft in a great location. Close to art galleries and restaurants.',                      4, 5, 4, 5, 5, 4, '2024-05-26 15:00:00'),
(6,  6,  3, 'Room was fine but shared bathroom was always occupied.',                                         4, 4, 4, 4, 4, 3, '2024-03-17 11:00:00'),
(7,  7,  5, 'The lake house exceeded all expectations! Spent every evening on the dock.',                     5, 5, 5, 5, 5, 5, '2024-06-06 14:00:00'),
(8,  8,  5, 'Second time staying here and just as wonderful as the first! Sarah is the best host.',           5, 5, 5, 5, 5, 5, '2024-05-21 09:30:00'),
(9,  9,  2, 'Very noisy at night, could not sleep. The loft is above a bar that plays loud music.',           4, 3, 4, 4, 5, 2, '2024-04-15 11:00:00'),
(10, 10, 4, 'Perfect for a quick weekend getaway. Clean and well-located.',                                   5, 4, 5, 4, 5, 4, '2024-06-13 16:00:00'),
(11, 11, 4, 'Great Brooklyn neighborhood, would book again.',                                                 5, 4, 4, 5, 4, 4, '2024-07-21 09:00:00'),
(12, 13, 5, 'Lake Tahoe was magical. Cabin was perfect for our family.',                                      5, 5, 5, 5, 5, 5, '2024-09-16 10:00:00'),
(13, 14, 4, 'Mountain views were stunning. Loved the fireplace.',                                             5, 4, 4, 5, 5, 4, '2024-07-26 14:00:00'),
(14, 16, 5, 'Even better than the first stay. View from the penthouse is unmatched.',                         5, 5, 5, 5, 5, 5, '2025-01-10 11:00:00'),
(15, 17, 5, 'The villa is paradise. Already planning the next trip.',                                         5, 5, 5, 5, 5, 5, '2025-06-19 09:00:00');
-- Bookings 12 and 15 have no review (allowed — review is optional).

-- =============================================================================
-- MESSAGES
-- =============================================================================
INSERT INTO messages (sender_id, receiver_id, accommodation_id, content, is_read, created_at) VALUES
( 6, 1, 2, 'Hi John! Looking forward to our stay. Is early check-in possible?', TRUE,  '2024-01-09 10:30:00'),
( 1, 6, 2, 'Hi Alice! Yes, early check-in at 1pm works.',                       TRUE,  '2024-01-09 11:00:00'),
( 9, 3, 5, 'Is your house pet-friendly? We have a small dog.',                  TRUE,  '2026-04-01 14:00:00'),
( 3, 9, 5, 'Yes, well-behaved pets are welcome with a 50 USD fee.',             FALSE, '2026-04-01 14:30:00'),
(12, 5, 7, 'Thank you for the wonderful stay!',                                 TRUE,  '2024-06-06 09:00:00'),
( 5,12, 7, 'So glad you enjoyed it! Hope to host you again soon.',              TRUE,  '2024-06-06 09:30:00'),
(14, 1, 2, 'Possible to arrive early at 11am?',                                 FALSE, '2026-04-02 09:00:00'),
( 8, 3, 3, 'Are towels and linens provided?',                                   FALSE, '2026-04-12 17:00:00');

-- =============================================================================
-- PAYMENTS — multi-step (deposit, balance, refund) for several bookings.
-- =============================================================================
INSERT INTO payments (booking_id, amount, payment_type, payment_method, status, transaction_id, paid_at, created_at) VALUES
(1, 1050.00, 'full',    'credit_card',   'completed', 'TXN-20231201-001', '2023-12-01 10:15:00', '2023-12-01 10:00:00'),
(2,  240.00, 'full',    'credit_card',   'completed', 'TXN-20231215-001', '2023-12-15 14:30:00', '2023-12-15 14:00:00'),
(3,  500.00, 'deposit', 'paypal',        'completed', 'TXN-20240110-D01', '2024-01-10 09:30:00', '2024-01-10 09:00:00'),
(3,  650.00, 'balance', 'paypal',        'completed', 'TXN-20240220-B01', '2024-02-20 09:30:00', '2024-02-20 09:00:00'),
(4, 2000.00, 'full',    'credit_card',   'completed', 'TXN-20240215-001', '2024-02-15 12:00:00', '2024-02-15 11:30:00'),
(5,  710.00, 'full',    'credit_card',   'completed', 'TXN-20240401-001', '2024-04-01 16:30:00', '2024-04-01 16:00:00'),
(6,  185.00, 'full',    'paypal',        'completed', 'TXN-20240201-001', '2024-02-01 10:30:00', '2024-02-01 10:00:00'),
(7, 1450.00, 'full',    'credit_card',   'completed', 'TXN-20240415-001', '2024-04-15 14:30:00', '2024-04-15 14:00:00'),
(8, 1000.00, 'deposit', 'bank_transfer', 'completed', 'TXN-20240320-D01', '2024-03-20 10:00:00', '2024-03-20 09:30:00'),
(8, 1450.00, 'balance', 'bank_transfer', 'completed', 'TXN-20240501-B01', '2024-05-01 10:00:00', '2024-04-30 09:30:00'),
(9,  580.00, 'full',    'credit_card',   'completed', 'TXN-20240228-001', '2024-02-28 11:30:00', '2024-02-28 11:00:00'),
(10, 240.00, 'full',    'credit_card',   'completed', 'TXN-20240501-002', '2024-05-01 16:00:00', '2024-05-01 15:30:00'),
(11, 790.00, 'full',    'credit_card',   'completed', 'TXN-20240415-002', '2024-04-15 10:30:00', '2024-04-15 10:00:00'),
(18, 200.00, 'deposit', 'credit_card',   'completed', 'TXN-20260415-D01', '2026-04-15 10:30:00', '2026-04-15 10:00:00'),
(19, 200.00, 'deposit', 'paypal',        'pending',   NULL,                NULL,                  '2026-04-20 14:30:00'),
(23, 426.00, 'deposit', 'credit_card',   'pending',   NULL,                NULL,                  '2026-04-01 10:00:00'),
-- Cancellation 25: full refund (cancelled 17 days before check-in under flexible policy)
(25, 430.00, 'full',    'credit_card',   'completed', 'TXN-20240310-001', '2024-03-10 09:30:00', '2024-03-10 09:00:00'),
(25, 430.00, 'refund',  'credit_card',   'refunded',  'TXN-20240815-RF01','2024-08-15 12:30:00', '2024-08-15 12:00:00'),
-- Cancellation 27: late cancel under flexible policy → 50%% refund
(27, 295.00, 'full',    'paypal',        'completed', 'TXN-20240515-001', '2024-05-15 16:30:00', '2024-05-15 16:00:00'),
(27, 147.50, 'refund',  'paypal',        'refunded',  'TXN-20240818-RF01','2024-08-18 17:30:00', '2024-08-18 17:30:00');

SELECT 'Test data inserted successfully.' AS status;

-- =============================================================================
-- [§ 4e]  INVALID ATTEMPTS — must be rejected by the database (kept commented).
-- Uncomment one at a time to verify the trigger / constraint reaction.
-- =============================================================================
--
-- [§ 4e] 1. Booking on a non-validated accommodation (id 12) → trigger error.
-- INSERT INTO bookings (accommodation_id, guest_id, check_in_date, check_out_date, num_guests, total_price)
-- VALUES (12, 7, '2026-09-01', '2026-09-05', 2, 800.00);
--
-- [§ 4d] 2. Booking on a non-compliant accommodation (id 13, no alarm) → trigger error.
-- INSERT INTO bookings (accommodation_id, guest_id, check_in_date, check_out_date, num_guests, total_price)
-- VALUES (13, 7, '2026-09-01', '2026-09-05', 2, 440.00);
--
-- [§ 3]  3. Booking inside a host-blocked period (acc 1 blocked 12/23–12/31) → trigger error.
-- INSERT INTO bookings (accommodation_id, guest_id, check_in_date, check_out_date, num_guests, total_price)
-- VALUES (1, 7, '2026-12-26', '2026-12-30', 2, 380.00);
--
-- [§ 3]  4. Overlapping booking (acc 8 already booked 07-15 → 07-20) → trigger error.
-- INSERT INTO bookings (accommodation_id, guest_id, check_in_date, check_out_date, num_guests, total_price)
-- VALUES (8, 12, '2026-07-17', '2026-07-19', 2, 280.00);
--
-- [§ 4a] 5. Capacity exceeded (acc 1 max_guests = 2) → trigger error.
-- INSERT INTO bookings (accommodation_id, guest_id, check_in_date, check_out_date, num_guests, total_price)
-- VALUES (1, 7, '2026-06-01', '2026-06-03', 5, 200.00);
--
-- [§ 4d] 6. Validating an alarm-less accommodation (id 13) → CHECK rejects.
-- UPDATE accommodations SET is_validated = TRUE WHERE id = 13;
--
-- [§ 3]  7. Review on a non-completed booking (id 23 is pending) → trigger error.
-- INSERT INTO reviews (booking_id, rating, comment) VALUES (23, 5, 'too early');
--
-- [§ 4a] 8. Self-message (sender = receiver) → CHECK rejects.
-- INSERT INTO messages (sender_id, receiver_id, content) VALUES (1, 1, 'note to self');
--
-- [§ 4a] 9. Negative price → CHECK rejects.
-- INSERT INTO accommodation_fees (accommodation_id, fee_type, amount) VALUES (1, 'other', -10.00);
--
-- [§ 4a] 10. check_out before check_in → CHECK rejects.
-- INSERT INTO bookings (accommodation_id, guest_id, check_in_date, check_out_date, num_guests, total_price)
-- VALUES (1, 7, '2026-06-05', '2026-06-01', 1, 100.00);
