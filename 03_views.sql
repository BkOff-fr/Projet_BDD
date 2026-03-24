-- =============================================================================
-- ACCOMMODATION RENTAL PLATFORM - VIEWS
-- Predefined queries for common reporting needs
-- =============================================================================
-- Execute this file AFTER 01_schema.sql and 02_constraints_triggers.sql
-- =============================================================================

-- =============================================================================
-- VIEW 1: dashboard_lowest_ratings
-- Purpose: For requirement 4b - Shows accommodations with their lowest ratings
-- Includes reviewer details and their total booking history
-- =============================================================================
CREATE OR REPLACE VIEW dashboard_lowest_ratings AS
SELECT 
    r.accommodation_id,
    MIN(r.rating) AS lowest_rating,
    -- Get the comment from the review with the lowest rating
    -- If multiple reviews have the same lowest rating, get the most recent one
    (SELECT r2.comment 
     FROM reviews r2 
     WHERE r2.accommodation_id = r.accommodation_id 
       AND r2.rating = MIN(r.rating)
     ORDER BY r2.created_at DESC 
     LIMIT 1) AS comment,
    -- Reviewer information
    u.first_name AS reviewer_first_name,
    u.last_name AS reviewer_last_name,
    CONCAT(u.first_name, ' ', u.last_name) AS reviewer_name,
    u.email AS reviewer_email,
    -- Total bookings count for this reviewer
    (SELECT COUNT(*) 
     FROM bookings b2 
     WHERE b2.guest_id = r.guest_id) AS reviewer_total_bookings
FROM reviews r
INNER JOIN users u ON r.guest_id = u.id
GROUP BY r.accommodation_id, u.first_name, u.last_name, u.email, r.guest_id
HAVING r.rating = (
    -- Get the minimum rating for this accommodation
    SELECT MIN(r3.rating) 
    FROM reviews r3 
    WHERE r3.accommodation_id = r.accommodation_id
)
ORDER BY lowest_rating ASC, accommodation_id;

-- Alternative simpler version if the above is too complex for some MySQL versions
CREATE OR REPLACE VIEW dashboard_lowest_ratings_simple AS
SELECT 
    a.id AS accommodation_id,
    a.title AS accommodation_title,
    MIN(r.rating) AS lowest_rating,
    r_lowest.comment,
    u.first_name AS reviewer_first_name,
    u.last_name AS reviewer_last_name,
    CONCAT(u.first_name, ' ', u.last_name) AS reviewer_name,
    u.email AS reviewer_email,
    (SELECT COUNT(*) FROM bookings b WHERE b.guest_id = r.guest_id) AS reviewer_total_bookings
FROM accommodations a
INNER JOIN reviews r ON a.id = r.accommodation_id
INNER JOIN users u ON r.guest_id = u.id
INNER JOIN reviews r_lowest ON r_lowest.accommodation_id = a.id 
    AND r_lowest.rating = (SELECT MIN(rating) FROM reviews WHERE accommodation_id = a.id)
    AND r_lowest.guest_id = r.guest_id
GROUP BY a.id, a.title, r_lowest.comment, u.first_name, u.last_name, u.email, r.guest_id
ORDER BY lowest_rating ASC;

-- =============================================================================
-- VIEW 2: accommodations_with_avg_rating
-- Purpose: For requirement 4f - All accommodations with average rating
-- Shows NULL if accommodation has no reviews
-- =============================================================================
CREATE OR REPLACE VIEW accommodations_with_avg_rating AS
SELECT 
    a.id AS accommodation_id,
    a.title,
    a.description,
    a.type,
    a.city,
    a.country,
    a.capacity,
    a.bedrooms,
    a.bathrooms,
    a.base_price_night,
    a.is_validated,
    a.has_alarm_system,
    a.created_at,
    -- Average rating (NULL if no reviews)
    ROUND(AVG(r.rating), 2) AS avg_rating,
    -- Total number of reviews
    COUNT(r.id) AS total_reviews,
    -- Host information
    a.host_id,
    CONCAT(u.first_name, ' ', u.last_name) AS host_name,
    u.email AS host_email
FROM accommodations a
LEFT JOIN reviews r ON a.id = r.accommodation_id
INNER JOIN users u ON a.host_id = u.id
GROUP BY 
    a.id, a.title, a.description, a.type, a.city, a.country,
    a.capacity, a.bedrooms, a.bathrooms, a.base_price_night,
    a.is_validated, a.has_alarm_system, a.created_at,
    a.host_id, u.first_name, u.last_name, u.email
ORDER BY avg_rating DESC NULLS LAST, a.created_at DESC;

-- =============================================================================
-- VIEW 3: accommodation_availability_calendar
-- Purpose: Shows availability status for all accommodations with date ranges
-- Useful for calendar displays
-- =============================================================================
CREATE OR REPLACE VIEW accommodation_availability_calendar AS
SELECT 
    a.id AS accommodation_id,
    a.title AS accommodation_title,
    a.type,
    a.city,
    a.country,
    av.start_date,
    av.end_date,
    av.is_available,
    CASE 
        WHEN av.is_available = TRUE THEN 'Available'
        ELSE 'Unavailable'
    END AS availability_status,
    av.reason AS unavailability_reason
FROM accommodations a
LEFT JOIN availability av ON a.id = av.accommodation_id
ORDER BY a.id, av.start_date;

-- =============================================================================
-- VIEW 4: booking_details_complete
-- Purpose: Comprehensive booking information with all related data
-- =============================================================================
CREATE OR REPLACE VIEW booking_details_complete AS
SELECT 
    b.id AS booking_id,
    b.check_in_date,
    b.check_out_date,
    b.status AS booking_status,
    b.total_amount,
    b.created_at AS booking_created_at,
    DATEDIFF(b.check_out_date, b.check_in_date) AS num_nights,
    -- Guest information
    b.guest_id,
    CONCAT(g.first_name, ' ', g.last_name) AS guest_name,
    g.email AS guest_email,
    g.phone AS guest_phone,
    -- Accommodation information
    b.accommodation_id,
    a.title AS accommodation_title,
    a.type AS accommodation_type,
    a.address,
    a.city,
    a.country,
    a.base_price_night,
    -- Host information
    a.host_id,
    CONCAT(h.first_name, ' ', h.last_name) AS host_name,
    h.email AS host_email,
    -- Cancellation policy
    cp.policy_type,
    cp.days_before_full_refund,
    cp.partial_refund_percent
FROM bookings b
INNER JOIN users g ON b.guest_id = g.id
INNER JOIN accommodations a ON b.accommodation_id = a.id
INNER JOIN users h ON a.host_id = h.id
LEFT JOIN cancellation_policies cp ON b.cancellation_policy_id = cp.id
ORDER BY b.created_at DESC;

-- =============================================================================
-- VIEW 5: host_earnings_summary
-- Purpose: Summary of earnings per host with payment statistics
-- =============================================================================
CREATE OR REPLACE VIEW host_earnings_summary AS
SELECT 
    u.id AS host_id,
    CONCAT(u.first_name, ' ', u.last_name) AS host_name,
    u.email AS host_email,
    -- Accommodation count
    COUNT(DISTINCT a.id) AS total_accommodations,
    -- Booking statistics
    COUNT(DISTINCT b.id) AS total_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) AS completed_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'validated' THEN b.id END) AS validated_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'pending' THEN b.id END) AS pending_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'canceled' THEN b.id END) AS canceled_bookings,
    -- Financial summary
    COALESCE(SUM(CASE WHEN b.status IN ('completed', 'validated') THEN b.total_amount END), 0) AS total_earnings,
    COALESCE(AVG(CASE WHEN b.status = 'completed' THEN b.total_amount END), 0) AS avg_booking_value,
    -- Payment received
    COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount END), 0) AS total_payments_received,
    -- Review statistics
    COUNT(DISTINCT r.id) AS total_reviews,
    ROUND(AVG(r.rating), 2) AS avg_rating
FROM users u
LEFT JOIN accommodations a ON u.id = a.host_id
LEFT JOIN bookings b ON a.id = b.accommodation_id
LEFT JOIN payments p ON b.id = p.booking_id
LEFT JOIN reviews r ON a.id = r.accommodation_id
WHERE u.is_host = TRUE
GROUP BY u.id, u.first_name, u.last_name, u.email
ORDER BY total_earnings DESC;

-- =============================================================================
-- VIEW 6: guest_booking_history
-- Purpose: Complete booking history for each guest
-- =============================================================================
CREATE OR REPLACE VIEW guest_booking_history AS
SELECT 
    u.id AS guest_id,
    CONCAT(u.first_name, ' ', u.last_name) AS guest_name,
    u.email AS guest_email,
    b.id AS booking_id,
    b.check_in_date,
    b.check_out_date,
    b.status AS booking_status,
    b.total_amount,
    b.created_at AS booking_date,
    a.id AS accommodation_id,
    a.title AS accommodation_title,
    a.type AS accommodation_type,
    a.city,
    a.country,
    CONCAT(h.first_name, ' ', h.last_name) AS host_name,
    -- Review info if exists
    r.rating,
    r.comment AS review_comment,
    -- Payment status
    GROUP_CONCAT(DISTINCT CONCAT(p.payment_type, ':', p.status) SEPARATOR ', ') AS payment_statuses
FROM users u
INNER JOIN bookings b ON u.id = b.guest_id
INNER JOIN accommodations a ON b.accommodation_id = a.id
INNER JOIN users h ON a.host_id = h.id
LEFT JOIN reviews r ON b.id = r.booking_id
LEFT JOIN payments p ON b.id = p.booking_id
GROUP BY 
    u.id, u.first_name, u.last_name, u.email,
    b.id, b.check_in_date, b.check_out_date, b.status, b.total_amount, b.created_at,
    a.id, a.title, a.type, a.city, a.country,
    h.first_name, h.last_name,
    r.rating, r.comment
ORDER BY u.id, b.created_at DESC;

-- =============================================================================
-- VIEW 7: pricing_overview
-- Purpose: Shows current pricing for all accommodations including active rules
-- =============================================================================
CREATE OR REPLACE VIEW pricing_overview AS
SELECT 
    a.id AS accommodation_id,
    a.title,
    a.type,
    a.city,
    a.country,
    a.base_price_night,
    -- Active pricing rules
    pr.start_date AS rule_start,
    pr.end_date AS rule_end,
    pr.price_multiplier,
    pr.reason AS pricing_reason,
    -- Calculated effective price
    ROUND(a.base_price_night * COALESCE(pr.price_multiplier, 1.00), 2) AS effective_price,
    -- Additional fees
    GROUP_CONCAT(DISTINCT 
        CONCAT(af.fee_type, ':', af.amount, IF(af.is_percentage, '%', '')) 
        SEPARATOR ', '
    ) AS additional_fees
FROM accommodations a
LEFT JOIN pricing_rules pr ON a.id = pr.accommodation_id 
    AND CURDATE() BETWEEN pr.start_date AND pr.end_date
LEFT JOIN additional_fees af ON a.id = af.accommodation_id
GROUP BY 
    a.id, a.title, a.type, a.city, a.country, a.base_price_night,
    pr.start_date, pr.end_date, pr.price_multiplier, pr.reason
ORDER BY a.id;

-- =============================================================================
-- VIEW 8: message_conversations
-- Purpose: Shows message threads between users related to bookings
-- =============================================================================
CREATE OR REPLACE VIEW message_conversations AS
SELECT 
    m.id AS message_id,
    m.content,
    m.sent_at,
    m.is_read,
    -- Sender info
    m.sender_id,
    CONCAT(s.first_name, ' ', s.last_name) AS sender_name,
    s.email AS sender_email,
    -- Receiver info
    m.receiver_id,
    CONCAT(r.first_name, ' ', r.last_name) AS receiver_name,
    r.email AS receiver_email,
    -- Booking context
    m.booking_id,
    b.check_in_date,
    b.check_out_date,
    b.status AS booking_status,
    a.title AS accommodation_title
FROM messages m
INNER JOIN users s ON m.sender_id = s.id
INNER JOIN users r ON m.receiver_id = r.id
LEFT JOIN bookings b ON m.booking_id = b.id
LEFT JOIN accommodations a ON b.accommodation_id = a.id
ORDER BY m.sent_at DESC;

-- =============================================================================
-- VIEW 9: unreviewed_completed_bookings
-- Purpose: Shows completed bookings that haven't been reviewed yet
-- Useful for sending review reminder notifications
-- =============================================================================
CREATE OR REPLACE VIEW unreviewed_completed_bookings AS
SELECT 
    b.id AS booking_id,
    b.check_in_date,
    b.check_out_date,
    b.completed_at,
    b.guest_id,
    CONCAT(g.first_name, ' ', g.last_name) AS guest_name,
    g.email AS guest_email,
    b.accommodation_id,
    a.title AS accommodation_title,
    a.host_id,
    CONCAT(h.first_name, ' ', h.last_name) AS host_name,
    DATEDIFF(CURDATE(), b.check_out_date) AS days_since_checkout
FROM bookings b
INNER JOIN users g ON b.guest_id = g.id
INNER JOIN accommodations a ON b.accommodation_id = a.id
INNER JOIN users h ON a.host_id = h.id
LEFT JOIN reviews r ON b.id = r.booking_id
WHERE b.status = 'completed'
    AND r.id IS NULL
ORDER BY b.check_out_date DESC;

-- Note: The above view requires a 'completed_at' column that doesn't exist
-- Let's create a version without that requirement
CREATE OR REPLACE VIEW unreviewed_completed_bookings AS
SELECT 
    b.id AS booking_id,
    b.check_in_date,
    b.check_out_date,
    b.guest_id,
    CONCAT(g.first_name, ' ', g.last_name) AS guest_name,
    g.email AS guest_email,
    b.accommodation_id,
    a.title AS accommodation_title,
    a.host_id,
    CONCAT(h.first_name, ' ', h.last_name) AS host_name,
    DATEDIFF(CURDATE(), b.check_out_date) AS days_since_checkout
FROM bookings b
INNER JOIN users g ON b.guest_id = g.id
INNER JOIN accommodations a ON b.accommodation_id = a.id
INNER JOIN users h ON a.host_id = h.id
LEFT JOIN reviews r ON b.id = r.booking_id
WHERE b.status = 'completed'
    AND r.id IS NULL
    AND b.check_out_date <= CURDATE()
ORDER BY b.check_out_date DESC;

-- =============================================================================
-- VIEW 10: popular_accommodations
-- Purpose: Shows most booked accommodations with key metrics
-- =============================================================================
CREATE OR REPLACE VIEW popular_accommodations AS
SELECT 
    a.id AS accommodation_id,
    a.title,
    a.type,
    a.city,
    a.country,
    a.base_price_night,
    -- Booking metrics
    COUNT(b.id) AS total_bookings,
    COUNT(CASE WHEN b.status = 'completed' THEN 1 END) AS completed_bookings,
    COUNT(CASE WHEN b.status = 'canceled' THEN 1 END) AS canceled_bookings,
    -- Revenue metrics
    SUM(CASE WHEN b.status IN ('completed', 'validated') THEN b.total_amount END) AS total_revenue,
    AVG(CASE WHEN b.status = 'completed' THEN b.total_amount END) AS avg_booking_value,
    -- Review metrics
    COUNT(DISTINCT r.id) AS total_reviews,
    ROUND(AVG(r.rating), 2) AS avg_rating,
    -- Occupancy rate (completed bookings vs total)
    ROUND(
        COUNT(CASE WHEN b.status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(b.id), 0), 
        2
    ) AS completion_rate
FROM accommodations a
LEFT JOIN bookings b ON a.id = b.accommodation_id
LEFT JOIN reviews r ON a.id = r.accommodation_id
WHERE a.is_validated = TRUE
GROUP BY 
    a.id, a.title, a.type, a.city, a.country, a.base_price_night
ORDER BY total_bookings DESC, avg_rating DESC;

SELECT 'Views created successfully!' AS status;

-- =============================================================================
-- VIEWS CREATION COMPLETE
-- =============================================================================
