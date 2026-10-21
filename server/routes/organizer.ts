import express, { Response } from 'express';
import { AuthenticatedRequest, requireOrganizer } from '../auth.js';
import { query, queryOne, run } from '../db.js';

const router = express.Router();

// Get organizer analytics dashboard data
router.get('/analytics', requireOrganizer, (req: AuthenticatedRequest, res: Response) => {
  const organizerId = req.user!.id;

  // 1. Total events count
  const eventsCountRes = queryOne<{ count: number }>(`
    SELECT COUNT(*) AS count FROM events WHERE organizer_id = ?
  `, [organizerId]);
  const totalEvents = eventsCountRes?.count || 0;

  // 2. Total Bookings count & Total Revenue
  const bookingStats = queryOne<{
    total_bookings: number;
    total_revenue: number;
  }>(`
    SELECT 
      COUNT(b.id) AS total_bookings,
      COALESCE(SUM(b.total_amount), 0) AS total_revenue
    FROM bookings b
    JOIN events e ON b.event_id = e.id
    WHERE e.organizer_id = ? AND b.payment_status = 'PAID'
  `, [organizerId]);

  // 3. Tickets Checked In & Total Tickets
  const ticketStats = queryOne<{
    total_tickets: number;
    checked_in_tickets: number;
  }>(`
    SELECT 
      COUNT(t.id) AS total_tickets,
      COALESCE(SUM(CASE WHEN t.status = 'CHECKED_IN' THEN 1 ELSE 0 END), 0) AS checked_in_tickets
    FROM tickets t
    JOIN events e ON t.event_id = e.id
    WHERE e.organizer_id = ?
  `, [organizerId]);

  // 4. Upcoming events count
  const upcomingCount = queryOne<{ count: number }>(`
    SELECT COUNT(*) AS count 
    FROM events 
    WHERE organizer_id = ? AND event_date >= date('now')
  `, [organizerId]);

  // 5. Revenue by Event
  const revenueByEvent = query<{
    event_id: string;
    event_name: string;
    revenue: number;
    bookings_count: number;
    tickets_sold: number;
    max_capacity: number;
  }>(`
    SELECT 
      e.id AS event_id,
      e.name AS event_name,
      COALESCE(SUM(b.total_amount), 0) AS revenue,
      COUNT(DISTINCT b.id) AS bookings_count,
      COUNT(DISTINCT t.id) AS tickets_sold,
      e.max_capacity
    FROM events e
    LEFT JOIN bookings b ON e.id = b.event_id AND b.payment_status = 'PAID'
    LEFT JOIN tickets t ON e.id = t.event_id
    WHERE e.organizer_id = ?
    GROUP BY e.id
    ORDER BY revenue DESC
  `, [organizerId]);

  // 6. Recent Bookings
  const recentBookings = query<{
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
  }>(`
    SELECT 
      b.id,
      b.booking_reference,
      e.name AS event_name,
      u.name AS attendee_name,
      u.email AS attendee_email,
      GROUP_CONCAT(bi.seat_label, ', ') AS seats_list,
      b.total_amount,
      b.payment_status,
      b.booking_status,
      b.created_at
    FROM bookings b
    JOIN events e ON b.event_id = e.id
    JOIN users u ON b.user_id = u.id
    LEFT JOIN booking_items bi ON b.id = bi.booking_id
    WHERE e.organizer_id = ?
    GROUP BY b.id
    ORDER BY b.created_at DESC
    LIMIT 10
  `, [organizerId]);

  return res.json({
    totalEvents,
    totalBookings: bookingStats?.total_bookings || 0,
    totalRevenue: bookingStats?.total_revenue || 0,
    totalTickets: ticketStats?.total_tickets || 0,
    ticketsCheckedIn: ticketStats?.checked_in_tickets || 0,
    upcomingEvents: upcomingCount?.count || 0,
    revenueByEvent,
    recentBookings,
  });
});

// List organizer's events
router.get('/events', requireOrganizer, (req: AuthenticatedRequest, res: Response) => {
  const organizerId = req.user!.id;

  const events = query<{
    id: string;
    name: string;
    category: string;
    event_date: string;
    start_time: string;
    end_time: string;
    poster_url: string;
    venue_name: string;
    venue_city: string;
    max_capacity: number;
    status: string;
    tickets_sold: number;
    revenue: number;
  }>(`
    SELECT 
      e.id,
      e.name,
      e.category,
      e.event_date,
      e.start_time,
      e.end_time,
      e.poster_url,
      v.name AS venue_name,
      v.city AS venue_city,
      e.max_capacity,
      e.status,
      (SELECT COUNT(t.id) FROM tickets t WHERE t.event_id = e.id) AS tickets_sold,
      COALESCE((SELECT SUM(b.total_amount) FROM bookings b WHERE b.event_id = e.id AND b.payment_status = 'PAID'), 0) AS revenue
    FROM events e
    JOIN venues v ON e.venue_id = v.id
    WHERE e.organizer_id = ?
    ORDER BY e.event_date ASC
  `, [organizerId]);

  return res.json(events);
});

// Get detailed event info for organizer management
router.get('/events/:id', requireOrganizer, (req: AuthenticatedRequest, res: Response) => {
  const organizerId = req.user!.id;
  const eventId = req.params.id;

  const event = queryOne<{
    id: string;
    name: string;
    description: string;
    category: string;
    event_date: string;
    start_time: string;
    end_time: string;
    poster_url: string;
    max_capacity: number;
    status: string;
    venue_id: string;
    venue_name: string;
    venue_address: string;
    venue_city: string;
  }>(`
    SELECT 
      e.id, e.name, e.description, e.category, e.event_date, 
      e.start_time, e.end_time, e.poster_url, e.max_capacity, e.status,
      v.id AS venue_id, v.name AS venue_name, v.address AS venue_address, v.city AS venue_city
    FROM events e
    JOIN venues v ON e.venue_id = v.id
    WHERE e.id = ? AND e.organizer_id = ?
  `, [eventId, organizerId]);

  if (!event) {
    return res.status(404).json({ error: 'Event not found or unauthorized.' });
  }

  // Sections
  const sections = query(`
    SELECT id, name, price, color, display_order
    FROM sections
    WHERE event_id = ?
    ORDER BY display_order ASC
  `, [eventId]);

  // Seats with block status
  const seats = query(`
    SELECT 
      s.id, s.section_id, s.row_id, s.seat_number, s.seat_label, s.is_blocked,
      r.row_label, sec.name AS section_name, sec.price, sec.color,
      (
        SELECT t.status 
        FROM tickets t 
        WHERE t.seat_id = s.id 
        LIMIT 1
      ) AS ticket_status,
      (
        SELECT u.name 
        FROM tickets t 
        JOIN users u ON t.user_id = u.id 
        WHERE t.seat_id = s.id 
        LIMIT 1
      ) AS booked_by_name
    FROM seats s
    JOIN rows r ON s.row_id = r.id
    JOIN sections sec ON s.section_id = sec.id
    WHERE s.event_id = ?
    ORDER BY sec.display_order ASC, r.row_order ASC, s.seat_number ASC
  `, [eventId]);

  return res.json({
    event,
    sections,
    seats,
  });
});

// Toggle seat availability (block/unblock)
router.put('/seats/:seatId/block', requireOrganizer, (req: AuthenticatedRequest, res: Response) => {
  const { isBlocked } = req.body;
  const organizerId = req.user!.id;
  const seatId = req.params.seatId;

  // Verify seat belongs to an event organized by this user
  const seat = queryOne<{ event_id: string }>(`
    SELECT s.event_id 
    FROM seats s 
    JOIN events e ON s.event_id = e.id 
    WHERE s.id = ? AND e.organizer_id = ?
  `, [seatId, organizerId]);

  if (!seat) {
    return res.status(404).json({ error: 'Seat not found or unauthorized.' });
  }

  // Check if seat is currently booked
  const isBooked = queryOne<{ id: string }>(`
    SELECT bi.id 
    FROM booking_items bi 
    JOIN bookings b ON bi.booking_id = b.id 
    WHERE bi.seat_id = ? AND b.booking_status = 'CONFIRMED'
    LIMIT 1
  `, [seatId]);

  if (isBooked && isBlocked) {
    return res.status(400).json({ error: 'Cannot block a seat that is already booked.' });
  }

  run('UPDATE seats SET is_blocked = ? WHERE id = ?', [isBlocked ? 1 : 0, seatId]);

  return res.json({ success: true, isBlocked: Boolean(isBlocked) });
});

// Get attendees list for an event
router.get('/events/:id/attendees', requireOrganizer, (req: AuthenticatedRequest, res: Response) => {
  const organizerId = req.user!.id;
  const eventId = req.params.id;

  const attendees = query<{
    ticket_id: string;
    ticket_code: string;
    attendee_name: string;
    attendee_email: string;
    seat_label: string;
    section_name: string;
    booking_reference: string;
    status: string;
    created_at: string;
    checked_in_at: string | null;
  }>(`
    SELECT 
      t.id AS ticket_id,
      t.ticket_code,
      t.attendee_name,
      t.attendee_email,
      t.seat_label,
      t.section_name,
      b.booking_reference,
      t.status,
      t.created_at,
      ci.checked_in_at
    FROM tickets t
    JOIN events e ON t.event_id = e.id
    JOIN bookings b ON t.booking_id = b.id
    LEFT JOIN check_ins ci ON t.id = ci.ticket_id
    WHERE e.id = ? AND e.organizer_id = ?
    ORDER BY t.seat_label ASC
  `, [eventId, organizerId]);

  return res.json(attendees);
});

export default router;
