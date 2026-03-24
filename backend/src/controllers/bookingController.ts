import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const createBookingSchema = z.object({
  accommodationId: z.number().int().positive(),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  numGuests: z.number().int().min(1),
  specialRequests: z.string().optional(),
});

const createReviewSchema = z.object({
  bookingId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  cleanlinessRating: z.number().int().min(1).max(5).optional(),
  accuracyRating: z.number().int().min(1).max(5).optional(),
  checkinRating: z.number().int().min(1).max(5).optional(),
  communicationRating: z.number().int().min(1).max(5).optional(),
  locationRating: z.number().int().min(1).max(5).optional(),
  valueRating: z.number().int().min(1).max(5).optional(),
});

// Get user's bookings
export const getMyBookings = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { status } = req.query;

  let query = `
    SELECT b.*, 
           a.title as accommodation_title,
           a.type as accommodation_type,
           a.address as accommodation_address,
           a.city as accommodation_city,
           a.country as accommodation_country,
           a.price_per_night,
           u.first_name as host_first_name,
           u.last_name as host_last_name,
           (SELECT id FROM reviews WHERE booking_id = b.id LIMIT 1) as review_id
    FROM bookings b
    JOIN accommodations a ON b.accommodation_id = a.id
    JOIN users u ON a.host_id = u.id
    WHERE b.guest_id = ?
  `;

  const params: any[] = [userId];

  if (status) {
    query += ` AND b.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY b.created_at DESC`;

  const [rows] = await pool.execute(query, params);

  const bookings = (rows as any[]).map(b => ({
    id: b.id,
    accommodation: {
      id: b.accommodation_id,
      title: b.accommodation_title,
      type: b.accommodation_type,
      location: {
        address: b.accommodation_address,
        city: b.accommodation_city,
        country: b.accommodation_country,
      },
      host: {
        firstName: b.host_first_name,
        lastName: b.host_last_name,
      },
    },
    checkInDate: b.check_in_date,
    checkOutDate: b.check_out_date,
    numGuests: b.num_guests,
    totalPrice: b.total_price,
    status: b.status,
    specialRequests: b.special_requests,
    hasReview: !!b.review_id,
    createdAt: b.created_at,
  }));

  res.json(bookings);
});

// Create new booking
export const createBooking = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const data = createBookingSchema.parse(req.body);
  const guestId = req.user!.id;

  // Check if accommodation exists and get details
  const [accRows] = await pool.execute(
    'SELECT * FROM accommodations WHERE id = ? AND is_active = true',
    [data.accommodationId]
  );

  const accommodations = accRows as any[];
  if (accommodations.length === 0) {
    res.status(404).json({ error: 'Accommodation not found' });
    return;
  }

  const accommodation = accommodations[0];

  // Check if user is not booking their own property
  if (accommodation.host_id === guestId) {
    res.status(400).json({ error: 'Cannot book your own accommodation' });
    return;
  }

  // Check max guests
  if (data.numGuests > accommodation.max_guests) {
    res.status(400).json({ error: `Maximum ${accommodation.max_guests} guests allowed` });
    return;
  }

  // Calculate number of nights
  const checkIn = new Date(data.checkInDate);
  const checkOut = new Date(data.checkOutDate);
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  if (nights < 1) {
    res.status(400).json({ error: 'Check-out must be after check-in' });
    return;
  }

  if (nights < accommodation.minimum_nights) {
    res.status(400).json({ error: `Minimum ${accommodation.minimum_nights} nights required` });
    return;
  }

  if (accommodation.maximum_nights && nights > accommodation.maximum_nights) {
    res.status(400).json({ error: `Maximum ${accommodation.maximum_nights} nights allowed` });
    return;
  }

  // Calculate total price
  let totalPrice = nights * accommodation.price_per_night;

  // Apply pricing rules (simplified - just checking if any active rules exist)
  const [pricingRows] = await pool.execute(
    `SELECT * FROM pricing_rules 
     WHERE accommodation_id = ? 
     AND is_active = true
     AND start_date <= ? 
     AND end_date >= ?`,
    [data.accommodationId, data.checkOutDate, data.checkInDate]
  );

  const pricingRules = pricingRows as any[];
  
  for (const rule of pricingRules) {
    if (rule.rule_type === 'fixed_increase') {
      totalPrice += parseFloat(rule.value);
    } else if (rule.rule_type === 'percentage_increase') {
      totalPrice *= (1 + parseFloat(rule.value) / 100);
    }
  }

  // Add fees
  if (accommodation.cleaning_fee) {
    totalPrice += parseFloat(accommodation.cleaning_fee);
  }
  if (accommodation.service_fee) {
    totalPrice += parseFloat(accommodation.service_fee);
  }

  // Check for overlapping bookings
  const [overlapRows] = await pool.execute(
    `SELECT id FROM bookings 
     WHERE accommodation_id = ? 
     AND status IN ('pending', 'confirmed')
     AND (
       (check_in_date <= ? AND check_out_date >= ?) OR
       (check_in_date <= ? AND check_out_date >= ?) OR
       (check_in_date >= ? AND check_out_date <= ?)
     )`,
    [
      data.accommodationId,
      data.checkOutDate, data.checkInDate,
      data.checkOutDate, data.checkInDate,
      data.checkInDate, data.checkOutDate,
    ]
  );

  if ((overlapRows as any[]).length > 0) {
    res.status(409).json({ error: 'Accommodation is not available for these dates' });
    return;
  }

  // Create booking
  const [result] = await pool.execute(
    `INSERT INTO bookings 
     (accommodation_id, guest_id, check_in_date, check_out_date, num_guests, 
      total_price, status, special_requests, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW())`,
    [
      data.accommodationId,
      guestId,
      data.checkInDate,
      data.checkOutDate,
      data.numGuests,
      totalPrice.toFixed(2),
      data.specialRequests || null,
    ]
  );

  const bookingId = (result as any).insertId;

  res.status(201).json({
    message: 'Booking created successfully',
    id: bookingId,
    totalPrice: totalPrice.toFixed(2),
  });
});

// Cancel booking
export const cancelBooking = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.id;

  // Check if booking exists and belongs to user
  const [rows] = await pool.execute(
    'SELECT * FROM bookings WHERE id = ? AND guest_id = ?',
    [id, userId]
  );

  const bookings = rows as any[];
  if (bookings.length === 0) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  const booking = bookings[0];

  if (booking.status === 'cancelled') {
    res.status(400).json({ error: 'Booking is already cancelled' });
    return;
  }

  if (booking.status === 'completed') {
    res.status(400).json({ error: 'Cannot cancel a completed booking' });
    return;
  }

  await pool.execute(
    "UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = ?",
    [id]
  );

  res.json({ message: 'Booking cancelled successfully' });
});

// Create review for a booking
export const createReview = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const data = createReviewSchema.parse(req.body);
  const reviewerId = req.user!.id;

  // Check if booking exists, belongs to user, is completed, and not already reviewed
  const [rows] = await pool.execute(
    `SELECT b.*, a.id as accommodation_id
     FROM bookings b
     JOIN accommodations a ON b.accommodation_id = a.id
     WHERE b.id = ? AND b.guest_id = ? AND b.status = 'completed'`,
    [data.bookingId, reviewerId]
  );

  const bookings = rows as any[];
  if (bookings.length === 0) {
    res.status(400).json({ error: 'Booking not found or not eligible for review' });
    return;
  }

  const booking = bookings[0];

  // Check if already reviewed
  const [reviewRows] = await pool.execute(
    'SELECT id FROM reviews WHERE booking_id = ?',
    [data.bookingId]
  );

  if ((reviewRows as any[]).length > 0) {
    res.status(409).json({ error: 'Booking has already been reviewed' });
    return;
  }

  await pool.execute(
    `INSERT INTO reviews 
     (booking_id, reviewer_id, accommodation_id, rating, comment,
      cleanliness_rating, accuracy_rating, checkin_rating, 
      communication_rating, location_rating, value_rating, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      data.bookingId,
      reviewerId,
      booking.accommodation_id,
      data.rating,
      data.comment || null,
      data.cleanlinessRating || null,
      data.accuracyRating || null,
      data.checkinRating || null,
      data.communicationRating || null,
      data.locationRating || null,
      data.valueRating || null,
    ]
  );

  res.status(201).json({ message: 'Review created successfully' });
});
