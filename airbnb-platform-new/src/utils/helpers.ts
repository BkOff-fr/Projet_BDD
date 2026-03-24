import { format, differenceInDays, isWithinInterval, parseISO } from 'date-fns';
import type { Accommodation, Booking, SearchFilters } from '@/types';

// Format currency
export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format date
export const formatDate = (date: Date | string, formatStr = 'MMM d, yyyy'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
};

// Format short date
export const formatShortDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d');
};

// Calculate nights between dates
export const calculateNights = (checkIn: Date, checkOut: Date): number => {
  return differenceInDays(checkOut, checkIn);
};

// Calculate total price
export const calculateTotalPrice = (
  pricePerNight: number,
  nights: number,
  cleaningFee: number,
  serviceFee: number
): { subtotal: number; total: number } => {
  const subtotal = pricePerNight * nights;
  const total = subtotal + cleaningFee + serviceFee;
  return { subtotal, total };
};

// Truncate text
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

// Generate star rating display
export const generateStarRating = (rating: number): string => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  return '★'.repeat(fullStars) + (hasHalfStar ? '½' : '') + '☆'.repeat(emptyStars);
};

// Filter accommodations
export const filterAccommodations = (
  accommodations: Accommodation[],
  filters: SearchFilters
): Accommodation[] => {
  return accommodations.filter((acc) => {
    // Location filter
    if (filters.location) {
      const searchTerm = filters.location.toLowerCase();
      const matchesLocation =
        acc.location.city.toLowerCase().includes(searchTerm) ||
        acc.location.country.toLowerCase().includes(searchTerm) ||
        acc.title.toLowerCase().includes(searchTerm);
      if (!matchesLocation) return false;
    }

    // Price range filter
    if (filters.priceRange) {
      if (
        acc.pricePerNight < filters.priceRange.min ||
        acc.pricePerNight > filters.priceRange.max
      ) {
        return false;
      }
    }

    // Property type filter
    if (filters.propertyTypes && filters.propertyTypes.length > 0) {
      if (!filters.propertyTypes.includes(acc.propertyType)) {
        return false;
      }
    }

    // Amenities filter
    if (filters.amenities && filters.amenities.length > 0) {
      const hasAllAmenities = filters.amenities.every((amenity) =>
        acc.amenities.includes(amenity)
      );
      if (!hasAllAmenities) return false;
    }

    // Instant book filter
    if (filters.instantBook && !acc.instantBook) {
      return false;
    }

    // Superhost filter
    if (filters.superhost && !acc.isSuperhost) {
      return false;
    }

    // Guest count filter
    if (filters.guests) {
      const totalGuests =
        filters.guests.adults +
        filters.guests.children +
        filters.guests.infants;
      if (acc.maxGuests < totalGuests) return false;
    }

    return true;
  });
};

// Check if dates are available
export const checkAvailability = (
  accommodation: Accommodation,
  checkIn: Date,
  checkOut: Date
): boolean => {
  // In a real app, this would check against actual availability data
  // For mock data, we'll assume all dates are available
  return true;
};

// Get unique cities from accommodations
export const getUniqueCities = (accommodations: Accommodation[]): string[] => {
  const cities = new Set(accommodations.map((acc) => acc.location.city));
  return Array.from(cities).sort();
};

// Get price range
export const getPriceRange = (
  accommodations: Accommodation[]
): { min: number; max: number } => {
  if (accommodations.length === 0) return { min: 0, max: 0 };
  
  const prices = accommodations.map((acc) => acc.pricePerNight);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
};

// Debounce function
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Get initials from name
export const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

// Get property type label
export const getPropertyTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    studio: 'Studio',
    apartment: 'Apartment',
    house: 'House',
    villa: 'Villa',
    cabin: 'Cabin',
    condo: 'Condo',
    loft: 'Loft',
    entire_place: 'Entire place',
    private_room: 'Private room',
    shared_room: 'Shared room',
  };
  return labels[type] || type;
};

// Get accommodation type label
export const getAccommodationTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    entire_place: 'Entire place',
    private_room: 'Private room',
    shared_room: 'Shared room',
  };
  return labels[type] || type;
};

// Scroll to top
export const scrollToTop = (): void => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Group messages by date
export const groupMessagesByDate = <T extends { createdAt: Date | string }>(
  messages: T[]
): Record<string, T[]> => {
  return messages.reduce((groups, message) => {
    const date = formatDate(message.createdAt, 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, T[]>);
};
