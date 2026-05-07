-- =============================================================================
-- VIEWS
-- Predefined queries for the dashboard and analytics requirements (§ 4).
-- All view names start with v_ for clarity.
-- Question markers point to the PDF section each view covers.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- [§ 4f]  Marketing list: every accommodation, with average rating.
-- LEFT JOIN chain so never-booked / never-reviewed properties still appear.
-- avg_rating IS NULL when no reviews exist (rendered as 'No reviews').
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_accommodations_with_avg_rating AS
SELECT
    a.id                                          AS accommodation_id,
    a.title,
    a.type,
    a.city,
    a.country,
    a.price_per_night,
    a.is_validated,
    a.has_alarm_system,
    a.is_active,
    a.created_at,
    a.host_id,
    CONCAT(u.first_name, ' ', u.last_name)        AS host_name,
    u.email                                       AS host_email,
    cp.name                                       AS cancellation_policy,
    ROUND(AVG(r.rating), 2)                       AS avg_rating,
    COUNT(r.id)                                   AS total_reviews,
    COALESCE(CAST(ROUND(AVG(r.rating), 2) AS CHAR), 'No reviews')
                                                  AS avg_rating_display
FROM accommodations a
INNER JOIN users u                  ON a.host_id = u.id
INNER JOIN cancellation_policies cp ON a.cancellation_policy_id = cp.id
LEFT  JOIN bookings b               ON b.accommodation_id = a.id
LEFT  JOIN reviews r                ON r.booking_id = b.id
GROUP BY a.id, a.title, a.type, a.city, a.country, a.price_per_night,
         a.is_validated, a.has_alarm_system, a.is_active, a.created_at,
         a.host_id, u.first_name, u.last_name, u.email, cp.name
ORDER BY (AVG(r.rating) IS NULL), AVG(r.rating) DESC, a.created_at DESC;

-- -----------------------------------------------------------------------------
-- [§ 4b]  Daily dashboard: lowest rating per accommodation.
-- One row per accommodation that has at least one review. For each:
--   - the lowest rating
--   - the matching comment
--   - the reviewer's profile
--   - that reviewer's total bookings on the platform
-- Ties on minimum rating are broken by most recent comment.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_dashboard_lowest_ratings AS
SELECT
    b.accommodation_id,
    a.title                                       AS accommodation_title,
    r.rating                                      AS lowest_rating,
    r.comment                                     AS lowest_comment,
    r.created_at                                  AS review_date,
    u.id                                          AS reviewer_id,
    CONCAT(u.first_name, ' ', u.last_name)        AS reviewer_name,
    u.email                                       AS reviewer_email,
    u.phone                                       AS reviewer_phone,
    u.created_at                                  AS reviewer_member_since,
    (SELECT COUNT(*) FROM bookings b2 WHERE b2.guest_id = b.guest_id)
                                                  AS reviewer_total_bookings
FROM reviews r
INNER JOIN bookings b      ON r.booking_id = b.id
INNER JOIN accommodations a ON b.accommodation_id = a.id
INNER JOIN users u         ON b.guest_id = u.id
-- keep only the lowest-rated review per accommodation; tie-break on most recent
WHERE (r.rating, r.created_at) = (
    SELECT r2.rating, MAX(r2.created_at)
    FROM reviews r2
    INNER JOIN bookings b2 ON r2.booking_id = b2.id
    WHERE b2.accommodation_id = b.accommodation_id
      AND r2.rating = (
          SELECT MIN(r3.rating)
          FROM reviews r3
          INNER JOIN bookings b3 ON r3.booking_id = b3.id
          WHERE b3.accommodation_id = b.accommodation_id
      )
    GROUP BY r2.rating
)
ORDER BY lowest_rating ASC, b.accommodation_id;

-- -----------------------------------------------------------------------------
-- [§ 3]  Booking details with all related entities (denormalized for reporting).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_booking_details_complete AS
SELECT
    b.id                                          AS booking_id,
    b.check_in_date,
    b.check_out_date,
    DATEDIFF(b.check_out_date, b.check_in_date)   AS num_nights,
    b.num_guests,
    b.status                                      AS booking_status,
    b.total_price,
    b.cancelled_at,
    b.created_at                                  AS booking_created_at,
    b.guest_id,
    CONCAT(g.first_name, ' ', g.last_name)        AS guest_name,
    g.email                                       AS guest_email,
    g.phone                                       AS guest_phone,
    b.accommodation_id,
    a.title                                       AS accommodation_title,
    a.type                                        AS accommodation_type,
    a.address,
    a.city,
    a.country,
    a.price_per_night,
    a.is_validated,
    a.has_alarm_system,
    cp.name                                       AS cancellation_policy,
    a.host_id,
    CONCAT(h.first_name, ' ', h.last_name)        AS host_name,
    h.email                                       AS host_email
FROM bookings b
INNER JOIN users g                  ON b.guest_id = g.id
INNER JOIN accommodations a         ON b.accommodation_id = a.id
INNER JOIN users h                  ON a.host_id = h.id
INNER JOIN cancellation_policies cp ON a.cancellation_policy_id = cp.id
ORDER BY b.created_at DESC;

-- -----------------------------------------------------------------------------
-- [§ 3]  Host earnings summary (per host).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_host_earnings_summary AS
SELECT
    u.id                                          AS host_id,
    CONCAT(u.first_name, ' ', u.last_name)        AS host_name,
    u.email                                       AS host_email,
    COUNT(DISTINCT a.id)                          AS total_accommodations,
    COUNT(DISTINCT CASE WHEN a.is_validated THEN a.id END) AS validated_accommodations,
    COUNT(DISTINCT b.id)                          AS total_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) AS completed_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'confirmed' THEN b.id END) AS confirmed_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'pending'   THEN b.id END) AS pending_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'cancelled' THEN b.id END) AS cancelled_bookings,
    COALESCE(SUM(CASE WHEN b.status IN ('completed','confirmed') THEN b.total_price END), 0)
                                                  AS total_earnings,
    COALESCE(AVG(CASE WHEN b.status = 'completed' THEN b.total_price END), 0)
                                                  AS avg_booking_value,
    COUNT(DISTINCT r.id)                          AS total_reviews,
    ROUND(AVG(r.rating), 2)                       AS avg_rating
FROM users u
LEFT JOIN accommodations a ON a.host_id = u.id
LEFT JOIN bookings b       ON b.accommodation_id = a.id
LEFT JOIN reviews r        ON r.booking_id = b.id
WHERE u.is_host = TRUE
GROUP BY u.id, u.first_name, u.last_name, u.email
ORDER BY total_earnings DESC;

-- -----------------------------------------------------------------------------
-- [§ 3]  Cancellation analysis per policy.
-- Helps the platform tune which policies generate the most cancellations
-- and the resulting financial impact.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_cancellation_analysis AS
SELECT
    cp.id                                         AS policy_id,
    cp.name                                       AS policy_name,
    cp.full_refund_days_before,
    cp.partial_refund_days_before,
    cp.partial_refund_percentage,
    COUNT(DISTINCT b.id)                          AS total_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'cancelled' THEN b.id END) AS cancelled_bookings,
    ROUND(
        COUNT(DISTINCT CASE WHEN b.status = 'cancelled' THEN b.id END) * 100.0
        / NULLIF(COUNT(DISTINCT b.id), 0), 2
    )                                             AS cancellation_rate_pct,
    COALESCE(SUM(CASE WHEN b.status = 'cancelled' THEN b.total_price END), 0)
                                                  AS cancelled_value
FROM cancellation_policies cp
LEFT JOIN accommodations a ON a.cancellation_policy_id = cp.id
LEFT JOIN bookings b       ON b.accommodation_id = a.id
GROUP BY cp.id, cp.name, cp.full_refund_days_before,
         cp.partial_refund_days_before, cp.partial_refund_percentage
ORDER BY cancellation_rate_pct DESC;

SELECT 'Views created successfully.' AS status;
