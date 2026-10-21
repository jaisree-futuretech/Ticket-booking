import {
  BookingCreationResult,
  BookingDetail,
  EventItem,
  OrganizerAnalytics,
  SeatItem,
  TicketItem,
  User,
} from '../types';

const TOKEN_KEY = 'reserveseat_jwt_token';

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    (err as any).status = response.status;
    (err as any).data = data;
    throw err;
  }

  return data as T;
}

export const api = {
  // Auth
  register: (payload: { name: string; email: string; password: string; role: string }) =>
    request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  switchDemoAccount: (role: 'ORGANIZER' | 'ATTENDEE', email?: string) =>
    request<{ token: string; user: User }>('/api/auth/switch-demo', {
      method: 'POST',
      body: JSON.stringify({ role, email }),
    }),

  getCurrentUser: () => request<{ user: User }>('/api/auth/me'),

  // Events
  getEvents: (params?: { search?: string; category?: string; date?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.category) query.set('category', params.category);
    if (params?.date) query.set('date', params.date);
    const qs = query.toString();
    return request<EventItem[]>(`/api/events${qs ? `?${qs}` : ''}`);
  },

  getEvent: (id: string) => request<EventItem>(`/api/events/${id}`),

  createEvent: (payload: any) =>
    request<{ id: string; message: string }>('/api/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateEvent: (id: string, payload: any) =>
    request<{ message: string }>(`/api/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Seats & Holds
  getSeats: (eventId: string) => request<SeatItem[]>(`/api/events/${eventId}/seats`),

  holdSeats: (eventId: string, seatIds: string[]) =>
    request<{ success: boolean; heldSeats: string[]; expiresAt: string; remainingSeconds: number }>(
      `/api/events/${eventId}/holds`,
      {
        method: 'POST',
        body: JSON.stringify({ seatIds }),
      }
    ),

  releaseEventHolds: (eventId: string) =>
    request<{ message: string }>(`/api/events/${eventId}/holds`, {
      method: 'DELETE',
    }),

  releaseSeatHold: (seatId: string) =>
    request<{ success: boolean }>(`/api/events/holds/${seatId}`, {
      method: 'DELETE',
    }),

  // Bookings
  createBookingOrder: (eventId: string, seatIds: string[]) =>
    request<any>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ eventId, seatIds }),
    }),

  getBooking: (bookingId: string) => request<BookingDetail>(`/api/bookings/${bookingId}`),

  getMyBookings: () => request<any[]>('/api/bookings/user/my-bookings'),

  // Payments
  verifyPayment: (payload: {
    bookingId: string;
    paymentMethod: string;
    shouldFailTest?: boolean;
    transactionRef?: string;
  }) =>
    request<{ success: boolean; message: string; booking: BookingDetail }>('/api/payments/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Tickets
  getMyTickets: () => request<TicketItem[]>('/api/tickets/user/my-tickets'),

  checkInTicket: (ticketCode: string) =>
    request<{
      success: boolean;
      status: 'CHECKED_IN' | 'ALREADY_CHECKED_IN' | 'INVALID';
      message: string;
      ticket?: any;
    }>('/api/tickets/check-in', {
      method: 'POST',
      body: JSON.stringify({ ticketCode }),
    }),

  // Organizer
  getOrganizerAnalytics: () => request<OrganizerAnalytics>('/api/organizer/analytics'),

  getOrganizerEvents: () => request<any[]>('/api/organizer/events'),

  getOrganizerEventDetail: (eventId: string) => request<any>(`/api/organizer/events/${eventId}`),

  toggleSeatBlock: (seatId: string, isBlocked: boolean) =>
    request<{ success: boolean; isBlocked: boolean }>(`/api/organizer/seats/${seatId}/block`, {
      method: 'PUT',
      body: JSON.stringify({ isBlocked }),
    }),

  getEventAttendees: (eventId: string) => request<any[]>(`/api/organizer/events/${eventId}/attendees`),
};
