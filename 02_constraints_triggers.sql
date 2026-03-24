-- =============================================================================
-- ACCOMMODATION RENTAL PLATFORM - CONSTRAINTS AND TRIGGERS
-- Business rules enforcement through CHECK constraints and triggers
-- =============================================================================
-- Execute this file AFTER 01_schema.sql
-- =============================================================================

-- =============================================================================
-- SECTION 1: CHECK CONSTRAINTS (MySQL 8.0+)
-- Note: MySQL 8.0.16+ supports CHECK constraints
-- =============================================================================

-- Add CHECK constraints to users table
ALTER TABLE users
    ADD CONSTRAINT chk_users_email_format 
        CHECK (email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    ADD CONSTRAINT chk_users_birth_date_past 
        CHECK (birth_date IS NULL OR birth_date <= CURDATE());

-- Add CHECK constraints to accommodations table
ALTER TABLE accommodations
    ADD CONSTRAINT chk_accommodations_capacity_positive 
        CHECK (capacity > 0),
    ADD CONSTRAINT chk_accommodations_bedrooms_nonnegative 
        CHECK (bedrooms >= 0),
    ADD CONSTRAINT chk_accommodations_bathrooms_nonnegative 
        CHECK (bathrooms >= 0),
    ADD CONSTRAINT chk_accommodations_base_price_positive 
        CHECK (base_price_night > 0);

-- Add CHECK constraints to availability table
ALTER TABLE availability
    ADD CONSTRAINT chk_availability_date_range 
        CHECK (end_date >= start_date);

-- Add CHECK constraints to pricing_rules table
ALTER TABLE pricing_rules
    ADD CONSTRAINT chk_pricing_date_range 
        CHECK (end_date >= start_date),
    ADD CONSTRAINT chk_pricing_multiplier_positive 
        CHECK (price_multiplier > 0);

-- Add CHECK constraints to additional_fees table
ALTER TABLE additional_fees
    ADD CONSTRAINT chk_fees_amount_positive 
        CHECK (amount >= 0),
    ADD CONSTRAINT chk_fees_percentage_range 
        CHECK (is_percentage = FALSE OR amount <= 100);

-- Add CHECK constraints to cancellation_policies table
ALTER TABLE cancellation_policies
    ADD CONSTRAINT chk_policy_days_positive 
        CHECK (days_before_full_refund >= 0),
    ADD CONSTRAINT chk_policy_partial_refund_range 
        CHECK (partial_refund_percent BETWEEN 0 AND 100),
    ADD CONSTRAINT chk_policy_no_refund_days_positive 
        CHECK (no_refund_days_before >= 0);

-- Add CHECK constraints to bookings table
ALTER TABLE bookings
    ADD CONSTRAINT chk_bookings_date_range 
        CHECK (check_out_date > check_in_date),
    ADD CONSTRAINT chk_bookings_total_amount_positive 
        CHECK (total_amount IS NULL OR total_amount >= 0);

-- Add CHECK constraints to payments table
ALTER TABLE payments
    ADD CONSTRAINT chk_payments_amount_not_zero 
        CHECK (amount != 0);

-- Add CHECK constraints to reviews table
ALTER TABLE reviews
    ADD CONSTRAINT chk_reviews_rating_range 
        CHECK (rating BETWEEN 1 AND 5);

-- Add CHECK constraints to messages table
ALTER TABLE messages
    ADD CONSTRAINT chk_messages_different_users 
        CHECK (sender_id != receiver_id);

SELECT 'CHECK constraints added successfully!' AS status;

-- =============================================================================
-- SECTION 2: TRIGGERS FOR BUSINESS RULES
-- =============================================================================

DELIMITER //

-- =============================================================================
-- TRIGGER 1: Prevent booking unavailable periods
-- This trigger checks if the accommodation is available for the requested dates
-- =============================================================================
CREATE TRIGGER trg_check_availability_before_insert
BEFORE INSERT ON bookings
FOR EACH ROW
BEGIN
    DECLARE v_unavailable_count INT DEFAULT 0;
    DECLARE v_accommodation_exists INT DEFAULT 0;
    
    -- Check if accommodation exists and is validated
    SELECT COUNT(*) INTO v_accommodation_exists
    FROM accommodations 
    WHERE id = NEW.accommodation_id AND is_validated = TRUE;
    
    IF v_accommodation_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Error: Accommodation does not exist or is not validated';
    END IF;
    
    -- Check for unavailable periods that overlap with booking dates
    SELECT COUNT(*) INTO v_unavailable_count
    FROM availability
    WHERE accommodation_id = NEW.accommodation_id
        AND is_available = FALSE
        AND (
            (NEW.check_in_date BETWEEN start_date AND end_date)
            OR (NEW.check_out_date BETWEEN start_date AND end_date)
            OR (start_date BETWEEN NEW.check_in_date AND NEW.check_out_date)
        );
    
    IF v_unavailable_count > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Error: Accommodation is not available for the selected dates';
    END IF;
    
    -- Check for overlapping existing bookings (validated or pending)
    SELECT COUNT(*) INTO v_unavailable_count
    FROM bookings
    WHERE accommodation_id = NEW.accommodation_id
        AND status IN ('pending', 'validated')
        AND id != NEW.id
        AND (
            (NEW.check_in_date BETWEEN check_in_date AND DATE_SUB(check_out_date, INTERVAL 1 DAY))
            OR (NEW.check_out_date BETWEEN DATE_ADD(check_in_date, INTERVAL 1 DAY) AND check_out_date)
            OR (check_in_date BETWEEN NEW.check_in_date AND DATE_SUB(NEW.check_out_date, INTERVAL 1 DAY))
        );
    
    IF v_unavailable_count > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Error: Accommodation is already booked for the selected dates';
    END IF;
END//

-- Same check for UPDATE operations
CREATE TRIGGER trg_check_availability_before_update
BEFORE UPDATE ON bookings
FOR EACH ROW
BEGIN
    DECLARE v_unavailable_count INT DEFAULT 0;
    
    -- Only check if dates are being changed
    IF NEW.check_in_date != OLD.check_in_date OR NEW.check_out_date != OLD.check_out_date THEN
        -- Check for unavailable periods
        SELECT COUNT(*) INTO v_unavailable_count
        FROM availability
        WHERE accommodation_id = NEW.accommodation_id
            AND is_available = FALSE
            AND (
                (NEW.check_in_date BETWEEN start_date AND end_date)
                OR (NEW.check_out_date BETWEEN start_date AND end_date)
                OR (start_date BETWEEN NEW.check_in_date AND NEW.check_out_date)
            );
        
        IF v_unavailable_count > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Error: Accommodation is not available for the selected dates';
        END IF;
        
        -- Check for overlapping bookings
        SELECT COUNT(*) INTO v_unavailable_count
        FROM bookings
        WHERE accommodation_id = NEW.accommodation_id
            AND status IN ('pending', 'validated')
            AND id != NEW.id
            AND (
                (NEW.check_in_date BETWEEN check_in_date AND DATE_SUB(check_out_date, INTERVAL 1 DAY))
                OR (NEW.check_out_date BETWEEN DATE_ADD(check_in_date, INTERVAL 1 DAY) AND check_out_date)
                OR (check_in_date BETWEEN NEW.check_in_date AND DATE_SUB(NEW.check_out_date, INTERVAL 1 DAY))
            );
        
        IF v_unavailable_count > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Error: Accommodation is already booked for the selected dates';
        END IF;
    END IF;
END//

-- =============================================================================
-- TRIGGER 2: Prevent booking non-compliant properties
-- Enforces compliance requirements (e.g., must have alarm system for certain types)
-- =============================================================================
CREATE TRIGGER trg_check_compliance_before_insert
BEFORE INSERT ON bookings
FOR EACH ROW
BEGIN
    DECLARE v_has_alarm BOOLEAN DEFAULT FALSE;
    DECLARE v_accommodation_type VARCHAR(20);
    DECLARE v_is_compliant BOOLEAN DEFAULT TRUE;
    
    -- Get accommodation details
    SELECT type, has_alarm_system 
    INTO v_accommodation_type, v_has_alarm
    FROM accommodations 
    WHERE id = NEW.accommodation_id;
    
    -- Compliance rule: Villa and House types MUST have alarm system
    IF (v_accommodation_type IN ('villa', 'house')) AND (v_has_alarm = FALSE) THEN
        SET v_is_compliant = FALSE;
    END IF;
    
    IF v_is_compliant = FALSE THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Error: This property type requires an alarm system for booking. Property is not compliant.';
    END IF;
END//

-- Same check for UPDATE
CREATE TRIGGER trg_check_compliance_before_update
BEFORE UPDATE ON bookings
FOR EACH ROW
BEGIN
    DECLARE v_has_alarm BOOLEAN DEFAULT FALSE;
    DECLARE v_accommodation_type VARCHAR(20);
    DECLARE v_is_compliant BOOLEAN DEFAULT TRUE;
    
    -- Only check if accommodation is being changed
    IF NEW.accommodation_id != OLD.accommodation_id THEN
        SELECT type, has_alarm_system 
        INTO v_accommodation_type, v_has_alarm
        FROM accommodations 
        WHERE id = NEW.accommodation_id;
        
        -- Compliance rule: Villa and House types MUST have alarm system
        IF (v_accommodation_type IN ('villa', 'house')) AND (v_has_alarm = FALSE) THEN
            SET v_is_compliant = FALSE;
        END IF;
        
        IF v_is_compliant = FALSE THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Error: This property type requires an alarm system for booking. Property is not compliant.';
        END IF;
    END IF;
END//

-- =============================================================================
-- TRIGGER 3: Calculate total_amount based on pricing rules and fees
-- Automatically computes booking total including base price, multipliers, and fees
-- =============================================================================
CREATE TRIGGER trg_calculate_booking_total_before_insert
BEFORE INSERT ON bookings
FOR EACH ROW
BEGIN
    DECLARE v_base_price DECIMAL(10,2);
    DECLARE v_num_nights INT;
    DECLARE v_subtotal DECIMAL(12,2) DEFAULT 0;
    DECLARE v_total_fees DECIMAL(12,2) DEFAULT 0;
    DECLARE v_final_total DECIMAL(12,2) DEFAULT 0;
    DECLARE v_current_date DATE;
    DECLARE v_daily_price DECIMAL(10,2);
    DECLARE v_multiplier DECIMAL(4,2);
    DECLARE v_fee_amount DECIMAL(10,2);
    DECLARE v_fee_is_percentage BOOLEAN;
    DECLARE v_done INT DEFAULT FALSE;
    
    -- Cursor for iterating through booking dates
    DECLARE date_cursor CURSOR FOR
        SELECT DATE_ADD(NEW.check_in_date, INTERVAL n DAY) as booking_date
        FROM (
            SELECT a.N + b.N * 10 AS n
            FROM 
                (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
                 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a
                CROSS JOIN
                (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
                 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b
        ) numbers
        WHERE DATE_ADD(NEW.check_in_date, INTERVAL n DAY) < NEW.check_out_date
        LIMIT 365;
    
    -- Cursor for fees
    DECLARE fee_cursor CURSOR FOR
        SELECT amount, is_percentage 
        FROM additional_fees 
        WHERE accommodation_id = NEW.accommodation_id;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;
    
    -- Get base price
    SELECT base_price_night INTO v_base_price
    FROM accommodations
    WHERE id = NEW.accommodation_id;
    
    -- Calculate number of nights
    SET v_num_nights = DATEDIFF(NEW.check_out_date, NEW.check_in_date);
    
    -- Calculate subtotal with pricing rules
    OPEN date_cursor;
    date_loop: LOOP
        FETCH date_cursor INTO v_current_date;
        IF v_done THEN
            LEAVE date_loop;
        END IF;
        
        -- Get multiplier for this date (default 1.0)
        SET v_multiplier = 1.0;
        SELECT price_multiplier INTO v_multiplier
        FROM pricing_rules
        WHERE accommodation_id = NEW.accommodation_id
            AND v_current_date BETWEEN start_date AND end_date
        ORDER BY price_multiplier DESC
        LIMIT 1;
        
        IF v_multiplier IS NULL THEN
            SET v_multiplier = 1.0;
        END IF;
        
        SET v_daily_price = v_base_price * v_multiplier;
        SET v_subtotal = v_subtotal + v_daily_price;
    END LOOP;
    CLOSE date_cursor;
    
    -- Calculate additional fees
    SET v_done = FALSE;
    OPEN fee_cursor;
    fee_loop: LOOP
        FETCH fee_cursor INTO v_fee_amount, v_fee_is_percentage;
        IF v_done THEN
            LEAVE fee_loop;
        END IF;
        
        IF v_fee_is_percentage THEN
            SET v_total_fees = v_total_fees + (v_subtotal * v_fee_amount / 100);
        ELSE
            SET v_total_fees = v_total_fees + v_fee_amount;
        END IF;
    END LOOP;
    CLOSE fee_cursor;
    
    -- Calculate final total
    SET v_final_total = v_subtotal + v_total_fees;
    
    -- Set the calculated total
    SET NEW.total_amount = v_final_total;
    
    -- Set default cancellation policy if not provided
    IF NEW.cancellation_policy_id IS NULL THEN
        SELECT id INTO NEW.cancellation_policy_id
        FROM cancellation_policies
        WHERE accommodation_id = NEW.accommodation_id
        LIMIT 1;
    END IF;
END//

-- =============================================================================
-- TRIGGER 4: Prevent duplicate reviews
-- Ensures a guest can only review an accommodation once per booking
-- =============================================================================
CREATE TRIGGER trg_prevent_duplicate_reviews_before_insert
BEFORE INSERT ON reviews
FOR EACH ROW
BEGIN
    DECLARE v_existing_review_count INT DEFAULT 0;
    
    SELECT COUNT(*) INTO v_existing_review_count
    FROM reviews
    WHERE booking_id = NEW.booking_id
        AND guest_id = NEW.guest_id
        AND accommodation_id = NEW.accommodation_id;
    
    IF v_existing_review_count > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Error: A review already exists for this booking';
    END IF;
    
    -- Also verify the booking is completed
    DECLARE v_booking_status VARCHAR(20);
    
    SELECT status INTO v_booking_status
    FROM bookings
    WHERE id = NEW.booking_id;
    
    IF v_booking_status != 'completed' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Error: Can only review completed bookings';
    END IF;
END//

-- =============================================================================
-- TRIGGER 5: Update payment date on status change to completed
-- Automatically sets payment_date when a payment is marked as completed
-- =============================================================================
CREATE TRIGGER trg_set_payment_date_before_update
BEFORE UPDATE ON payments
FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        SET NEW.payment_date = NOW();
    END IF;
END//

-- =============================================================================
-- TRIGGER 6: Auto-create cancellation policy for new accommodations
-- Creates a default moderate cancellation policy when accommodation is added
-- =============================================================================
CREATE TRIGGER trg_create_default_policy_after_insert
AFTER INSERT ON accommodations
FOR EACH ROW
BEGIN
    INSERT INTO cancellation_policies 
        (accommodation_id, policy_type, days_before_full_refund, partial_refund_percent, no_refund_days_before)
    VALUES 
        (NEW.id, 'moderate', 7, 50.00, 1);
END//

DELIMITER ;

SELECT 'Triggers created successfully!' AS status;

-- =============================================================================
-- CONSTRAINTS AND TRIGGERS COMPLETE
-- =============================================================================
