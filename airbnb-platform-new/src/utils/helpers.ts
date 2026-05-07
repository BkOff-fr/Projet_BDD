import { format, differenceInDays, parseISO } from 'date-fns';
import type { Accommodation, SearchFilters } from '@/types';

/**
 * Single placeholder image used wherever the UI expects an accommodation
 * cover image but the BDD has no images table yet. Tracked as a known gap
 * to be addressed in a future task.
 */
export const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop';

/** Convenience helper: returns the accommodation cover image, or the placeholder. */
export const getAccommodationImage = (accommodation: { coverImage?: string }): string =>
  accommodation.coverImage ?? PLACEHOLDER_IMAGE;

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

/**
 * Parse a YYYY-MM-DD (or full ISO with `T`) string into a LOCAL Date at noon.
 *
 * Why noon: parseISO of a bare YYYY-MM-DD treats it as UTC midnight; in
 * negative-offset timezones that's the previous day locally. By constructing
 * the Date from local Y/M/D components at 12:00, we sidestep both that issue
 * AND any DST 1am→3am edge cases.
 *
 * Used by host calendar / pricing pages so backend "calendar dates" render
 * exactly as the host typed them, regardless of the browser's timezone.
 */
export const parseLocalDate = (s: string): Date => {
  const [y, m, d] = s.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
};

/**
 * Format a backend YYYY-MM-DD (or ISO with `T`) string using LOCAL Y/M/D.
 * Convenience wrapper around `parseLocalDate` + `format`. Avoids the UTC-shift
 * bug present in `formatDate` for bare date strings.
 */
export const formatLocalDate = (raw: string, fmt = 'MMM d, yyyy'): string =>
  format(parseLocalDate(raw), fmt);

/**
 * Format a Date as a local YYYY-MM-DD string. Does NOT touch UTC.
 *
 * Companion to `parseLocalDate` — used by the host calendar / pricing pages
 * to key cells by local calendar date without crossing through `toISOString`,
 * which would shift the date by a day near midnight in negative-offset
 * timezones.
 */
export const dateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

    // Property type filter — uses single `type` enum from the backend.
    if (filters.propertyTypes && filters.propertyTypes.length > 0) {
      if (!filters.propertyTypes.includes(acc.type)) {
        return false;
      }
    }

    // Amenities filter — match by amenity id (backend returns Amenity[]).
    if (filters.amenities && filters.amenities.length > 0) {
      const accAmenityIds = acc.amenities.map((a) => String(a.id));
      const hasAllAmenities = filters.amenities.every((id) =>
        accAmenityIds.includes(id)
      );
      if (!hasAllAmenities) return false;
    }

    // Instant book filter
    if (filters.instantBook && !acc.instantBook) {
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

// Get accommodation type label (single dimension — matches backend enum)
export const getAccommodationTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    apartment: 'Apartment',
    house: 'House',
    villa: 'Villa',
    condo: 'Condo',
    cabin: 'Cabin',
    guesthouse: 'Guesthouse',
    studio: 'Studio',
    private_room: 'Private room',
  };
  return labels[type] || type;
};

// Backwards-compatible alias for components still calling `getPropertyTypeLabel`.
export const getPropertyTypeLabel = getAccommodationTypeLabel;

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
