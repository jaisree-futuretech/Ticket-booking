import express, { Response } from 'express';
import QRCode from 'qrcode';
import { AuthenticatedRequest, requireAuth, requireOrganizer } from '../auth.js';
import { query, queryOne } from '../db.js';
import { checkInTicket } from '../services/bookingService.js';

const router = express.Router();

// Get attendee's tickets
router.get('/user/my-tickets', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const rawTickets = query<{
    id: string;
    booking_id: string;
    booking_reference: string;
    event_id: string;
    event_name: string;
    event_date: string;
    start_time: string;
    venue_name: string;
    venue_address: string;
    venue_city: string;
    poster_url: string;
    ticket_code: string;
    seat_label: string;
    section_name: string;
    attendee_name: string;
    qr_code_data: string;
    status: string;
    created_at: string;
    checked_in_at: string | null;
  }>(`
    SELECT 
      t.id,
      t.booking_id,
      b.booking_reference,
      t.event_id,
      e.name AS event_name,
      e.event_date,
      e.start_time,
      v.name AS venue_name,
      v.address AS venue_address,
      v.city AS venue_city,
      e.poster_url,
      t.ticket_code,
      t.seat_label,
      t.section_name,
      t.attendee_name,
      t.qr_code_data,
      t.status,
      t.created_at,
      ci.checked_in_at
    FROM tickets t
    JOIN bookings b ON t.booking_id = b.id
    JOIN events e ON t.event_id = e.id
    JOIN venues v ON e.venue_id = v.id
    LEFT JOIN check_ins ci ON t.id = ci.ticket_id
    WHERE t.user_id = ?
    ORDER BY e.event_date ASC, t.created_at DESC
  `, [userId]);

  const tickets = await Promise.all(
    rawTickets.map(async t => {
      let qrCodeDataUrl = '';
      try {
        qrCodeDataUrl = await QRCode.toDataURL(t.qr_code_data, {
          width: 280,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
      } catch (err) {
        console.error('QR code generation error:', err);
      }

      return {
        ...t,
        qrCodeDataUrl,
      };
    })
  );

  return res.json(tickets);
});

// Check in ticket (Organizer only)
router.post('/check-in', requireOrganizer, (req: AuthenticatedRequest, res: Response) => {
  const { ticketCode } = req.body;
  const organizerId = req.user!.id;

  if (!ticketCode || typeof ticketCode !== 'string') {
    return res.status(400).json({ error: 'Please provide a valid ticket code or QR payload.' });
  }

  const result = checkInTicket(ticketCode, organizerId);

  if (!result.success) {
    if (result.status === 'ALREADY_CHECKED_IN') {
      return res.status(409).json(result);
    }
    return res.status(400).json(result);
  }

  return res.json(result);
});

export default router;
