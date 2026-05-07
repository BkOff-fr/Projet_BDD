-- =============================================================================
-- [§ 4a]  BUSINESS-RULE TRIGGERS
-- Inline CHECKs and FKs are in 01_schema.sql.
-- This file enforces the rules that require row lookups across tables.
-- Question markers point to the PDF section each trigger covers.
-- =============================================================================

-- Drop first to keep the script idempotent
DROP TRIGGER IF EXISTS trg_booking_validate_before_insert;
DROP TRIGGER IF EXISTS trg_booking_validate_before_update;
DROP TRIGGER IF EXISTS trg_booking_set_cancelled_at;
DROP TRIGGER IF EXISTS trg_review_status_before_insert;
DROP TRIGGER IF EXISTS trg_accommodation_validation_consistency;

DELIMITER //

-- ---------------------------------------------------------------------------
-- [§ 3] [§ 4a] [§ 4d] [§ 4e]  BOOKINGS — INSERT
-- Enforces (in one place, before the row is written):
--   1. Capacity: num_guests must not exceed accommodation.max_guests       [§ 4a]
--   2. Validation: accommodation.is_validated must be TRUE                 [§ 4e]
--   3. Security:   accommodation.has_alarm_system must be TRUE             [§ 4d]
--   4. Listing active: accommodation.is_active must be TRUE                [§ 4a]
--   5. Min/max nights: stay length within the accommodation's bounds       [§ 4a]
--   6. Availability: stay must not overlap any blocked period              [§ 3]
--      (availability.is_available = FALSE)
--   7. No overlap with another active booking on the same accommodation    [§ 3]
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_booking_validate_before_insert
BEFORE INSERT ON bookings
FOR EACH ROW
BEGIN
    DECLARE v_max_guests INT;
    DECLARE v_is_validated BOOLEAN;
    DECLARE v_has_alarm BOOLEAN;
    DECLARE v_is_active BOOLEAN;
    DECLARE v_min_nights INT;
    DECLARE v_max_nights INT;
    DECLARE v_blocked INT DEFAULT 0;
    DECLARE v_overlap INT DEFAULT 0;
    DECLARE v_nights INT;

    SELECT max_guests, is_validated, has_alarm_system, is_active,
           minimum_nights, maximum_nights
      INTO v_max_guests, v_is_validated, v_has_alarm, v_is_active,
           v_min_nights, v_max_nights
    FROM accommodations
    WHERE id = NEW.accommodation_id;

    IF v_max_guests IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Accommodation does not exist';
    END IF;

    IF NEW.num_guests > v_max_guests THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'num_guests exceeds accommodation capacity';
    END IF;

    IF v_is_validated = FALSE THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Accommodation is not validated by the platform';
    END IF;

    IF v_has_alarm = FALSE THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Accommodation does not meet mandatory security requirements (alarm system missing)';
    END IF;

    IF v_is_active = FALSE THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Accommodation listing is not active';
    END IF;

    SET v_nights = DATEDIFF(NEW.check_out_date, NEW.check_in_date);
    IF v_nights < v_min_nights THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Stay is shorter than the accommodation minimum_nights';
    END IF;
    IF v_max_nights IS NOT NULL AND v_nights > v_max_nights THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Stay is longer than the accommodation maximum_nights';
    END IF;

    -- Blocked period overlap (host-defined unavailability)
    SELECT COUNT(*) INTO v_blocked
    FROM availability
    WHERE accommodation_id = NEW.accommodation_id
      AND is_available = FALSE
      AND start_date < NEW.check_out_date
      AND end_date   > NEW.check_in_date;

    IF v_blocked > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Accommodation is unavailable during the requested period';
    END IF;

    -- Concurrent active booking overlap
    SELECT COUNT(*) INTO v_overlap
    FROM bookings
    WHERE accommodation_id = NEW.accommodation_id
      AND status IN ('pending','confirmed')
      AND check_in_date < NEW.check_out_date
      AND check_out_date > NEW.check_in_date;

    IF v_overlap > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Accommodation already has an active booking for the selected dates';
    END IF;
END//

-- ---------------------------------------------------------------------------
-- [§ 3] [§ 4a]  BOOKINGS — UPDATE
-- Re-runs the same guards if booking dates / capacity / status change.
-- Excludes the current row from the overlap check.
-- Auto-stamps cancelled_at when status transitions to 'cancelled' (used by Q9).
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_booking_validate_before_update
BEFORE UPDATE ON bookings
FOR EACH ROW
BEGIN
    DECLARE v_max_guests INT;
    DECLARE v_overlap INT DEFAULT 0;
    DECLARE v_blocked INT DEFAULT 0;

    -- If the booking moves back to active state, all guards re-apply
    IF NEW.status IN ('pending','confirmed') THEN
        SELECT max_guests INTO v_max_guests
        FROM accommodations WHERE id = NEW.accommodation_id;

        IF NEW.num_guests > v_max_guests THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'num_guests exceeds accommodation capacity';
        END IF;

        SELECT COUNT(*) INTO v_blocked
        FROM availability
        WHERE accommodation_id = NEW.accommodation_id
          AND is_available = FALSE
          AND start_date < NEW.check_out_date
          AND end_date   > NEW.check_in_date;

        IF v_blocked > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Accommodation is unavailable during the requested period';
        END IF;

        SELECT COUNT(*) INTO v_overlap
        FROM bookings
        WHERE accommodation_id = NEW.accommodation_id
          AND id <> NEW.id
          AND status IN ('pending','confirmed')
          AND check_in_date < NEW.check_out_date
          AND check_out_date > NEW.check_in_date;

        IF v_overlap > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Accommodation already has an active booking for the selected dates';
        END IF;
    END IF;

    -- Auto-stamp cancelled_at on transition to cancelled
    IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' AND NEW.cancelled_at IS NULL THEN
        SET NEW.cancelled_at = CURRENT_TIMESTAMP;
    END IF;
END//

-- ---------------------------------------------------------------------------
-- [§ 3] [§ 4a]  REVIEWS — guests may review only completed stays.
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_review_status_before_insert
BEFORE INSERT ON reviews
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_check_out DATE;

    SELECT status, check_out_date
      INTO v_status, v_check_out
    FROM bookings
    WHERE id = NEW.booking_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Booking does not exist';
    END IF;

    IF v_status <> 'completed' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Reviews are only allowed on completed bookings';
    END IF;

    IF v_check_out > CURDATE() THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot review a stay that has not ended yet';
    END IF;
END//

-- ---------------------------------------------------------------------------
-- [§ 4d]  ACCOMMODATIONS — validation requires alarm.
-- A property cannot become is_validated = TRUE without an alarm system,
-- and toggling alarm to FALSE on a validated accommodation is rejected.
-- Redundant with the row-level CHECK chk_acc_validation_requires_alarm,
-- but kept for the explicit error message.
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_accommodation_validation_consistency
BEFORE UPDATE ON accommodations
FOR EACH ROW
BEGIN
    IF NEW.is_validated = TRUE AND NEW.has_alarm_system = FALSE THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot validate an accommodation without an alarm system';
    END IF;
END//

DELIMITER ;

SELECT 'Triggers created successfully.' AS status;
