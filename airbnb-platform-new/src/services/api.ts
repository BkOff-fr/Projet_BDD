import { User, Accommodation, Booking, Message, Conversation } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Generic fetch wrapper
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

// Auth API
export const authAPI = {
  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    isHost?: boolean;
  }) => fetchAPI<{ user: User; token: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),

  login: (credentials: { email: string; password: string }) =>
    fetchAPI<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  getMe: () => fetchAPI<User>('/auth/me'),
};

// Accommodations API
export const accommodationsAPI = {
  getAll: (filters?: {
    location?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    minPrice?: number;
    maxPrice?: number;
    type?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<Accommodation[]>(`/accommodations${query}`);
  },

  getById: (id: string) => fetchAPI<Accommodation>(`/accommodations/${id}`),

  create: (data: {
    title: string;
    description: string;
    type: string;
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
  }) => fetchAPI<{ message: string; id: number }>('/accommodations', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getAmenities: () => fetchAPI<{ id: number; name: string; category: string; icon?: string }[]>('/accommodations/amenities'),
};

// Bookings API
export const bookingsAPI = {
  getMyBookings: (status?: string) => {
    const query = status ? `?status=${status}` : '';
    return fetchAPI<Booking[]>(`/bookings${query}`);
  },

  create: (data: {
    accommodationId: number;
    checkInDate: string;
    checkOutDate: string;
    numGuests: number;
    specialRequests?: string;
  }) => fetchAPI<{ message: string; id: number; totalPrice: string }>('/bookings', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  cancel: (id: string) => fetchAPI<{ message: string }>(`/bookings/${id}/cancel`, {
    method: 'PATCH',
  }),

  createReview: (data: {
    bookingId: number;
    rating: number;
    comment?: string;
    cleanlinessRating?: number;
    accuracyRating?: number;
    checkinRating?: number;
    communicationRating?: number;
    locationRating?: number;
    valueRating?: number;
  }) => fetchAPI<{ message: string }>('/bookings/review', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Messages API
export const messagesAPI = {
  getConversations: () => fetchAPI<Conversation[]>('/messages'),

  getConversation: (userId: string) => fetchAPI<{
    otherUser: {
      id: number;
      firstName: string;
      lastName: string;
      profilePicture?: string;
    };
    messages: Message[];
  }>(`/messages/${userId}`),

  send: (data: {
    receiverId: number;
    accommodationId?: number;
    content: string;
  }) => fetchAPI<{ message: string; id: number }>('/messages', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getUnreadCount: () => fetchAPI<{ count: number }>('/messages/unread'),
};

export default {
  auth: authAPI,
  accommodations: accommodationsAPI,
  bookings: bookingsAPI,
  messages: messagesAPI,
};
