-- =============================================================================
-- ACCOMMODATION RENTAL PLATFORM - COMPLEX QUERIES
-- Advanced SQL queries for common business operations
-- =============================================================================
-- Execute this file AFTER 01_schema.sql, 02_constraints_triggers.sql, and 05_data.sql
-- =============================================================================

-- =============================================================================
-- QUERY 1: Search Accommodations by Type with Availability Check
-- Purpose: Find available accommodations of a specific type for given dates
-- Parameters: @search_type, @check_in, @check_out, @min_capacity
-- =============================================================================

-- Example search parameters (uncomment and modify for testing)
-- SET @search_type = 'apartment';
-- SET @check_in = '2024-07-01';
-- SET @check_out = '2024-07-07';
-- SET @min_capacity = 2;
-- SET @max_price = 200.00;
-- SET @city_filter = 'Paris';

SELECT 
    a.id AS accommodation_id,
    a.title,
    a.description,
    a.type,
    a.address,
    a.city,
    a.country,
    a.capacity,
    a.bedrooms,
    a.bathrooms,
    a.base_price_night,
    a.has_alarm_system,
    -- Calculate total cost for the stay
    (
        SELECT SUM(
            a.base_price_night * 
            COALESCE(
                (SELECT price_multiplier 
                 FROM pricing_rules pr 
                 WHERE pr.accommodation_id = a.id 
                   AND DATE_ADD(@check_in, INTERVAL n DAY) BETWEEN pr.start_date AND pr.end_date
                 LIMIT 1), 
                1.00
            )
        )
        FROM (
            SELECT 0 AS n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
            UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
            UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
        ) numbers
        WHERE DATE_ADD(@check_in, INTERVAL n DAY) < @check_out
    ) AS calculated_subtotal,
    -- Host information
    CONCAT(u.first_name, ' ', u.last_name) AS host_name,
    u.email AS host_email,
    -- Average rating
    ROUND(AVG(r.rating), 2) AS avg_rating,
    COUNT(DISTINCT r.id) AS review_count,
    -- Amenities list
    GROUP_CONCAT(DISTINCT am.name ORDER BY am.name SEPARATOR ', ') AS amenities
FROM accommodations a
INNER JOIN users u ON a.host_id = u.id
LEFT JOIN reviews r ON a.id = r.accommodation_id
LEFT JOIN accommodation_amenities aa ON a.id = aa.accommodation_id
LEFT JOIN amenities am ON aa.amenity_id = am.id
WHERE 
    -- Filter by type
    a.type = @search_type
    -- Must be validated
    AND a.is_validated = TRUE
    -- Capacity check
    AND a.capacity >= @min_capacity
    -- Price check (optional)
    AND (@max_price IS NULL OR a.base_price_night <= @max_price)
    -- City filter (optional)
    AND (@city_filter IS NULL OR a.city = @city_filter)
    -- Availability check: NOT in unavailable periods
    AND NOT EXISTS (
        SELECT 1 FROM availability av
        WHERE av.accommodation_id = a.id
            AND av.is_available = FALSE
            AND (
                (@check_in BETWEEN av.start_date AND av.end_date)
                OR (@check_out BETWEEN av.start_date AND av.end_date)
                OR (av.start_date BETWEEN @check_in AND @check_out)
            )
    )
    -- Availability check: NOT already booked
    AND NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.accommodation_id = a.id
            AND b.status IN ('pending', 'validated')
            AND (
                (@check_in BETWEEN b.check_in_date AND DATE_SUB(b.check_out_date, INTERVAL 1 DAY))
                OR (@check_out BETWEEN DATE_ADD(b.check_in_date, INTERVAL 1 DAY) AND b.check_out_date)
                OR (b.check_in_date BETWEEN @check_in AND DATE_SUB(@check_out, INTERVAL 1 DAY))
            )
    )
GROUP BY 
    a.id, a.title, a.description, a.type, a.address, a.city, a.country,
    a.capacity, a.bedrooms, a.bathrooms, a.base_price_night, a.has_alarm_system,
    u.first_name, u.last_name, u.email
HAVING 
    -- Filter by minimum rating if specified
    (@min_rating IS NULL OR avg_rating >= @min_rating)
ORDER BY 
    avg_rating DESC NULLS LAST, 
    a.base_price_night ASC;


-- =============================================================================
-- QUERY 2: Calculate Total Booking Cost with All Fees
-- Purpose: Detailed cost breakdown for a specific booking
-- Parameters: @booking_id
-- =============================================================================

-- SET @booking_id = 1;

WITH booking_dates AS (
    -- Generate all dates in the booking period
    SELECT 
        DATE_ADD(b.check_in_date, INTERVAL n DAY) AS booking_date,
        b.accommodation_id,
        b.base_price_night,
        b.check_in_date,
        b.check_out_date
    FROM bookings b
    CROSS JOIN (
        SELECT a.N + b.N * 10 AS n
        FROM 
            (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
             UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a
            CROSS JOIN
            (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
             UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b
    ) numbers
    WHERE b.id = @booking_id
      AND DATE_ADD(b.check_in_date, INTERVAL n DAY) < b.check_out_date
),
daily_prices AS (
    -- Calculate price for each day with multiplier
    SELECT 
        bd.booking_date,
        bd.base_price_night,
        COALESCE(pr.price_multiplier, 1.00) AS multiplier,
        bd.base_price_night * COALESCE(pr.price_multiplier, 1.00) AS daily_price
    FROM booking_dates bd
    LEFT JOIN pricing_rules pr ON bd.accommodation_id = pr.accommodation_id
        AND bd.booking_date BETWEEN pr.start_date AND pr.end_date
),
subtotal_calc AS (
    SELECT 
        SUM(daily_price) AS subtotal,
        COUNT(*) AS num_nights,
        AVG(base_price_night) AS avg_base_price,
        MIN(multiplier) AS min_multiplier,
        MAX(multiplier) AS max_multiplier
    FROM daily_prices
),
fees_calc AS (
    SELECT 
        af.fee_type,
        af.amount,
        af.is_percentage,
        CASE 
            WHEN af.is_percentage THEN (SELECT subtotal FROM subtotal_calc) * af.amount / 100
            ELSE af.amount
        END AS fee_amount
    FROM additional_fees af
    WHERE af.accommodation_id = (SELECT accommodation_id FROM bookings WHERE id = @booking_id)
)
SELECT 
    b.id AS booking_id,
    b.check_in_date,
    b.check_out_date,
    sc.num_nights,
    -- Subtotal breakdown
    sc.avg_base_price,
    sc.min_multiplier,
    sc.max_multiplier,
    sc.subtotal AS accommodation_subtotal,
    -- Fees breakdown
    GROUP_CONCAT(
        CONCAT(fc.fee_type, ': ', 
               ROUND(fc.fee_amount, 2), 
               ' (', fc.amount, IF(fc.is_percentage, '%', ' fixed'), ')')
        SEPARATOR ' | '
    ) AS fees_breakdown,
    COALESCE(SUM(fc.fee_amount), 0) AS total_fees,
    -- Final total
    sc.subtotal + COALESCE(SUM(fc.fee_amount), 0) AS calculated_total,
    b.total_amount AS stored_total,
    -- Verification
    CASE 
        WHEN ABS((sc.subtotal + COALESCE(SUM(fc.fee_amount), 0)) - b.total_amount) < 0.01 
        THEN 'VERIFIED' 
        ELSE 'MISMATCH' 
    END AS verification_status
FROM bookings b
CROSS JOIN subtotal_calc sc
LEFT JOIN fees_calc fc ON 1=1
WHERE b.id = @booking_id
GROUP BY 
    b.id, b.check_in_date, b.check_out_date, b.total_amount,
    sc.num_nights, sc.avg_base_price, sc.min_multiplier, sc.max_multiplier, sc.subtotal;


-- =============================================================================
-- QUERY 3: Get Booking History with All Payments
-- Purpose: Complete booking and payment history for a guest or all bookings
-- Parameters: @guest_id (optional - remove WHERE clause for all bookings)
-- =============================================================================

-- SET @guest_id = 1;

SELECT 
    b.id AS booking_id,
    b.check_in_date,
    b.check_out_date,
    b.status AS booking_status,
    b.total_amount AS booking_total,
    b.created_at AS booking_created_at,
    DATEDIFF(b.check_out_date, b.check_in_date) AS num_nights,
    -- Guest info
    b.guest_id,
    CONCAT(g.first_name, ' ', g.last_name) AS guest_name,
    g.email AS guest_email,
    -- Accommodation info
    a.id AS accommodation_id,
    a.title AS accommodation_title,
    a.type AS accommodation_type,
    a.city,
    a.country,
    -- Host info
    CONCAT(h.first_name, ' ', h.last_name) AS host_name,
    -- Payments summary
    COUNT(p.id) AS total_payments,
    SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) AS total_paid,
    SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END) AS total_pending,
    SUM(CASE WHEN p.status = 'failed' THEN p.amount ELSE 0 END) AS total_failed,
    SUM(CASE WHEN p.status = 'refunded' THEN p.amount ELSE 0 END) AS total_refunded,
    -- Payment details as JSON-like string
    GROUP_CONCAT(
        CONCAT(p.payment_type, '=', p.status, ':', ROUND(p.amount, 2))
        ORDER BY p.payment_date
        SEPARATOR ' | '
    ) AS payment_details,
    -- Balance due
    b.total_amount - COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) AS balance_due,
    -- Review info
    r.rating,
    LEFT(r.comment, 100) AS review_preview
FROM bookings b
INNER JOIN users g ON b.guest_id = g.id
INNER JOIN accommodations a ON b.accommodation_id = a.id
INNER JOIN users h ON a.host_id = h.id
LEFT JOIN payments p ON b.id = p.booking_id
LEFT JOIN reviews r ON b.id = r.booking_id
WHERE 
    (@guest_id IS NULL OR b.guest_id = @guest_id)
GROUP BY 
    b.id, b.check_in_date, b.check_out_date, b.status, b.total_amount, b.created_at,
    b.guest_id, g.first_name, g.last_name, g.email,
    a.id, a.title, a.type, a.city, a.country,
    h.first_name, h.last_name,
    r.rating, r.comment
ORDER BY b.created_at DESC;


-- =============================================================================
-- QUERY 4: Get Host Earnings Summary
-- Purpose: Comprehensive earnings report for hosts with period filtering
-- Parameters: @host_id (optional), @start_date, @end_date
-- =============================================================================

-- SET @host_id = NULL;
-- SET @start_date = '2024-01-01';
-- SET @end_date = '2024-12-31';

SELECT 
    u.id AS host_id,
    CONCAT(u.first_name, ' ', u.last_name) AS host_name,
    u.email AS host_email,
    u.registration_date AS host_since,
    -- Accommodation stats
    COUNT(DISTINCT a.id) AS total_listings,
    COUNT(DISTINCT CASE WHEN a.is_validated THEN a.id END) AS validated_listings,
    -- Booking stats for period
    COUNT(DISTINCT b.id) AS total_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) AS completed_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'validated' THEN b.id END) AS active_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'pending' THEN b.id END) AS pending_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'canceled' THEN b.id END) AS canceled_bookings,
    -- Financial stats
    COALESCE(SUM(CASE 
        WHEN b.status IN ('completed', 'validated') 
        THEN b.total_amount 
    END), 0) AS gross_earnings,
    COALESCE(SUM(CASE 
        WHEN b.status = 'completed' 
        THEN b.total_amount 
    END), 0) AS realized_earnings,
    COALESCE(AVG(CASE 
        WHEN b.status = 'completed' 
        THEN b.total_amount 
    END), 0) AS avg_completed_booking_value,
    -- Payment received
    COALESCE(SUM(CASE 
        WHEN p.status = 'completed' 
        THEN p.amount 
    END), 0) AS total_payments_received,
    -- Cancellation rate
    ROUND(
        COUNT(DISTINCT CASE WHEN b.status = 'canceled' THEN b.id END) * 100.0 / 
        NULLIF(COUNT(DISTINCT b.id), 0), 
        2
    ) AS cancellation_rate,
    -- Review stats
    COUNT(DISTINCT r.id) AS total_reviews_received,
    ROUND(AVG(r.rating), 2) AS avg_rating,
    COUNT(DISTINCT CASE WHEN r.rating = 5 THEN r.id END) AS five_star_reviews,
    COUNT(DISTINCT CASE WHEN r.rating <= 2 THEN r.id END) AS low_rating_reviews,
    -- Occupancy metrics
    SUM(DATEDIFF(b.check_out_date, b.check_in_date)) AS total_nights_booked,
    -- Top performing accommodation
    (SELECT a2.title 
     FROM accommodations a2 
     LEFT JOIN bookings b2 ON a2.id = b2.accommodation_id 
         AND b2.status = 'completed'
         AND (@start_date IS NULL OR b2.check_in_date >= @start_date)
         AND (@end_date IS NULL OR b2.check_in_date <= @end_date)
     WHERE a2.host_id = u.id
     GROUP BY a2.id, a2.title
     ORDER BY COUNT(b2.id) DESC
     LIMIT 1) AS top_accommodation
FROM users u
LEFT JOIN accommodations a ON u.id = a.host_id
LEFT JOIN bookings b ON a.id = b.accommodation_id
    AND (@start_date IS NULL OR b.check_in_date >= @start_date)
    AND (@end_date IS NULL OR b.check_in_date <= @end_date)
LEFT JOIN payments p ON b.id = p.booking_id
LEFT JOIN reviews r ON a.id = r.accommodation_id
WHERE 
    u.is_host = TRUE
    AND (@host_id IS NULL OR u.id = @host_id)
GROUP BY 
    u.id, u.first_name, u.last_name, u.email, u.registration_date
ORDER BY gross_earnings DESC;


-- =============================================================================
-- QUERY 5: Advanced Accommodation Search with Amenities Filter
-- Purpose: Find accommodations matching multiple criteria including amenities
-- =============================================================================

-- SET @required_amenities = 'WiFi,Kitchen,Pool'; -- Comma-separated list
-- SET @min_rating = 4.0;
-- SET @max_price = 300;
-- SET @city = 'Miami';

SELECT 
    a.id,
    a.title,
    a.type,
    a.city,
    a.country,
    a.capacity,
    a.bedrooms,
    a.bathrooms,
    a.base_price_night,
    ROUND(AVG(r.rating), 2) AS avg_rating,
    COUNT(DISTINCT r.id) AS review_count,
    GROUP_CONCAT(DISTINCT am.name ORDER BY am.name) AS amenities,
    -- Check if all required amenities are present
    SUM(CASE WHEN am.name IN (SELECT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(@required_amenities, ',', numbers.n), ',', -1))
                               FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) numbers
                               WHERE LENGTH(@required_amenities) - LENGTH(REPLACE(@required_amenities, ',', '')) >= numbers.n - 1
                               OR (numbers.n = 1 AND @required_amenities IS NOT NULL)) 
          THEN 1 ELSE 0 END) AS matched_amenities,
    (SELECT COUNT(*) FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) numbers
     WHERE LENGTH(@required_amenities) - LENGTH(REPLACE(@required_amenities, ',', '')) >= numbers.n - 1
     OR (numbers.n = 1 AND @required_amenities IS NOT NULL)) AS total_required_amenities
FROM accommodations a
LEFT JOIN reviews r ON a.id = r.accommodation_id
LEFT JOIN accommodation_amenities aa ON a.id = aa.accommodation_id
LEFT JOIN amenities am ON aa.amenity_id = am.id
WHERE 
    a.is_validated = TRUE
    AND (@city IS NULL OR a.city = @city)
    AND (@max_price IS NULL OR a.base_price_night <= @max_price)
GROUP BY a.id, a.title, a.type, a.city, a.country, a.capacity, a.bedrooms, a.bathrooms, a.base_price_night
HAVING 
    (@min_rating IS NULL OR avg_rating >= @min_rating OR avg_rating IS NULL)
    AND (@required_amenities IS NULL OR matched_amenities = total_required_amenities)
ORDER BY avg_rating DESC, review_count DESC;


-- =============================================================================
-- QUERY 6: Monthly Revenue Report
-- Purpose: Monthly breakdown of bookings, revenue, and occupancy
-- =============================================================================

-- SET @year = 2024;

WITH months AS (
    SELECT 1 AS month_num, 'January' AS month_name UNION
    SELECT 2, 'February' UNION SELECT 3, 'March' UNION SELECT 4, 'April' UNION
    SELECT 5, 'May' UNION SELECT 6, 'June' UNION SELECT 7, 'July' UNION
    SELECT 8, 'August' UNION SELECT 9, 'September' UNION SELECT 10, 'October' UNION
    SELECT 11, 'November' UNION SELECT 12, 'December'
)
SELECT 
    m.month_num,
    m.month_name,
    -- Booking counts
    COUNT(DISTINCT b.id) AS total_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) AS completed_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'canceled' THEN b.id END) AS canceled_bookings,
    -- Revenue
    COALESCE(SUM(CASE WHEN b.status IN ('completed', 'validated') THEN b.total_amount END), 0) AS gross_revenue,
    COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount END), 0) AS realized_revenue,
    COALESCE(AVG(CASE WHEN b.status = 'completed' THEN b.total_amount END), 0) AS avg_booking_value,
    -- Nights booked
    COALESCE(SUM(CASE WHEN b.status = 'completed' 
                      THEN DATEDIFF(b.check_out_date, b.check_in_date) END), 0) AS nights_booked,
    -- Unique guests
    COUNT(DISTINCT b.guest_id) AS unique_guests,
    -- New hosts
    COUNT(DISTINCT CASE WHEN MONTH(u.registration_date) = m.month_num 
                         AND YEAR(u.registration_date) = @year 
                        THEN u.id END) AS new_hosts
FROM months m
LEFT JOIN bookings b ON MONTH(b.created_at) = m.month_num AND YEAR(b.created_at) = @year
LEFT JOIN users u ON u.is_host = TRUE
GROUP BY m.month_num, m.month_name
ORDER BY m.month_num;


-- =============================================================================
-- QUERY 7: Overlapping Bookings Detection
-- Purpose: Find any booking conflicts (shouldn't happen with triggers, but good for audit)
-- =============================================================================

SELECT 
    b1.id AS booking_1_id,
    b1.check_in_date AS booking_1_check_in,
    b1.check_out_date AS booking_1_check_out,
    b1.status AS booking_1_status,
    b2.id AS booking_2_id,
    b2.check_in_date AS booking_2_check_in,
    b2.check_out_date AS booking_2_check_out,
    b2.status AS booking_2_status,
    a.id AS accommodation_id,
    a.title AS accommodation_title,
    -- Overlap details
    GREATEST(b1.check_in_date, b2.check_in_date) AS overlap_start,
    LEAST(b1.check_out_date, b2.check_out_date) AS overlap_end,
    DATEDIFF(LEAST(b1.check_out_date, b2.check_out_date), 
             GREATEST(b1.check_in_date, b2.check_in_date)) AS overlap_days
FROM bookings b1
INNER JOIN bookings b2 ON b1.accommodation_id = b2.accommodation_id 
    AND b1.id < b2.id  -- Avoid duplicates
    AND b1.status IN ('pending', 'validated')
    AND b2.status IN ('pending', 'validated')
    -- Check for overlap
    AND b1.check_in_date < b2.check_out_date
    AND b1.check_out_date > b2.check_in_date
INNER JOIN accommodations a ON b1.accommodation_id = a.id
ORDER BY a.id, overlap_start;


-- =============================================================================
-- QUERY 8: Guest Loyalty Analysis
-- Purpose: Identify loyal customers and their booking patterns
-- =============================================================================

SELECT 
    u.id AS guest_id,
    CONCAT(u.first_name, ' ', u.last_name) AS guest_name,
    u.email AS guest_email,
    u.registration_date AS member_since,
    DATEDIFF(CURDATE(), u.registration_date) AS days_as_member,
    -- Booking statistics
    COUNT(DISTINCT b.id) AS total_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) AS completed_bookings,
    COUNT(DISTINCT b.accommodation_id) AS unique_accommodations,
    COUNT(DISTINCT a.host_id) AS unique_hosts,
    -- Financial
    COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount END), 0) AS total_spent,
    COALESCE(AVG(CASE WHEN b.status = 'completed' THEN b.total_amount END), 0) AS avg_booking_value,
    COALESCE(MAX(CASE WHEN b.status = 'completed' THEN b.total_amount END), 0) AS highest_booking_value,
    -- Nights
    COALESCE(SUM(CASE WHEN b.status = 'completed' 
                      THEN DATEDIFF(b.check_out_date, b.check_in_date) END), 0) AS total_nights,
    -- Reviews given
    COUNT(DISTINCT r.id) AS reviews_given,
    ROUND(AVG(r.rating), 2) AS avg_rating_given,
    -- Loyalty tier
    CASE 
        WHEN COUNT(DISTINCT b.id) >= 20 THEN 'Platinum'
        WHEN COUNT(DISTINCT b.id) >= 10 THEN 'Gold'
        WHEN COUNT(DISTINCT b.id) >= 5 THEN 'Silver'
        WHEN COUNT(DISTINCT b.id) >= 1 THEN 'Bronze'
        ELSE 'New'
    END AS loyalty_tier,
    -- Last booking
    MAX(b.check_out_date) AS last_stay_date,
    DATEDIFF(CURDATE(), MAX(b.check_out_date)) AS days_since_last_stay
FROM users u
LEFT JOIN bookings b ON u.id = b.guest_id
LEFT JOIN accommodations a ON b.accommodation_id = a.id
LEFT JOIN reviews r ON b.id = r.booking_id
WHERE u.is_host = FALSE  -- Only guests
GROUP BY u.id, u.first_name, u.last_name, u.email, u.registration_date
ORDER BY total_bookings DESC, total_spent DESC;


-- =============================================================================
-- QUERY 9: Pricing Optimization Analysis
-- Purpose: Analyze pricing effectiveness and suggest optimizations
-- =============================================================================

SELECT 
    a.id AS accommodation_id,
    a.title,
    a.type,
    a.city,
    a.base_price_night,
    -- Current performance
    COUNT(DISTINCT b.id) AS total_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) AS completed_bookings,
    ROUND(
        COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) * 100.0 / 
        NULLIF(COUNT(DISTINCT b.id), 0), 
        2
    ) AS completion_rate,
    -- Revenue
    COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount END), 0) AS total_revenue,
    COALESCE(AVG(CASE WHEN b.status = 'completed' THEN b.total_amount END), 0) AS avg_booking_value,
    -- Reviews
    ROUND(AVG(r.rating), 2) AS avg_rating,
    COUNT(DISTINCT r.id) AS review_count,
    -- Market comparison (same city, same type)
    market_stats.avg_city_price,
    market_stats.min_city_price,
    market_stats.max_city_price,
    ROUND(a.base_price_night - market_stats.avg_city_price, 2) AS price_vs_market,
    -- Suggestion
    CASE 
        WHEN completion_rate < 30 AND a.base_price_night > market_stats.avg_city_price THEN 'Consider lowering price'
        WHEN completion_rate > 80 AND avg_rating >= 4.5 THEN 'Consider raising price'
        WHEN review_count < 3 THEN 'Need more reviews'
        ELSE 'Price seems appropriate'
    END AS pricing_suggestion
FROM accommodations a
LEFT JOIN bookings b ON a.id = b.accommodation_id
LEFT JOIN reviews r ON a.id = r.accommodation_id
LEFT JOIN (
    -- Market statistics subquery
    SELECT 
        type,
        city,
        AVG(base_price_night) AS avg_city_price,
        MIN(base_price_night) AS min_city_price,
        MAX(base_price_night) AS max_city_price
    FROM accommodations
    WHERE is_validated = TRUE
    GROUP BY type, city
) market_stats ON a.type = market_stats.type AND a.city = market_stats.city
WHERE a.is_validated = TRUE
GROUP BY 
    a.id, a.title, a.type, a.city, a.base_price_night,
    market_stats.avg_city_price, market_stats.min_city_price, market_stats.max_city_price
ORDER BY total_revenue DESC;


-- =============================================================================
-- QUERY 10: Cancellation Analysis
-- Purpose: Understand cancellation patterns and reasons
-- =============================================================================

SELECT 
    cp.policy_type,
    -- Counts
    COUNT(DISTINCT b.id) AS total_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'canceled' THEN b.id END) AS canceled_bookings,
    -- Rates
    ROUND(
        COUNT(DISTINCT CASE WHEN b.status = 'canceled' THEN b.id END) * 100.0 / 
        NULLIF(COUNT(DISTINCT b.id), 0), 
        2
    ) AS cancellation_rate,
    -- Financial impact
    COALESCE(SUM(CASE WHEN b.status = 'canceled' THEN b.total_amount END), 0) AS canceled_value,
    COALESCE(AVG(CASE WHEN b.status = 'canceled' THEN b.total_amount END), 0) AS avg_canceled_value,
    -- Timing analysis
    AVG(CASE WHEN b.status = 'canceled' 
             THEN DATEDIFF(b.check_in_date, b.created_at) END) AS avg_days_before_checkin,
    -- By accommodation type
    GROUP_CONCAT(DISTINCT a.type ORDER BY a.type) AS accommodation_types,
    -- Suggested policy
    CASE 
        WHEN COUNT(DISTINCT CASE WHEN b.status = 'canceled' THEN b.id END) * 100.0 / 
             NULLIF(COUNT(DISTINCT b.id), 0) > 40 THEN 'Consider stricter policy'
        WHEN COUNT(DISTINCT CASE WHEN b.status = 'canceled' THEN b.id END) * 100.0 / 
             NULLIF(COUNT(DISTINCT b.id), 0) < 10 THEN 'Policy is effective'
        ELSE 'Monitor cancellation trends'
    END AS policy_recommendation
FROM cancellation_policies cp
LEFT JOIN bookings b ON cp.id = b.cancellation_policy_id
LEFT JOIN accommodations a ON cp.accommodation_id = a.id
GROUP BY cp.policy_type
ORDER BY cancellation_rate DESC;


-- =============================================================================
-- COMPLEX QUERIES COMPLETE
-- =============================================================================
SELECT 'Complex queries created successfully!' AS status;
