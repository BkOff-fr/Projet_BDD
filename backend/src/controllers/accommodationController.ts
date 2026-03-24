import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

// Validation schemas
const createAccommodationSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['apartment', 'house', 'villa', 'condo', 'cabin', 'guesthouse']),
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
           (SELECT AVG(r.rating) FROM reviews r 
            JOIN bookings b ON r.booking_id = b.id 
            WHERE b.accommodation_id = a.id) as avg_rating,
           (SELECT COUNT(*) FROM reviews r 
            JOIN bookings b ON r.booking_id = b.id 
            WHERE b.accommodation_id = a.id) as review_count
    FROM accommodations a
    JOIN users u ON a.host_id = u.id
    WHERE a.is_active = true
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
  
  // Get amenities for each accommodation
  const accommodations = await Promise.all((rows as any[]).map(async (acc) => {
    const [amenityRows] = await pool.execute(
      `SELECT am.id, am.name, am.category, am.icon 
       FROM amenities am
       JOIN accommodation_amenities aa ON am.id = aa.amenity_id
       WHERE aa.accommodation_id = ?`,
      [acc.id]
    );
    
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
      pricePerNight: acc.price_per_night,
      cleaningFee: acc.cleaning_fee,
      serviceFee: acc.service_fee,
      minimumNights: acc.minimum_nights,
      maximumNights: acc.maximum_nights,
      instantBook: acc.instant_book,
      houseRules: acc.house_rules,
      rating: {
        average: acc.avg_rating ? parseFloat(acc.avg_rating) : null,
        count: acc.review_count || 0,
      },
      amenities: amenityRows,
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
            (SELECT AVG(r.rating) FROM reviews r 
             JOIN bookings b ON r.booking_id = b.id 
             WHERE b.accommodation_id = a.id) as avg_rating,
            (SELECT COUNT(*) FROM reviews r 
             JOIN bookings b ON r.booking_id = b.id 
             WHERE b.accommodation_id = a.id) as review_count
     FROM accommodations a
     JOIN users u ON a.host_id = u.id
     WHERE a.id = ? AND a.is_active = true`,
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

  // Get reviews
  const [reviewRows] = await pool.execute(
    `SELECT r.*, u.first_name, u.last_name, u.profile_picture
     FROM reviews r
     JOIN bookings b ON r.booking_id = b.id
     JOIN users u ON r.reviewer_id = u.id
     WHERE b.accommodation_id = ?
     ORDER BY r.created_at DESC`,
    [acc.id]
  );

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
    pricePerNight: acc.price_per_night,
    cleaningFee: acc.cleaning_fee,
    serviceFee: acc.service_fee,
    minimumNights: acc.minimum_nights,
    maximumNights: acc.maximum_nights,
    instantBook: acc.instant_book,
    houseRules: acc.house_rules,
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

  const [result] = await pool.execute(
    `INSERT INTO accommodations 
     (host_id, title, description, type, address, city, country, latitude, longitude,
      max_guests, bedrooms, beds, bathrooms, price_per_night, cleaning_fee, service_fee,
      minimum_nights, maximum_nights, instant_book, house_rules, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW())`,
    [
      hostId, data.title, data.description, data.type, data.address, data.city, data.country,
      data.latitude || null, data.longitude || null, data.maxGuests, data.bedrooms, data.beds,
      data.bathrooms, data.pricePerNight, data.cleaningFee || null, data.serviceFee || null,
      data.minimumNights, data.maximumNights || null, data.instantBook, data.houseRules || null,
    ]
  );

  const accommodationId = (result as any).insertId;

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
