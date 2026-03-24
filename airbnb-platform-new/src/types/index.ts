export type AccommodationType = 'entire_place' | 'private_room' | 'shared_room';

export type PropertyType = 'studio' | 'apartment' | 'house' | 'villa' | 'cabin' | 'condo' | 'loft';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string;
  phone?: string;
  isHost: boolean;
  createdAt: Date;
  location?: string;
  about?: string;
  languages?: string[];
  work?: string;
}

export interface Amenity {
  id: string;
  name: string;
  icon: string;
  category: 'basic' | 'safety' | 'dining' | 'entertainment' | 'outdoor' | 'workspace';
}

export interface Review {
  id: string;
  accommodationId: string;
  userId: string;
  user: User;
  rating: number;
  comment: string;
  createdAt: Date;
  categories: {
    cleanliness: number;
    accuracy: number;
    checkIn: number;
    communication: number;
    location: number;
    value: number;
  };
}

export interface Availability {
  id: string;
  accommodationId: string;
  startDate: Date;
  endDate: Date;
  isAvailable: boolean;
  priceOverride?: number;
}

export interface Accommodation {
  id: string;
  title: string;
  description: string;
  type: AccommodationType;
  propertyType: PropertyType;
  location: {
    address: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  hostId: string;
  host: User;
  pricePerNight: number;
  cleaningFee: number;
  serviceFee: number;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  amenities: string[];
  images: string[];
  rating: number;
  reviewCount: number;
  reviews: Review[];
  availability: Availability[];
  instantBook: boolean;
  createdAt: Date;
  isSuperhost: boolean;
}

export interface Booking {
  id: string;
  accommodationId: string;
  accommodation: Accommodation;
  guestId: string;
  guest: User;
  hostId: string;
  checkIn: Date;
  checkOut: Date;
  guests: {
    adults: number;
    children: number;
    infants: number;
    pets: number;
  };
  totalNights: number;
  pricePerNight: number;
  cleaningFee: number;
  serviceFee: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: Date;
  paymentStatus: 'pending' | 'paid' | 'refunded';
}

export interface Message {
  id: string;
  senderId: string;
  sender: User;
  receiverId: string;
  receiver: User;
  content: string;
  createdAt: Date;
  isRead: boolean;
  accommodationId?: string;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage: Message;
  unreadCount: number;
  accommodation?: Accommodation;
}

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
  propertyTypes?: PropertyType[];
  amenities?: string[];
  instantBook?: boolean;
  superhost?: boolean;
}

export interface HostStats {
  totalEarnings: number;
  totalBookings: number;
  occupancyRate: number;
  averageRating: number;
  monthlyEarnings: { month: string; amount: number }[];
}
