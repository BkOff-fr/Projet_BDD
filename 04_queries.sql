-- =============================================================================
-- COMPLEX QUERIES — aligned with the current schema (01_schema.sql).
-- Run after 01 → 02 → 05.
-- Each query is parameterised through user variables (SET @x := ...).
-- Question markers point to the PDF section each query covers:
--   Q1 → [§ 4c]   Q2 → [§ 3]    Q3 → [§ 3]
--   Q4 → [§ 3]    Q5 → [§ 4c]   Q6 → [§ 3]
--   Q7 → [§ 4a]   Q8 → [§ 3]    Q9 → [§ 3]    Q10 → [§ 4b]
-- =============================================================================

-- =============================================================================
-- [§ 4c] [§ 3]  Q1 — Search accommodations by type with availability +
-- capacity + price. Uses idx_accommodations_search composite index.
-- =============================================================================
SET @search_type   := 'apartment';
SET @check_in      := '2026-06-10';
SET @check_out     := '2026-06-15';
SET @min_capacity  := 2;
SET @max_price     := 250.00;
SET @city_filter   := NULL;       -- e.g. 'New York'

SELECT
    a.id                                          AS accommodation_id,
    a.title,
    a.type,
    a.city,
    a.country,
    a.max_guests,
    a.bedrooms,
    a.bathrooms,
    a.price_per_night,
    a.has_alarm_system,
    cp.name                                       AS cancellation_policy,
    CONCAT(u.first_name, ' ', u.last_name)        AS host_name,
    GROUP_CONCAT(DISTINCT am.name ORDER BY am.name SEPARATOR ', ') AS amenities,
    DATEDIFF(@check_out, @check_in) * a.price_per_night AS estimated_base_total
FROM accommodations a
INNER JOIN users u                  ON a.host_id = u.id
INNER JOIN cancellation_policies cp ON a.cancellation_policy_id = cp.id
LEFT  JOIN accommodation_amenities aa ON aa.accommodation_id = a.id
LEFT  JOIN amenities am             ON am.id = aa.amenity_id
WHERE a.type            = @search_type
  AND a.is_validated    = TRUE
  AND a.has_alarm_system= TRUE
  AND a.is_active       = TRUE
  AND a.max_guests      >= @min_capacity
  AND a.price_per_night <= @max_price
  AND (@city_filter IS NULL OR a.city = @city_filter)
  -- exclude accommodations with a host-blocked window overlapping the request
  AND NOT EXISTS (
      SELECT 1 FROM availability av
      WHERE av.accommodation_id = a.id
        AND av.is_available = FALSE
        AND av.start_date < @check_out
        AND av.end_date   > @check_in
  )
  -- exclude accommodations already booked in an active state
  AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.accommodation_id = a.id
        AND b.status IN ('pending','confirmed')
        AND b.check_in_date  < @check_out
        AND b.check_out_date > @check_in
  )
GROUP BY a.id, a.title, a.type, a.city, a.country, a.max_guests, a.bedrooms,
         a.bathrooms, a.price_per_night, a.has_alarm_system, cp.name,
         u.first_name, u.last_name
ORDER BY a.price_per_night ASC;


-- =============================================================================
-- [§ 3]  Q2 — Reconstruct the total cost of a booking.
-- Walks every night between check-in and check-out (recursive CTE), applies
-- the matching pricing_rule (if any), then adds the accommodation_fees.
-- =============================================================================
SET @booking_id := 8;

WITH RECURSIVE nights(d, accommodation_id, max_d) AS (
    SELECT b.check_in_date,
           b.accommodation_id,
           DATE_SUB(b.check_out_date, INTERVAL 1 DAY)
    FROM bookings b WHERE b.id = @booking_id
    UNION ALL
    SELECT DATE_ADD(d, INTERVAL 1 DAY), accommodation_id, max_d
    FROM nights WHERE d < max_d
),
night_prices AS (
    SELECT
        n.d                                        AS night_date,
        a.price_per_night                          AS base_price,
        pr.rule_type,
        pr.value                                   AS rule_value,
        CASE pr.rule_type
            WHEN 'fixed_increase'      THEN a.price_per_night + pr.value
            WHEN 'fixed_decrease'      THEN GREATEST(a.price_per_night - pr.value, 0)
            WHEN 'percentage_increase' THEN a.price_per_night * (1 + pr.value/100)
            WHEN 'percentage_decrease' THEN a.price_per_night * (1 - pr.value/100)
            ELSE a.price_per_night
        END                                        AS effective_price
    FROM nights n
    INNER JOIN accommodations a ON a.id = n.accommodation_id
    LEFT  JOIN pricing_rules pr ON pr.accommodation_id = n.accommodation_id
                                AND pr.is_active = TRUE
                                AND n.d BETWEEN pr.start_date AND pr.end_date
),
nightly_subtotal AS (
    SELECT
        COUNT(*)                AS num_nights,
        SUM(effective_price)    AS subtotal
    FROM night_prices
),
fee_lines AS (
    SELECT
        af.fee_type,
        af.amount,
        af.is_percentage,
        CASE WHEN af.is_percentage
             THEN (SELECT subtotal FROM nightly_subtotal) * af.amount / 100
             ELSE af.amount
        END AS fee_value
    FROM bookings b
    INNER JOIN accommodation_fees af ON af.accommodation_id = b.accommodation_id
    WHERE b.id = @booking_id
)
SELECT
    b.id                                          AS booking_id,
    b.check_in_date,
    b.check_out_date,
    ns.num_nights,
    ROUND(ns.subtotal, 2)                         AS nights_subtotal,
    GROUP_CONCAT(
        CONCAT(fl.fee_type, ': ', ROUND(fl.fee_value, 2))
        SEPARATOR ' | '
    )                                             AS fees_breakdown,
    ROUND(COALESCE(SUM(fl.fee_value), 0), 2)      AS total_fees,
    ROUND(ns.subtotal + COALESCE(SUM(fl.fee_value), 0), 2) AS calculated_total,
    b.total_price                                 AS stored_total
FROM bookings b
CROSS JOIN nightly_subtotal ns
LEFT  JOIN fee_lines fl ON 1 = 1
WHERE b.id = @booking_id
GROUP BY b.id, b.check_in_date, b.check_out_date, b.total_price,
         ns.num_nights, ns.subtotal;


-- =============================================================================
-- [§ 3]  Q3 — Booking history with payments aggregated per booking.
-- =============================================================================
SET @guest_id := NULL; -- NULL = every booking

SELECT
    b.id                                          AS booking_id,
    b.check_in_date,
    b.check_out_date,
    DATEDIFF(b.check_out_date, b.check_in_date)   AS num_nights,
    b.status,
    b.total_price,
    b.cancelled_at,
    CONCAT(g.first_name, ' ', g.last_name)        AS guest_name,
    a.title                                       AS accommodation_title,
    a.city,
    COUNT(p.id)                                   AS payment_count,
    COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount END), 0) AS paid_total,
    COALESCE(SUM(CASE WHEN p.status = 'pending'   THEN p.amount END), 0) AS pending_total,
    COALESCE(SUM(CASE WHEN p.status = 'refunded'  THEN p.amount END), 0) AS refunded_total,
    GROUP_CONCAT(
        CONCAT(p.payment_type, '=', p.status, ':', ROUND(p.amount, 2))
        ORDER BY p.created_at SEPARATOR ' | '
    )                                             AS payments_log,
    r.rating                                      AS review_rating,
    LEFT(r.comment, 80)                           AS review_preview
FROM bookings b
INNER JOIN users g          ON g.id = b.guest_id
INNER JOIN accommodations a ON a.id = b.accommodation_id
LEFT  JOIN payments p       ON p.booking_id = b.id
LEFT  JOIN reviews  r       ON r.booking_id = b.id
WHERE (@guest_id IS NULL OR b.guest_id = @guest_id)
GROUP BY b.id, b.check_in_date, b.check_out_date, b.status, b.total_price,
         b.cancelled_at, g.first_name, g.last_name, a.title, a.city,
         r.rating, r.comment
ORDER BY b.created_at DESC;


-- =============================================================================
-- [§ 3]  Q4 — Host earnings summary (uses the v_host_earnings_summary view).
-- =============================================================================
SELECT *
FROM v_host_earnings_summary
ORDER BY total_earnings DESC;


-- =============================================================================
-- [§ 4c]  Q5 — Search by required amenities. Returns accommodations that
-- match ALL amenities listed in @required (comma-separated names).
-- =============================================================================
SET @required := 'WiFi,Kitchen';

WITH wanted AS (
    SELECT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(@required, ',', n.n), ',', -1)) AS name
    FROM (
        SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3
        UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
    ) n
    WHERE n.n <= 1 + (LENGTH(@required) - LENGTH(REPLACE(@required, ',', '')))
)
SELECT
    a.id                                          AS accommodation_id,
    a.title,
    a.city,
    a.price_per_night,
    GROUP_CONCAT(DISTINCT am.name ORDER BY am.name SEPARATOR ', ') AS amenities
FROM accommodations a
INNER JOIN accommodation_amenities aa ON aa.accommodation_id = a.id
INNER JOIN amenities am               ON am.id = aa.amenity_id
WHERE a.is_validated = TRUE
  AND a.has_alarm_system = TRUE
  AND am.name IN (SELECT name FROM wanted)
GROUP BY a.id, a.title, a.city, a.price_per_night
HAVING COUNT(DISTINCT am.name) = (SELECT COUNT(*) FROM wanted)
ORDER BY a.city, a.price_per_night;


-- =============================================================================
-- [§ 3]  Q6 — Monthly revenue & occupancy report for a given year.
-- =============================================================================
SET @target_year := 2024;

WITH RECURSIVE months(m) AS (
    SELECT 1 UNION ALL SELECT m + 1 FROM months WHERE m < 12
)
SELECT
    months.m                                      AS month_num,
    DATE_FORMAT(STR_TO_DATE(CONCAT(@target_year,'-',months.m,'-01'),'%Y-%m-%d'),'%M')
                                                  AS month_name,
    COUNT(DISTINCT b.id)                          AS bookings_in_month,
    COUNT(DISTINCT CASE WHEN b.status='completed' THEN b.id END) AS completed,
    COUNT(DISTINCT CASE WHEN b.status='cancelled' THEN b.id END) AS cancelled,
    COALESCE(SUM(CASE WHEN b.status='completed' THEN b.total_price END), 0) AS realized_revenue,
    COALESCE(AVG(CASE WHEN b.status='completed' THEN b.total_price END), 0) AS avg_booking_value,
    COALESCE(SUM(CASE WHEN b.status='completed'
                      THEN DATEDIFF(b.check_out_date, b.check_in_date) END), 0) AS nights_booked,
    COUNT(DISTINCT b.guest_id)                    AS unique_guests
FROM months
LEFT JOIN bookings b
       ON YEAR(b.check_in_date) = @target_year
      AND MONTH(b.check_in_date) = months.m
GROUP BY months.m
ORDER BY months.m;


-- =============================================================================
-- [§ 4a]  Q7 — Audit: detect any overlapping active bookings (should always
-- be empty thanks to trg_booking_validate_before_insert; verifies integrity
-- after data import).
-- =============================================================================
SELECT
    b1.id AS booking_a,
    b2.id AS booking_b,
    b1.accommodation_id,
    a.title,
    GREATEST(b1.check_in_date, b2.check_in_date)  AS overlap_start,
    LEAST(b1.check_out_date, b2.check_out_date)   AS overlap_end
FROM bookings b1
INNER JOIN bookings b2
        ON b1.accommodation_id = b2.accommodation_id
       AND b1.id < b2.id
       AND b1.status IN ('pending','confirmed')
       AND b2.status IN ('pending','confirmed')
       AND b1.check_in_date  < b2.check_out_date
       AND b1.check_out_date > b2.check_in_date
INNER JOIN accommodations a ON a.id = b1.accommodation_id
ORDER BY b1.accommodation_id;


-- =============================================================================
-- [§ 3]  Q8 — Guest loyalty tiers based on lifetime bookings.
-- =============================================================================
SELECT
    u.id                                          AS guest_id,
    CONCAT(u.first_name, ' ', u.last_name)        AS guest_name,
    u.email,
    u.created_at                                  AS member_since,
    DATEDIFF(CURDATE(), u.created_at)             AS days_as_member,
    COUNT(DISTINCT b.id)                          AS total_bookings,
    COUNT(DISTINCT CASE WHEN b.status='completed' THEN b.id END) AS completed_bookings,
    COALESCE(SUM(CASE WHEN b.status='completed' THEN b.total_price END), 0) AS total_spent,
    COUNT(DISTINCT r.id)                          AS reviews_given,
    ROUND(AVG(r.rating), 2)                       AS avg_rating_given,
    CASE
        WHEN COUNT(DISTINCT b.id) >= 5 THEN 'Gold'
        WHEN COUNT(DISTINCT b.id) >= 2 THEN 'Silver'
        WHEN COUNT(DISTINCT b.id) = 1  THEN 'Bronze'
        ELSE 'New'
    END                                           AS loyalty_tier,
    MAX(b.check_out_date)                         AS last_stay
FROM users u
LEFT JOIN bookings b ON b.guest_id = u.id
LEFT JOIN reviews  r ON r.booking_id = b.id
GROUP BY u.id, u.first_name, u.last_name, u.email, u.created_at
ORDER BY total_bookings DESC, total_spent DESC;


-- =============================================================================
-- [§ 3]  Q9 — Cancellation analysis with refund computation.
-- For every cancelled booking, applies the policy to estimate the refund the
-- guest is entitled to (full / partial / none) based on the cancellation lead.
-- =============================================================================
SELECT
    b.id                                          AS booking_id,
    a.title                                       AS accommodation_title,
    cp.name                                       AS policy_name,
    b.total_price,
    b.cancelled_at,
    b.check_in_date,
    DATEDIFF(b.check_in_date, DATE(b.cancelled_at)) AS days_before_checkin,
    cp.full_refund_days_before,
    cp.partial_refund_days_before,
    cp.partial_refund_percentage,
    CASE
        WHEN DATEDIFF(b.check_in_date, DATE(b.cancelled_at)) >= cp.full_refund_days_before
             THEN ROUND(b.total_price, 2)
        WHEN DATEDIFF(b.check_in_date, DATE(b.cancelled_at)) >= cp.partial_refund_days_before
             THEN ROUND(b.total_price * cp.partial_refund_percentage / 100, 2)
        ELSE 0
    END                                           AS refund_due,
    -- compare against what was actually refunded via payments
    COALESCE((SELECT SUM(p.amount) FROM payments p
              WHERE p.booking_id = b.id AND p.status = 'refunded'), 0) AS refund_paid
FROM bookings b
INNER JOIN accommodations a         ON a.id = b.accommodation_id
INNER JOIN cancellation_policies cp ON cp.id = a.cancellation_policy_id
WHERE b.status = 'cancelled'
ORDER BY b.cancelled_at DESC;


-- =============================================================================
-- [§ 4b]  Q10 — Dashboard query: lowest rating per accommodation, with the
-- comment, the reviewer profile and the reviewer's lifetime booking count.
-- Implemented as a view (v_dashboard_lowest_ratings) for reuse — this is the
-- consumer query on top of it.
-- =============================================================================
SELECT
    accommodation_id,
    accommodation_title,
    lowest_rating,
    lowest_comment,
    reviewer_name,
    reviewer_email,
    reviewer_member_since,
    reviewer_total_bookings
FROM v_dashboard_lowest_ratings
ORDER BY lowest_rating ASC, accommodation_id;


SELECT 'All complex queries executed successfully.' AS status;
