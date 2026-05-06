import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

// Validation schemas
const createAccommodationSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['apartment', 'house', 'villa', 'condo', 'cabin', 'guesthouse', 'studio', 'private_room']),
  address: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  maxGuests: z.number().int().min(1),
  bedrooms: z.number().int().min(0),
  beds: z.number().int().min(1),
  bathrooms: z.number().min(0),
  pricePerNight: z.number().positive(),
  cleaningFee: z.number().min(0).optional(),
  serviceFee: z.number().min(0).optional(),
  minimumNights: z.number().int().min(1),
  maximumNights: z.number().int().optional(),
  instantBook: z.boolean().default(false),
  houseRules: z.string().optional(),
  amenityIds: z.array(z.number()).optional(),
  cancellationPolicyId: z.number().int().positive(),
  hasAlarmSystem: z.boolean().default(false),
  hasSmokeDetector: z.boolean().default(false),
});

// Get all accommodations with filters
export const getAccommodations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { 
    location, 
    checkIn, 
    checkOut, 
    guests, 
    minPrice, 
    maxPrice, 
    type 
  } = req.query;

  let query = `
    SELECT a.*,
           u.first_name as host_first_name,
           u.last_name as host_last_name,
           u.profile_picture as host_picture,
           cp.name as cancellation_policy_name,
           cp.description as cancellation_policy_description,
           cp.full_refund_days_before,
           cp.partial_refund_days_before,
           cp.partial_refund_percentage,
           (SELECT AVG(r.rating) FROM reviews r
            JOIN bookings b ON r.booking_id = b.id
            WHERE b.accommodation_id = a.id) as avg_rating,
           (SELECT COUNT(*) FROM reviews r
            JOIN bookings b ON r.booking_id = b.id
            WHERE b.accommodation_id = a.id) as review_count
    FROM accommodations a
    JOIN users u ON a.host_id = u.id
    JOIN cancellation_policies cp ON a.cancellation_policy_id = cp.id
    WHERE a.is_active = true
      AND a.is_validated = true
      AND a.has_alarm_system = true
  `;
  
  const params: any[] = [];

  if (location) {
    query += ` AND (a.city LIKE ? OR a.country LIKE ?)`;
    params.push(`%${location}%`, `%${location}%`);
  }

  if (guests) {
    query += ` AND a.max_guests >= ?`;
    params.push(parseInt(guests as string));
  }

  if (minPrice) {
    query += ` AND a.price_per_night >= ?`;
    params.push(parseFloat(minPrice as string));
  }

  if (maxPrice) {
    query += ` AND a.price_per_night <= ?`;
    params.push(parseFloat(maxPrice as string));
  }

  if (type) {
    query += ` AND a.type = ?`;
    params.push(type);
  }

  // Check availability if dates provided
  if (checkIn && checkOut) {
    query += ` AND a.id NOT IN (
      SELECT DISTINCT accommodation_id FROM bookings
      WHERE status IN ('pending', 'confirmed')
      AND (
        (check_in_date <= ? AND check_out_date >= ?) OR
        (check_in_date <= ? AND check_out_date >= ?) OR
        (check_in_date >= ? AND check_out_date <= ?)
      )
    )`;
    params.push(checkOut, checkIn, checkOut, checkIn, checkIn, checkOut);
  }

  query += ` ORDER BY a.created_at DESC`;

  const [rows] = await pool.execute(query, params);
  
  // Get amenities and fees for each accommodation
  const accommodations = await Promise.all((rows as any[]).map(async (acc) => {
    const [amenityRows] = await pool.execute(
      `SELECT am.id, am.name, am.category, am.icon
       FROM amenities am
       JOIN accommodation_amenities aa ON am.id = aa.amenity_id
       WHERE aa.accommodation_id = ?`,
      [acc.id]
    );

    const [feeRows] = await pool.execute(
      `SELECT fee_type, amount, is_percentage FROM accommodation_fees WHERE accommodation_id = ?`,
      [acc.id]
    );
    const fees = feeRows as any[];
    const cleaning = fees.find(f => f.fee_type === 'cleaning');
    const service  = fees.find(f => f.fee_type === 'service');

    return {
      id: acc.id,
      title: acc.title,
      description: acc.description,
      type: acc.type,
      location: {
        address: acc.address,
        city: acc.city,
        country: acc.country,
        latitude: acc.latitude,
        longitude: acc.longitude,
      },
      host: {
        id: acc.host_id,
        firstName: acc.host_first_name,
        lastName: acc.host_last_name,
        profilePicture: acc.host_picture,
      },
      maxGuests: acc.max_guests,
      bedrooms: acc.bedrooms,
      beds: acc.beds,
      bathrooms: acc.bathrooms,
      pricePerNight: parseFloat(acc.price_per_night),
      cleaningFee: cleaning ? { amount: parseFloat(cleaning.amount), isPercentage: !!cleaning.is_percentage } : null,
      serviceFee:  service  ? { amount: parseFloat(service.amount),  isPercentage: !!service.is_percentage  } : null,
      minimumNights: acc.minimum_nights,
      maximumNights: acc.maximum_nights,
      instantBook: acc.instant_book,
      houseRules: acc.house_rules,
      isValidated: !!acc.is_validated,
      hasAlarmSystem: !!acc.has_alarm_system,
      hasSmokeDetector: !!acc.has_smoke_detector,
      cancellationPolicy: {
        id: acc.cancellation_policy_id,
        name: acc.cancellation_policy_name,
        description: acc.cancellation_policy_description,
        fullRefundDaysBefore: acc.full_refund_days_before,
        partialRefundDaysBefore: acc.partial_refund_days_before,
        partialRefundPercentage: parseFloat(acc.partial_refund_percentage),
      },
      rating: {
        average: acc.avg_rating ? parseFloat(acc.avg_rating) : null,
        count: acc.review_count || 0,
      },
      amenities: amenityRows,
      fees,
      createdAt: acc.created_at,
    };
  }));

  res.json(accommodations);
});

// Get single accommodation by ID
export const getAccommodationById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const [rows] = await pool.execute(
    `SELECT a.*,
            u.first_name as host_first_name,
            u.last_name as host_last_name,
            u.profile_picture as host_picture,
            cp.name as cancellation_policy_name,
            cp.description as cancellation_policy_description,
            cp.full_refund_days_before,
            cp.partial_refund_days_before,
            cp.partial_refund_percentage,
            (SELECT AVG(r.rating) FROM reviews r
             JOIN bookings b ON r.booking_id = b.id
             WHERE b.accommodation_id = a.id) as avg_rating,
            (SELECT COUNT(*) FROM reviews r
             JOIN bookings b ON r.booking_id = b.id
             WHERE b.accommodation_id = a.id) as review_count
     FROM accommodations a
     JOIN users u ON a.host_id = u.id
     JOIN cancellation_policies cp ON a.cancellation_policy_id = cp.id
     WHERE a.id = ?
       AND a.is_active = true
       AND a.is_validated = true
       AND a.has_alarm_system = true`,
    [id]
  );

  const accommodations = rows as any[];
  
  if (accommodations.length === 0) {
    res.status(404).json({ error: 'Accommodation not found' });
    return;
  }

  const acc = accommodations[0];

  // Get amenities
  const [amenityRows] = await pool.execute(
    `SELECT am.id, am.name, am.category, am.icon 
     FROM amenities am
     JOIN accommodation_amenities aa ON am.id = aa.amenity_id
     WHERE aa.accommodation_id = ?`,
    [acc.id]
  );

  // Get reviews — reviewer derived via booking.guest_id
  const [reviewRows] = await pool.execute(
    `SELECT r.*, u.first_name, u.last_name, u.profile_picture
     FROM reviews r
     JOIN bookings b ON r.booking_id = b.id
     JOIN users u ON b.guest_id = u.id
     WHERE b.accommodation_id = ?
     ORDER BY r.created_at DESC`,
    [acc.id]
  );

  // Get fees
  const [feeRows] = await pool.execute(
    `SELECT fee_type, amount, is_percentage FROM accommodation_fees WHERE accommodation_id = ?`,
    [acc.id]
  );
  const fees = feeRows as any[];
  const cleaning = fees.find(f => f.fee_type === 'cleaning');
  const service  = fees.find(f => f.fee_type === 'service');

  res.json({
    id: acc.id,
    title: acc.title,
    description: acc.description,
    type: acc.type,
    location: {
      address: acc.address,
      city: acc.city,
      country: acc.country,
      latitude: acc.latitude,
      longitude: acc.longitude,
    },
    host: {
      id: acc.host_id,
      firstName: acc.host_first_name,
      lastName: acc.host_last_name,
      profilePicture: acc.host_picture,
    },
    maxGuests: acc.max_guests,
    bedrooms: acc.bedrooms,
    beds: acc.beds,
    bathrooms: acc.bathrooms,
    pricePerNight: parseFloat(acc.price_per_night),
    cleaningFee: cleaning ? { amount: parseFloat(cleaning.amount), isPercentage: !!cleaning.is_percentage } : null,
    serviceFee:  service  ? { amount: parseFloat(service.amount),  isPercentage: !!service.is_percentage  } : null,
    minimumNights: acc.minimum_nights,
    maximumNights: acc.maximum_nights,
    instantBook: acc.instant_book,
    houseRules: acc.house_rules,
    isValidated: !!acc.is_validated,
    hasAlarmSystem: !!acc.has_alarm_system,
    hasSmokeDetector: !!acc.has_smoke_detector,
    cancellationPolicy: {
      id: acc.cancellation_policy_id,
      name: acc.cancellation_policy_name,
      description: acc.cancellation_policy_description,
      fullRefundDaysBefore: acc.full_refund_days_before,
      partialRefundDaysBefore: acc.partial_refund_days_before,
      partialRefundPercentage: parseFloat(acc.partial_refund_percentage),
    },
    rating: {
      average: acc.avg_rating ? parseFloat(acc.avg_rating) : null,
      count: acc.review_count || 0,
    },
    amenities: amenityRows,
    reviews: (reviewRows as any[]).map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      categories: {
        cleanliness: r.cleanliness_rating,
        accuracy: r.accuracy_rating,
        checkIn: r.checkin_rating,
        communication: r.communication_rating,
        location: r.location_rating,
        value: r.value_rating,
      },
      user: {
        firstName: r.first_name,
        lastName: r.last_name,
        profilePicture: r.profile_picture,
      },
      createdAt: r.created_at,
    })),
    createdAt: acc.created_at,
  });
});

// Create new accommodation
export const createAccommodation = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const data = createAccommodationSchema.parse(req.body);
  const hostId = req.user!.id;

  // New listings start unvalidated. Platform staff must approve them
  // explicitly (UPDATE ... SET is_validated = TRUE), and the schema CHECK
  // forbids that without an alarm system.
  const [result] = await pool.execute(
    `INSERT INTO accommodations
     (host_id, cancellation_policy_id, title, description, type, address, city, country,
      latitude, longitude, max_guests, bedrooms, beds, bathrooms, price_per_night,
      minimum_nights, maximum_nights, instant_book, house_rules,
      is_active, is_validated, has_alarm_system, has_smoke_detector, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, false, ?, ?, NOW(), NOW())`,
    [
      hostId, data.cancellationPolicyId, data.title, data.description, data.type,
      data.address, data.city, data.country,
      data.latitude || null, data.longitude || null, data.maxGuests, data.bedrooms, data.beds,
      data.bathrooms, data.pricePerNight,
      data.minimumNights, data.maximumNights || null, data.instantBook, data.houseRules || null,
      data.hasAlarmSystem, data.hasSmokeDetector,
    ]
  );

  const accommodationId = (result as any).insertId;

  // Insert fees in dedicated table
  if (data.cleaningFee != null) {
    await pool.execute(
      `INSERT INTO accommodation_fees (accommodation_id, fee_type, amount, is_percentage) VALUES (?, 'cleaning', ?, FALSE)`,
      [accommodationId, data.cleaningFee]
    );
  }
  if (data.serviceFee != null) {
    await pool.execute(
      `INSERT INTO accommodation_fees (accommodation_id, fee_type, amount, is_percentage) VALUES (?, 'service', ?, TRUE)`,
      [accommodationId, data.serviceFee]
    );
  }

  // Add amenities if provided
  if (data.amenityIds && data.amenityIds.length > 0) {
    const values = data.amenityIds.map(id => `(${accommodationId}, ${id})`).join(',');
    await pool.execute(
      `INSERT INTO accommodation_amenities (accommodation_id, amenity_id) VALUES ${values}`
    );
  }

  res.status(201).json({
    message: 'Accommodation created successfully',
    id: accommodationId,
  });
});

// Get all amenities
export const getAmenities = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const [rows] = await pool.execute('SELECT * FROM amenities ORDER BY category, name');
  res.json(rows);
});

// Get all cancellation policies (for the host listing form).
// Transformed to camelCase so the wire shape matches Accommodation.cancellationPolicy.
export const getCancellationPolicies = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const [rows] = await pool.execute(
    `SELECT id, name, description, full_refund_days_before,
            partial_refund_days_before, partial_refund_percentage
     FROM cancellation_policies
     ORDER BY full_refund_days_before DESC`
  );
  const policies = (rows as any[]).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    fullRefundDaysBefore: p.full_refund_days_before,
    partialRefundDaysBefore: p.partial_refund_days_before,
    partialRefundPercentage: parseFloat(p.partial_refund_percentage),
  }));
  res.json(policies);
});
