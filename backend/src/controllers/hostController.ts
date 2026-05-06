import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const updateAvailabilitySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isAvailable: z.boolean(),
  reason: z.string().optional(),
});

const updatePricingRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ruleType: z.enum(['fixed_increase', 'percentage_increase', 'fixed_decrease', 'percentage_decrease']),
  value: z.number().positive(),
});

// Get host's dashboard stats
export const getHostDashboard = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const hostId = req.user!.id;

  // Total properties
  const [propertiesResult] = await pool.execute(
    'SELECT COUNT(*) as total FROM accommodations WHERE host_id = ?',
    [hostId]
  );

  // Total bookings (all time)
  const [bookingsResult] = await pool.execute(
    `SELECT COUNT(*) as total, 
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
     FROM bookings b
     JOIN accommodations a ON b.accommodation_id = a.id
     WHERE a.host_id = ?`,
    [hostId]
  );

  // Total earnings
  const [earningsResult] = await pool.execute(
    `SELECT COALESCE(SUM(b.total_price), 0) as total,
            COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_price ELSE 0 END), 0) as completed_earnings
     FROM bookings b
     JOIN accommodations a ON b.accommodation_id = a.id
     WHERE a.host_id = ?`,
    [hostId]
  );

  // Monthly earnings (last 6 months)
  const [monthlyResult] = await pool.execute(
    `SELECT 
       DATE_FORMAT(b.created_at, '%Y-%m') as month,
       COUNT(*) as bookings,
       COALESCE(SUM(b.total_price), 0) as earnings
     FROM bookings b
     JOIN accommodations a ON b.accommodation_id = a.id
     WHERE a.host_id = ? 
       AND b.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
     GROUP BY DATE_FORMAT(b.created_at, '%Y-%m')
     ORDER BY month DESC`,
    [hostId]
  );

  // Recent bookings
  const [recentBookings] = await pool.execute(
    `SELECT b.*, 
            a.title as accommodation_title,
            u.first_name as guest_first_name,
            u.last_name as guest_last_name
     FROM bookings b
     JOIN accommodations a ON b.accommodation_id = a.id
     JOIN users u ON b.guest_id = u.id
     WHERE a.host_id = ?
     ORDER BY b.created_at DESC
     LIMIT 10`,
    [hostId]
  );

  // Average rating across all properties
  const [ratingResult] = await pool.execute(
    `SELECT AVG(r.rating) as avg_rating, COUNT(*) as total_reviews
     FROM reviews r
     JOIN bookings b ON r.booking_id = b.id
     JOIN accommodations a ON b.accommodation_id = a.id
     WHERE a.host_id = ?`,
    [hostId]
  );

  // Normalize aggregate rows: mysql2 may return COUNT/SUM as strings (DECIMAL
  // category). Coerce to plain numbers at the controller boundary so the wire
  // shape and frontend types stay clean (no `number | string` ambiguity).
  const rawProperties = (propertiesResult as any[])[0];
  const rawBookings = (bookingsResult as any[])[0];
  const rawEarnings = (earningsResult as any[])[0];

  res.json({
    properties: {
      total: Number(rawProperties.total),
    },
    bookings: {
      total: Number(rawBookings.total),
      pending: Number(rawBookings.pending) || 0,
      confirmed: Number(rawBookings.confirmed) || 0,
      completed: Number(rawBookings.completed) || 0,
    },
    earnings: {
      total: Number(rawEarnings.total),
      completed_earnings: Number(rawEarnings.completed_earnings),
    },
    monthlyStats: monthlyResult,
    recentBookings: (recentBookings as any[]).map((b) => ({
      ...b,
      total_price: b.total_price !== null && b.total_price !== undefined ? Number(b.total_price) : b.total_price,
    })),
    rating: ratingResult[0],
  });
});

// Get host's properties with booking stats
export const getHostProperties = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const hostId = req.user!.id;

  // Hosts see ALL their listings (validated or not) — useful to know which
  // listings are still pending platform approval (§ 4e) or missing the
  // mandatory alarm system (§ 4d).
  const [rows] = await pool.execute(
    `SELECT a.*,
            cp.name as cancellation_policy_name,
            (SELECT AVG(r.rating) FROM reviews r
             JOIN bookings b ON r.booking_id = b.id
             WHERE b.accommodation_id = a.id) as avg_rating,
            (SELECT COUNT(*) FROM reviews r
             JOIN bookings b ON r.booking_id = b.id
             WHERE b.accommodation_id = a.id) as review_count,
            (SELECT COUNT(*) FROM bookings b
             WHERE b.accommodation_id = a.id AND b.status IN ('pending', 'confirmed')) as active_bookings,
            CASE
              WHEN NOT a.has_alarm_system THEN 'missing_alarm'
              WHEN NOT a.is_validated     THEN 'pending_validation'
              WHEN NOT a.is_active        THEN 'inactive'
              ELSE 'live'
            END as listing_status
     FROM accommodations a
     LEFT JOIN cancellation_policies cp ON a.cancellation_policy_id = cp.id
     WHERE a.host_id = ?
     ORDER BY a.created_at DESC`,
    [hostId]
  );

  res.json(rows);
});

// Get bookings for a specific property
export const getPropertyBookings = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const hostId = req.user!.id;
  const propertyId = parseInt(req.params.propertyId);

  // Verify property belongs to host
  const [propertyCheck] = await pool.execute(
    'SELECT id FROM accommodations WHERE id = ? AND host_id = ?',
    [propertyId, hostId]
  );

  if ((propertyCheck as any[]).length === 0) {
    res.status(404).json({ error: 'Property not found' });
    return;
  }

  const [rows] = await pool.execute(
    `SELECT b.*, 
            u.first_name as guest_first_name,
            u.last_name as guest_last_name,
            u.email as guest_email,
            u.phone as guest_phone,
            p.status as payment_status,
            p.paid_at
     FROM bookings b
     JOIN users u ON b.guest_id = u.id
     LEFT JOIN payments p ON b.id = p.booking_id
     WHERE b.accommodation_id = ?
     ORDER BY b.check_in_date DESC`,
    [propertyId]
  );

  const bookings = (rows as any[]).map((b) => ({
    ...b,
    total_price: b.total_price !== null && b.total_price !== undefined ? Number(b.total_price) : b.total_price,
  }));

  res.json(bookings);
});

// Update booking status (confirm, complete)
export const updateBookingStatus = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const hostId = req.user!.id;
  const bookingId = parseInt(req.params.id);
  const { status } = req.body;

  if (!['confirmed', 'completed'].includes(status)) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }

  // Verify booking belongs to host's property
  const [bookingCheck] = await pool.execute(
    `SELECT b.* FROM bookings b
     JOIN accommodations a ON b.accommodation_id = a.id
     WHERE b.id = ? AND a.host_id = ?`,
    [bookingId, hostId]
  );

  if ((bookingCheck as any[]).length === 0) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  await pool.execute(
    "UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ?",
    [status, bookingId]
  );

  res.json({ message: `Booking ${status} successfully` });
});

// Set property availability
export const setAvailability = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const hostId = req.user!.id;
  const propertyId = parseInt(req.params.propertyId);
  const data = updateAvailabilitySchema.parse(req.body);

  // Verify property belongs to host
  const [propertyCheck] = await pool.execute(
    'SELECT id FROM accommodations WHERE id = ? AND host_id = ?',
    [propertyId, hostId]
  );

  if ((propertyCheck as any[]).length === 0) {
    res.status(404).json({ error: 'Property not found' });
    return;
  }

  // Check for overlapping bookings if setting as unavailable
  if (!data.isAvailable) {
    const [conflictCheck] = await pool.execute(
      `SELECT id FROM bookings 
       WHERE accommodation_id = ? 
       AND status IN ('pending', 'confirmed')
       AND (
         (check_in_date <= ? AND check_out_date >= ?) OR
         (check_in_date <= ? AND check_out_date >= ?)
       )`,
      [propertyId, data.endDate, data.startDate, data.endDate, data.startDate]
    );

    if ((conflictCheck as any[]).length > 0) {
      res.status(409).json({ error: 'Cannot block dates with existing bookings' });
      return;
    }
  }

  // Delete any existing availability records for this period
  await pool.execute(
    `DELETE FROM availability 
     WHERE accommodation_id = ? 
     AND start_date <= ? AND end_date >= ?`,
    [propertyId, data.endDate, data.startDate]
  );

  // Insert new availability record
  await pool.execute(
    `INSERT INTO availability 
     (accommodation_id, start_date, end_date, is_available, reason, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [propertyId, data.startDate, data.endDate, data.isAvailable, data.reason || null]
  );

  res.json({ message: 'Availability updated successfully' });
});

// Get property availability calendar
export const getAvailabilityCalendar = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const hostId = req.user!.id;
  const propertyId = parseInt(req.params.propertyId);
  const { year, month } = req.query;

  // Verify property belongs to host
  const [propertyCheck] = await pool.execute(
    'SELECT id FROM accommodations WHERE id = ? AND host_id = ?',
    [propertyId, hostId]
  );

  if ((propertyCheck as any[]).length === 0) {
    res.status(404).json({ error: 'Property not found' });
    return;
  }

  let query = `
    SELECT * FROM availability 
    WHERE accommodation_id = ?
  `;
  const params: any[] = [propertyId];

  if (year && month) {
    query += ` AND (
      (YEAR(start_date) = ? AND MONTH(start_date) = ?) OR
      (YEAR(end_date) = ? AND MONTH(end_date) = ?)
    )`;
    params.push(year, month, year, month);
  }

  query += ` ORDER BY start_date`;

  const [rows] = await pool.execute(query, params);

  // Also get bookings for this period
  const [bookingRows] = await pool.execute(
    `SELECT check_in_date, check_out_date, status 
     FROM bookings 
     WHERE accommodation_id = ? 
     AND status IN ('pending', 'confirmed')
     ORDER BY check_in_date`,
    [propertyId]
  );

  res.json({
    availability: rows,
    bookings: bookingRows,
  });
});

// Add pricing rule
export const addPricingRule = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const hostId = req.user!.id;
  const propertyId = parseInt(req.params.propertyId);
  const data = updatePricingRuleSchema.parse(req.body);

  // Verify property belongs to host
  const [propertyCheck] = await pool.execute(
    'SELECT id FROM accommodations WHERE id = ? AND host_id = ?',
    [propertyId, hostId]
  );

  if ((propertyCheck as any[]).length === 0) {
    res.status(404).json({ error: 'Property not found' });
    return;
  }

  const [result] = await pool.execute(
    `INSERT INTO pricing_rules 
     (accommodation_id, name, description, start_date, end_date, rule_type, value, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW())`,
    [propertyId, data.name, data.description || null, data.startDate, data.endDate, data.ruleType, data.value]
  );

  res.status(201).json({
    message: 'Pricing rule added successfully',
    id: (result as any).insertId,
  });
});

// Get pricing rules for property
export const getPricingRules = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const hostId = req.user!.id;
  const propertyId = parseInt(req.params.propertyId);

  // Verify property belongs to host
  const [propertyCheck] = await pool.execute(
    'SELECT id FROM accommodations WHERE id = ? AND host_id = ?',
    [propertyId, hostId]
  );

  if ((propertyCheck as any[]).length === 0) {
    res.status(404).json({ error: 'Property not found' });
    return;
  }

  const [rows] = await pool.execute(
    `SELECT * FROM pricing_rules 
     WHERE accommodation_id = ? 
     ORDER BY start_date DESC`,
    [propertyId]
  );

  res.json(rows);
});

// Delete pricing rule
export const deletePricingRule = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const hostId = req.user!.id;
  const ruleId = parseInt(req.params.ruleId);

  // Verify rule belongs to host's property
  const [ruleCheck] = await pool.execute(
    `SELECT pr.id FROM pricing_rules pr
     JOIN accommodations a ON pr.accommodation_id = a.id
     WHERE pr.id = ? AND a.host_id = ?`,
    [ruleId, hostId]
  );

  if ((ruleCheck as any[]).length === 0) {
    res.status(404).json({ error: 'Pricing rule not found' });
    return;
  }

  await pool.execute('DELETE FROM pricing_rules WHERE id = ?', [ruleId]);

  res.json({ message: 'Pricing rule deleted successfully' });
});
