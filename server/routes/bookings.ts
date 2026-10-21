import express, { Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../auth.js';
import { createBookingOrder, getBookingDetails } from '../services/bookingService.js';
import { query } from '../db.js';

const router = express.Router();

// Create booking order from held seats
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { eventId, seatIds } = req.body;
  const userId = req.user!.id;

  if (!eventId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
    return res.status(400).json({ error: 'Event ID and seat IDs are required.' });
  }

  try {
    const order = createBookingOrder(eventId, seatIds, userId);
    return res.status(201).json(order);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to create booking order.' });
  }
});

// Get single booking with tickets and QR codes
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const booking = await getBookingDetails(req.params.id);

    // Ensure attendee can only view their own booking (or organizer of event can view)
    if (booking.userId !== req.user!.id && req.user!.role !== 'ORGANIZER') {
      return res.status(403).json({ error: 'You are not authorized to view this booking.' });
    }

    return res.json(booking);
  } catch (err: any) {
    return res.status(404).json({ error: err.message || 'Booking not found.' });
  }
});

// Get attendee's bookings list and tickets
router.get('/user/my-bookings', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const bookings = query<{
    id: string;
    booking_reference: string;
    event_id: string;
    event_name: string;
    event_date: string;
    start_time: string;
    venue_name: string;
    venue_city: string;
    poster_url: string;
    total_amount: number;
    currency: string;
    payment_status: string;
    booking_status: string;
    created_at: string;
    seat_count: number;
    seats_list: string;
  }>(`
    SELECT 
      b.id,
      b.booking_reference,
      b.event_id,
      e.name AS event_name,
      e.event_date,
      e.start_time,
      v.name AS venue_name,
      v.city AS venue_city,
      e.poster_url,
      b.total_amount,
      b.currency,
      b.payment_status,
      b.booking_status,
      b.created_at,
      COUNT(bi.id) AS seat_count,
      GROUP_CONCAT(bi.seat_label, ', ') AS seats_list
    FROM bookings b
    JOIN events e ON b.event_id = e.id
    JOIN venues v ON e.venue_id = v.id
    LEFT JOIN booking_items bi ON b.id = bi.booking_id
    WHERE b.user_id = ?
    GROUP BY b.id
    ORDER BY b.created_at DESC
  `, [userId]);

  return res.json(bookings);
});

export default router;
