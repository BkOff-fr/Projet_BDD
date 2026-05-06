import type {
  User,
  UserProfile,
  Accommodation,
  AccommodationDetail,
  Booking,
  Conversation,
  Message,
  Amenity,
  RegisterInput,
  LoginInput,
  CreateAccommodationInput,
  CreateBookingInput,
  CreateReviewInput,
  SendMessageInput,
  UpdateProfileInput,
  ChangePasswordInput,
  BecomeHostInput,
  DeleteAccountInput,
  UploadPictureInput,
  UpdateBookingStatusInput,
  SetAvailabilityInput,
  CreatePricingRuleInput,
  HostDashboardData,
  HostProperty,
  HostPropertyBooking,
  AvailabilityCalendar,
  PricingRule,
  MyReviewRow,
} from '@/types';

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
  register: (userData: RegisterInput) =>
    fetchAPI<{ message: string; user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  login: (credentials: LoginInput) =>
    fetchAPI<{ message: string; user: User; token: string }>('/auth/login', {
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

  getById: (id: string | number) =>
    fetchAPI<AccommodationDetail>(`/accommodations/${id}`),

  create: (data: CreateAccommodationInput) =>
    fetchAPI<{ message: string; id: number }>('/accommodations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAmenities: () => fetchAPI<Amenity[]>('/accommodations/amenities'),
};

// Bookings API
export const bookingsAPI = {
  getMyBookings: (status?: string) => {
    const query = status ? `?status=${status}` : '';
    return fetchAPI<Booking[]>(`/bookings${query}`);
  },

  create: (data: CreateBookingInput) =>
    fetchAPI<{ message: string; id: number; totalPrice: number }>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  cancel: (id: string | number) =>
    fetchAPI<{ message: string }>(`/bookings/${id}/cancel`, {
      method: 'PATCH',
    }),

  createReview: (data: CreateReviewInput) =>
    fetchAPI<{ message: string }>('/bookings/review', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Messages API
export const messagesAPI = {
  getConversations: () => fetchAPI<Conversation[]>('/messages'),

  getConversation: (userId: string | number) =>
    fetchAPI<{
      otherUser: {
        id: number;
        firstName: string;
        lastName: string;
        profilePicture?: string | null;
      };
      messages: Message[];
    }>(`/messages/${userId}`),

  send: (data: SendMessageInput) =>
    fetchAPI<{ message: string; id: number }>('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getUnreadCount: () => fetchAPI<{ count: number }>('/messages/unread'),
};

// Users API (self-service: /api/users/me/*)
export const usersAPI = {
  getProfile: () => fetchAPI<UserProfile>('/users/me'),

  updateProfile: (data: UpdateProfileInput) =>
    fetchAPI<{ message: string }>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  changePassword: (data: ChangePasswordInput) =>
    fetchAPI<{ message: string }>('/users/me/password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  becomeHost: (data: BecomeHostInput) =>
    fetchAPI<{ message: string }>('/users/me/become-host', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMyReviews: () => fetchAPI<MyReviewRow[]>('/users/me/reviews'),

  deleteAccount: (data: DeleteAccountInput) =>
    fetchAPI<{ message: string }>('/users/me', {
      method: 'DELETE',
      body: JSON.stringify(data),
    }),

  uploadPicture: (data: UploadPictureInput) =>
    fetchAPI<{ message: string; url: string }>('/users/me/picture', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Host API (host-only: /api/host/*)
export const hostAPI = {
  getDashboard: () => fetchAPI<HostDashboardData>('/host/dashboard'),

  getProperties: () => fetchAPI<HostProperty[]>('/host/properties'),

  getPropertyBookings: (propertyId: number) =>
    fetchAPI<HostPropertyBooking[]>(`/host/properties/${propertyId}/bookings`),

  // Backend mounts this route as `/host/bookings/:id/status` — we keep
  // `bookingId` as the developer-facing param for clarity.
  updateBookingStatus: (bookingId: number, data: UpdateBookingStatusInput) =>
    fetchAPI<{ message: string }>(`/host/bookings/${bookingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  setAvailability: (propertyId: number, data: SetAvailabilityInput) =>
    fetchAPI<{ message: string }>(
      `/host/properties/${propertyId}/availability`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  getAvailabilityCalendar: (
    propertyId: number,
    options?: { year?: number; month?: number }
  ) => {
    const params = new URLSearchParams();
    if (options?.year !== undefined) params.append('year', String(options.year));
    if (options?.month !== undefined) params.append('month', String(options.month));
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<AvailabilityCalendar>(
      `/host/properties/${propertyId}/availability${query}`
    );
  },

  addPricingRule: (propertyId: number, data: CreatePricingRuleInput) =>
    fetchAPI<{ message: string; id: number }>(
      `/host/properties/${propertyId}/pricing-rules`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  getPricingRules: (propertyId: number) =>
    fetchAPI<PricingRule[]>(`/host/properties/${propertyId}/pricing-rules`),

  deletePricingRule: (ruleId: number) =>
    fetchAPI<{ message: string }>(`/host/pricing-rules/${ruleId}`, {
      method: 'DELETE',
    }),
};

export default {
  auth: authAPI,
  accommodations: accommodationsAPI,
  bookings: bookingsAPI,
  messages: messagesAPI,
  users: usersAPI,
  host: hostAPI,
};
