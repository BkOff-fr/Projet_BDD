/**
 * Frontend type definitions for the StayScape platform.
 *
 * These types describe the JSON the backend serializes via `res.json(...)`
 * (see `backend/src/controllers/*.ts`). They use camelCase to match what the
 * controllers send over the wire (the DB rows are snake_case but the
 * controllers transform them before responding).
 *
 * Date fields are ISO 8601 strings (not `Date` objects) because that is what
 * arrives over the network. Convert with `new Date(s)` / `parseISO(s)` at the
 * UI layer when needed.
 *
 * Form input shapes are suffixed with `Input` and may include richer fields
 * than what the API returns (they describe payloads being sent, not received).
 *
 * Known gaps tracked for later tasks:
 * - The schema has no `images` table yet. `Accommodation.coverImage` is
 *   reserved for future use; for now it is always undefined and the UI falls
 *   back to a placeholder image (see `PLACEHOLDER_IMAGE` in
 *   `src/utils/helpers.ts`). To be addressed in a future task.
 * - There is no concept of a "Superhost" in the BDD; any UI that referenced
 *   it has been stripped.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/**
 * Accommodation `type` enum mirrors the backend Zod schema in
 * `accommodationController.ts` (`createAccommodationSchema.type`). Single
 * dimension — no separate "propertyType" / "accommodationType" split.
 */
export type AccommodationType =
  | 'apartment'
  | 'house'
  | 'villa'
  | 'condo'
  | 'cabin'
  | 'guesthouse'
  | 'studio'
  | 'private_room';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export type AmenityCategory =
  | 'basic'
  | 'safety'
  | 'dining'
  | 'entertainment'
  | 'outdoor'
  | 'workspace';

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/**
 * Shape returned by `/auth/login`, `/auth/register`, `/auth/me`.
 * Matches `authController.ts` response payload.
 */
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  profilePicture?: string | null;
  isHost: boolean;
}

/**
 * Shape returned by `GET /users/profile` (userController.ts `getProfile`).
 * Includes joined-in stats from the controller.
 */
export interface UserProfile extends User {
  joinedAt: string;
  stats: {
    propertyCount: number;
    tripCount: number;
  };
}

/** Slim user shape embedded in accommodation/conversation responses. */
export interface UserSummary {
  id: number;
  firstName: string;
  lastName: string;
  profilePicture?: string | null;
}

// ---------------------------------------------------------------------------
// Amenities & Fees
// ---------------------------------------------------------------------------

export interface Amenity {
  id: number;
  name: string;
  category: AmenityCategory | string;
  icon?: string | null;
}

export interface AccommodationFee {
  fee_type: 'cleaning' | 'service' | string;
  amount: number | string;
  is_percentage: boolean | number;
}

// ---------------------------------------------------------------------------
// Accommodations
// ---------------------------------------------------------------------------

export interface AccommodationLocation {
  address: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

export interface CancellationPolicySummary {
  id: number;
  name: string;
}

export interface CancellationPolicyDetail extends CancellationPolicySummary {
  description?: string | null;
  fullRefundDaysBefore: number;
  partialRefundDaysBefore: number;
  partialRefundPercentage: number;
}

/**
 * Shape returned by `GET /accommodations` (list endpoint).
 * Mirrors the response in `accommodationController.ts#getAccommodations`.
 *
 * Note: `coverImage` is NOT returned by the API — the BDD has no images
 * table yet. It is reserved here so UI code can read it (always undefined
 * for now) and fall back to a placeholder. Future work will populate it.
 */
export interface Accommodation {
  id: number;
  title: string;
  description: string;
  type: AccommodationType;
  location: AccommodationLocation;
  host: UserSummary;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  pricePerNight: number;
  cleaningFee: { amount: number; isPercentage: boolean } | null;
  serviceFee: { amount: number; isPercentage: boolean } | null;
  minimumNights: number;
  maximumNights: number | null;
  instantBook: boolean;
  houseRules?: string | null;
  isValidated: boolean;
  hasAlarmSystem: boolean;
  hasSmokeDetector: boolean;
  cancellationPolicy: CancellationPolicySummary;
  rating: {
    average: number | null;
    count: number;
  };
  amenities: Amenity[];
  fees?: AccommodationFee[];
  createdAt: string;
  /** Not yet populated by the API. See file header note. */
  coverImage?: string;
}

/**
 * Shape returned by `GET /accommodations/:id` (detail endpoint).
 * Adds `reviews` and a richer `cancellationPolicy`.
 */
export interface AccommodationDetail extends Omit<Accommodation, 'cancellationPolicy'> {
  cancellationPolicy: CancellationPolicyDetail;
  reviews: Review[];
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

/**
 * Shape returned in the `reviews` array of `GET /accommodations/:id`.
 * Mirrors `accommodationController.ts` review mapping.
 */
export interface Review {
  id: number;
  rating: number;
  comment: string | null;
  categories: {
    cleanliness: number | null;
    accuracy: number | null;
    checkIn: number | null;
    communication: number | null;
    location: number | null;
    value: number | null;
  };
  user: {
    firstName: string;
    lastName: string;
    profilePicture?: string | null;
  };
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

/**
 * Shape returned by `GET /bookings` list endpoint
 * (`bookingController.ts#getMyBookings`). The accommodation field is a
 * narrowed projection — NOT a full `Accommodation`.
 */
export interface Booking {
  id: number;
  accommodation: {
    id: number;
    title: string;
    type: AccommodationType;
    location: {
      address: string;
      city: string;
      country: string;
    };
    host: {
      firstName: string;
      lastName: string;
    };
  };
  checkInDate: string;
  checkOutDate: string;
  numGuests: number;
  totalPrice: number;
  status: BookingStatus;
  specialRequests: string | null;
  hasReview: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Messages & Conversations
// ---------------------------------------------------------------------------

/**
 * Shape returned by `GET /messages/:userId`
 * (`messageController.ts#getConversation`) inside the `messages` array.
 */
export interface Message {
  id: number;
  content: string;
  isFromMe: boolean;
  sender: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  isRead: boolean;
}

/**
 * Shape returned by `GET /messages` list endpoint
 * (`messageController.ts#getConversations`).
 */
export interface Conversation {
  id: number;
  otherUser: {
    id: number;
    firstName: string;
    lastName: string;
    profilePicture?: string | null;
  };
  accommodation: {
    id: number;
    title: string;
  } | null;
  lastMessage: {
    content: string;
    isFromMe: boolean;
    createdAt: string;
    isRead: boolean;
  };
}

// ---------------------------------------------------------------------------
// Search filters (frontend-only state — not an API contract)
// ---------------------------------------------------------------------------

export interface SearchFilters {
  location?: string;
  checkIn?: Date;
  checkOut?: Date;
  guests?: {
    adults: number;
    children: number;
    infants: number;
    pets: number;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  propertyTypes?: AccommodationType[];
  amenities?: string[];
  instantBook?: boolean;
}

// ---------------------------------------------------------------------------
// Form input types (payloads sent TO the API)
// ---------------------------------------------------------------------------

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isHost?: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CreateAccommodationInput {
  title: string;
  description: string;
  type: AccommodationType;
  address: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  pricePerNight: number;
  cleaningFee?: number;
  serviceFee?: number;
  minimumNights: number;
  maximumNights?: number;
  instantBook?: boolean;
  houseRules?: string;
  amenityIds?: number[];
  cancellationPolicyId: number;
  hasAlarmSystem?: boolean;
  hasSmokeDetector?: boolean;
}

export interface CreateBookingInput {
  accommodationId: number;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  numGuests: number;
  specialRequests?: string;
}

export interface CreateReviewInput {
  bookingId: number;
  rating: number;
  comment?: string;
  cleanlinessRating?: number;
  accuracyRating?: number;
  checkinRating?: number;
  communicationRating?: number;
  locationRating?: number;
  valueRating?: number;
}

export interface SendMessageInput {
  receiverId: number;
  accommodationId?: number;
  content: string;
}

// ---------------------------------------------------------------------------
// User self-service inputs (PATCH /users/me, POST /users/me/*, DELETE /users/me)
// ---------------------------------------------------------------------------

/**
 * Payload for `PATCH /users/me` (`userController.ts#updateProfile`).
 *
 * Intentionally narrower than `updateProfileSchema` in the backend. The Zod
 * schema also accepts `bio`, `location`, and `languages`, but the controller
 * does not persist them (the BDD has no columns for these fields), so they
 * are excluded here to prevent silent no-op writes from the client. All
 * fields are optional — the server 400s if none are provided.
 */
export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  profilePicture?: string;
}

/** Payload for `POST /users/me/password`. */
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/** Payload for `POST /users/me/become-host`. The literal `true` is required. */
export interface BecomeHostInput {
  agreeToTerms: true;
}

/** Payload for `DELETE /users/me`. */
export interface DeleteAccountInput {
  password: string;
}

/** Payload for `POST /users/me/picture`. */
export interface UploadPictureInput {
  imageUrl: string;
}

// ---------------------------------------------------------------------------
// Host inputs (POST/PATCH on /host/*)
// ---------------------------------------------------------------------------

/** Payload for `PATCH /host/bookings/:id/status`. */
export interface UpdateBookingStatusInput {
  status: 'confirmed' | 'completed';
}

/** Payload for `POST /host/properties/:propertyId/availability`. */
export interface SetAvailabilityInput {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isAvailable: boolean;
  reason?: string;
}

export type PricingRuleType =
  | 'fixed_increase'
  | 'percentage_increase'
  | 'fixed_decrease'
  | 'percentage_decrease';

/** Payload for `POST /host/properties/:propertyId/pricing-rules`. */
export interface CreatePricingRuleInput {
  name: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  ruleType: PricingRuleType;
  value: number;
}

// ---------------------------------------------------------------------------
// Host responses (raw DB rows; backend does not transform these)
// ---------------------------------------------------------------------------

/**
 * Shape returned in `GET /host/properties` rows. The controller spreads
 * `accommodations.*` then JOINs in stats columns. Because no field-by-field
 * transform happens, the shape is snake_case raw DB rows — not the curated
 * `Accommodation` shape used elsewhere. Type the extra columns explicitly;
 * the rest of the row is intentionally loose (`[key: string]: unknown`) until
 * the backend either transforms or T2-style types are derived.
 */
export interface HostProperty {
  id: number;
  host_id: number;
  title: string;
  description: string;
  type: AccommodationType;
  address: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  price_per_night: number | string;
  cleaning_fee: number | string | null;
  service_fee: number | string | null;
  minimum_nights: number;
  maximum_nights: number | null;
  instant_book: number | boolean;
  house_rules: string | null;
  is_validated: number | boolean;
  is_active: number | boolean;
  has_alarm_system: number | boolean;
  has_smoke_detector: number | boolean;
  cancellation_policy_id: number | null;
  cancellation_policy_name: string | null;
  created_at: string;
  updated_at: string;
  // JOIN-in columns from getHostProperties query
  avg_rating: string | null;
  review_count: number;
  active_bookings: number;
  listing_status: 'missing_alarm' | 'pending_validation' | 'inactive' | 'live';
}

/** Raw availability row returned by `GET /host/properties/:propertyId/availability`. */
export interface Availability {
  id: number;
  accommodation_id: number;
  start_date: string;
  end_date: string;
  is_available: number | boolean;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

/** Raw pricing-rules row returned by `GET /host/properties/:propertyId/pricing-rules`. */
export interface PricingRule {
  id: number;
  accommodation_id: number;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  rule_type: PricingRuleType;
  value: number | string;
  is_active: number | boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Response for `GET /host/properties/:propertyId/availability`. Returns raw
 * availability rows + a slim list of overlapping bookings for context.
 */
export interface AvailabilityCalendar {
  availability: Availability[];
  bookings: Array<{
    check_in_date: string;
    check_out_date: string;
    status: BookingStatus;
  }>;
}

/**
 * Shape returned by `GET /host/dashboard` (`hostController.ts#getHostDashboard`).
 * The controller normalizes COUNT/SUM aggregates to plain numbers before
 * responding (see `getHostDashboard`), so `bookings` and `earnings` are
 * guaranteed numeric. Other nested objects (e.g. `monthlyStats`, `rating`)
 * still come straight from MySQL aggregate rows where SUM/AVG columns may
 * arrive as strings (mysql2 default for DECIMAL).
 */
export interface HostDashboardData {
  properties: {
    total: number;
  };
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
  };
  earnings: {
    total: number;
    completed_earnings: number;
  };
  monthlyStats: Array<{
    month: string; // YYYY-MM
    bookings: number;
    earnings: number | string;
  }>;
  recentBookings: Array<{
    id: number;
    accommodation_id: number;
    guest_id: number;
    check_in_date: string;
    check_out_date: string;
    num_guests: number;
    total_price: number | null;
    status: BookingStatus;
    special_requests: string | null;
    created_at: string;
    updated_at: string;
    accommodation_title: string;
    guest_first_name: string;
    guest_last_name: string;
  }>;
  rating: {
    avg_rating: string | null;
    total_reviews: number;
  };
}

/**
 * Shape returned by `GET /host/properties/:propertyId/bookings`. Raw booking
 * rows + JOINed guest/payment columns. Snake_case to match wire reality.
 */
export interface HostPropertyBooking {
  id: number;
  accommodation_id: number;
  guest_id: number;
  check_in_date: string;
  check_out_date: string;
  num_guests: number;
  total_price: number | null;
  status: BookingStatus;
  special_requests: string | null;
  created_at: string;
  updated_at: string;
  guest_first_name: string;
  guest_last_name: string;
  guest_email: string;
  guest_phone: string | null;
  payment_status: string | null;
  paid_at: string | null;
}

/**
 * Row shape returned by `GET /users/me/reviews` — raw `reviews` row plus
 * a few JOINed accommodation/host columns. Backend doesn't transform.
 */
export interface MyReviewRow {
  id: number;
  booking_id: number;
  rating: number;
  comment: string | null;
  cleanliness_rating: number | null;
  accuracy_rating: number | null;
  checkin_rating: number | null;
  communication_rating: number | null;
  location_rating: number | null;
  value_rating: number | null;
  created_at: string;
  updated_at: string;
  accommodation_title: string;
  accommodation_city: string;
  host_first_name: string;
}
