export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  profile_picture?: string;
  is_host: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Accommodation {
  id: number;
  host_id: number;
  title: string;
  description: string;
  type: 'apartment' | 'house' | 'villa' | 'condo' | 'cabin' | 'guesthouse';
  address: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  price_per_night: number;
  cleaning_fee?: number;
  service_fee?: number;
  minimum_nights: number;
  maximum_nights?: number;
  instant_book: boolean;
  house_rules?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Amenity {
  id: number;
  name: string;
  category: string;
  icon?: string;
}

export interface Booking {
  id: number;
  accommodation_id: number;
  guest_id: number;
  check_in_date: Date;
  check_out_date: Date;
  num_guests: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  special_requests?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Review {
  id: number;
  booking_id: number;
  reviewer_id: number;
  accommodation_id: number;
  rating: number;
  comment?: string;
  cleanliness_rating?: number;
  accuracy_rating?: number;
  checkin_rating?: number;
  communication_rating?: number;
  location_rating?: number;
  value_rating?: number;
  created_at: Date;
}

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  accommodation_id?: number;
  content: string;
  is_read: boolean;
  created_at: Date;
}

export interface Payment {
  id: number;
  booking_id: number;
  amount: number;
  payment_method: 'credit_card' | 'paypal' | 'bank_transfer';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_id?: string;
  paid_at?: Date;
  created_at: Date;
}

export interface AuthRequest extends Request {
  user?: User;
}

export interface SearchFilters {
  location?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  type?: string;
  amenities?: string[];
}
