export type UserRole = 'ORGANIZER' | 'ATTENDEE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  capacity: number;
}

export interface Section {
  id: string;
  name: string;
  price: number;
  color: string;
  display_order: number;
}

export interface EventItem {
  id: string;
  name: string;
  description: string;
  category: string;
  event_date: string;
  start_time: string;
  end_time: string;
  poster_url: string;
  max_capacity: number;
  status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED';
  venue_name: string;
  venue_city: string;
  venue_address: string;
  min_price?: number;
  max_price?: number;
  available_seats_count?: number;
  available_seats?: number;
  total_seats?: number;
  organizer_id?: string;
  organizer_name?: string;
  sections?: Section[];
}

export type SeatStatus = 'AVAILABLE' | 'HELD' | 'HELD_BY_ME' | 'BOOKED' | 'UNAVAILABLE';

export interface SeatItem {
  id: string;
  eventId: string;
  sectionId: string;
  sectionName: string;
  sectionPrice: number;
  sectionColor: string;
  rowId: string;
  rowLabel: string;
  seatNumber: number;
  seatLabel: string;
  status: SeatStatus;
  isBlocked: boolean;
  holdExpiresAt?: string | null;
  remainingSeconds?: number;
}

export interface BookingSummary {
  bookingId: string;
  bookingReference: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  venueName: string;
  subtotal: number;
  convenienceFee: number;
  totalAmount: number;
  currency: string;
  seats: Array<{
    seatId: string;
    seatLabel: string;
    sectionName: string;
    price: number;
  }>;
  expiresAt: string;
}

export type BookingCreationResult = BookingSummary;

export interface TicketItem {
  id: string;
  ticketCode: string;
  seatLabel: string;
  sectionName: string;
  attendeeName: string;
  attendeeEmail?: string;
  qrCodeDataUrl?: string;
  qrCodeData?: string;
  status: 'VALID' | 'CHECKED_IN' | 'CANCELLED';
  checkedInAt?: string;
  eventName?: string;
  eventDate?: string;
  startTime?: string;
  venueName?: string;
  venueAddress?: string;
  venueCity?: string;
  bookingReference?: string;
  posterUrl?: string;
}

export interface BookingDetail {
  id: string;
  bookingReference: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  venueName: string;
  venueAddress: string;
  posterUrl: string;
  userId: string;
  attendeeName: string;
  attendeeEmail: string;
  subtotal: number;
  convenienceFee: number;
  totalAmount: number;
  currency: string;
  paymentStatus: string;
  bookingStatus: string;
  createdAt: string;
  items: Array<{
    id: string;
    seatId: string;
    seatLabel: string;
    sectionName: string;
    price: number;
  }>;
  tickets: TicketItem[];
}

export interface OrganizerAnalytics {
  totalEvents: number;
  totalBookings: number;
  totalRevenue: number;
  totalTickets: number;
  ticketsCheckedIn: number;
  upcomingEvents: number;
  revenueByEvent: Array<{
    event_id: string;
    event_name: string;
    revenue: number;
    bookings_count: number;
    tickets_sold: number;
    max_capacity: number;
  }>;
  recentBookings: Array<{
    id: string;
    booking_reference: string;
    event_name: string;
    attendee_name: string;
    attendee_email: string;
    seats_list: string;
    total_amount: number;
    payment_status: string;
    booking_status: string;
    created_at: string;
  }>;
}
