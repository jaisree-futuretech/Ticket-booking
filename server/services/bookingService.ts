import QRCode from 'qrcode';
import { query, queryOne, run, transaction } from '../db.js';
import { cleanupExpiredHolds } from './seatService.js';

export interface BookingCreationResult {
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
  tickets: Array<{
    id: string;
    ticketCode: string;
    seatLabel: string;
    sectionName: string;
    attendeeName: string;
    qrCodeData: string;
    status: string;
    checkedInAt?: string;
  }>;
}

// Generate unique booking reference e.g. "EVT-8F92K1"
function generateBookingReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'EVT-';
  for (let i = 0; i < 6; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

// Generate unique ticket code e.g. "TCK-89A742"
function generateTicketCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TCK-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create Pending Booking order from held seats
export function createBookingOrder(
  eventId: string,
  seatIds: string[],
  userId: string
): BookingCreationResult {
  if (!seatIds || seatIds.length === 0) {
    throw new Error('Please select at least one seat to proceed to checkout.');
  }

  return transaction(() => {
    cleanupExpiredHolds();

    // 1. Verify user holds all requested seats actively
    const placeholders = seatIds.map(() => '?').join(',');
    const activeHolds = query<{
      seat_id: string;
      expires_at: string;
    }>(`
      SELECT seat_id, expires_at 
      FROM seat_holds 
      WHERE seat_id IN (${placeholders}) 
        AND user_id = ? 
        AND status = 'ACTIVE' 
        AND expires_at > datetime('now')
    `, [...seatIds, userId]);

    if (activeHolds.length !== seatIds.length) {
      throw new Error('Your seat reservation has expired or is invalid. Please select your seats again.');
    }

    const minExpiry = activeHolds.reduce((min, h) => (h.expires_at < min ? h.expires_at : min), activeHolds[0].expires_at);

    // 2. Fetch authoritative seat and section pricing from the database (NEVER TRUST CLIENT PRICES)
    const seatsInfo = query<{
      seat_id: string;
      seat_label: string;
      section_id: string;
      section_name: string;
      section_price: number;
    }>(`
      SELECT 
        s.id AS seat_id,
        s.seat_label,
        sec.id AS section_id,
        sec.name AS section_name,
        sec.price AS section_price
      FROM seats s
      JOIN sections sec ON s.section_id = sec.id
      WHERE s.id IN (${placeholders}) AND s.event_id = ?
    `, [...seatIds, eventId]);

    if (seatsInfo.length !== seatIds.length) {
      throw new Error('Invalid seat selection for this event.');
    }

    // 3. Fetch event & venue info
    const event = queryOne<{
      id: string;
      name: string;
      event_date: string;
      venue_name: string;
    }>(`
      SELECT e.id, e.name, e.event_date, v.name AS venue_name
      FROM events e
      JOIN venues v ON e.venue_id = v.id
      WHERE e.id = ?
    `, [eventId]);

    if (!event) {
      throw new Error('Event not found.');
    }

    // 4. Calculate subtotal & convenience fee
    const subtotal = seatsInfo.reduce((sum, s) => sum + s.section_price, 0);
    // Flat convenience fee per seat (₹50)
    const convenienceFee = seatsInfo.length * 50;
    const totalAmount = subtotal + convenienceFee;

    const bookingId = `bk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const bookingRef = generateBookingReference();

    // 5. Create pending booking record
    run(`
      INSERT INTO bookings (
        id, booking_reference, event_id, user_id, 
        subtotal, convenience_fee, total_amount, currency, 
        payment_status, booking_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'INR', 'PENDING', 'CONFIRMED')
    `, [bookingId, bookingRef, eventId, userId, subtotal, convenienceFee, totalAmount]);

    // 6. Create booking items
    for (const seat of seatsInfo) {
      const itemId = `bki_${bookingId}_${seat.seat_id}`;
      run(`
        INSERT INTO booking_items (
          id, booking_id, seat_id, section_id, price, seat_label, section_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [itemId, bookingId, seat.seat_id, seat.section_id, seat.section_price, seat.seat_label, seat.section_name]);
    }

    return {
      bookingId,
      bookingReference: bookingRef,
      eventId: event.id,
      eventName: event.name,
      eventDate: event.event_date,
      venueName: event.venue_name,
      subtotal,
      convenienceFee,
      totalAmount,
      currency: 'INR',
      seats: seatsInfo.map(s => ({
        seatId: s.seat_id,
        seatLabel: s.seat_label,
        sectionName: s.section_name,
        price: s.section_price,
      })),
      expiresAt: minExpiry,
    };
  });
}

// Verify payment and confirm booking with tickets and QR codes
export async function verifyPaymentAndConfirm(
  bookingId: string,
  userId: string,
  paymentDetails: {
    paymentMethod: string;
    shouldFailTest?: boolean;
    transactionRef?: string;
  }
): Promise<{ success: boolean; booking?: BookingDetail; error?: string }> {
  // If simulated payment failure was requested
  if (paymentDetails.shouldFailTest) {
    transaction(() => {
      run(`
        INSERT INTO payments (id, booking_id, amount, currency, transaction_ref, payment_method, status, failure_reason)
        VALUES (?, ?, (SELECT total_amount FROM bookings WHERE id = ?), 'INR', ?, ?, 'FAILED', 'Payment declined by test gateway: Insufficient funds or card declined')
      `, [`pay_fail_${Date.now()}`, bookingId, bookingId, `TXN-FAIL-${Date.now()}`, paymentDetails.paymentMethod]);

      run(`
        UPDATE bookings SET payment_status = 'FAILED' WHERE id = ?
      `, [bookingId]);
    });

    return {
      success: false,
      error: 'Payment failed: The test payment was declined by the issuer. Your seat hold is still active for a few more minutes; you may retry payment.',
    };
  }

  // Process success atomically
  const result = await (async () => {
    // We execute DB updates in transaction
    return transaction(async () => {
      cleanupExpiredHolds();

      // 1. Verify booking exists and belongs to user
      const booking = queryOne<{
        id: string;
        booking_reference: string;
        event_id: string;
        user_id: string;
        total_amount: number;
        payment_status: string;
        booking_status: string;
      }>(`
        SELECT id, booking_reference, event_id, user_id, total_amount, payment_status, booking_status
        FROM bookings
        WHERE id = ? AND user_id = ?
      `, [bookingId, userId]);

      if (!booking) {
        throw new Error('Booking order not found or unauthorized.');
      }

      if (booking.payment_status === 'PAID') {
        // Already paid
        return { alreadyPaid: true, bookingId: booking.id };
      }

      // 2. Fetch booking items to inspect the seats
      const items = query<{
        seat_id: string;
        seat_label: string;
        section_name: string;
      }>(`
        SELECT seat_id, seat_label, section_name
        FROM booking_items
        WHERE booking_id = ?
      `, [bookingId]);

      // 3. Concurrency check: Ensure user still holds these seats and holds have not expired!
      for (const item of items) {
        const hold = queryOne<{ id: string }>(`
          SELECT id 
          FROM seat_holds 
          WHERE seat_id = ? 
            AND user_id = ? 
            AND status = 'ACTIVE' 
            AND expires_at > datetime('now')
          LIMIT 1
        `, [item.seat_id, userId]);

        if (!hold) {
          throw new Error(`Your hold for seat ${item.seat_label} expired before payment completion. The seat has been released.`);
        }
      }

      // 4. Mark payment record as SUCCESS
      const txnRef = paymentDetails.transactionRef || `TXN-TEST-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      run(`
        INSERT INTO payments (id, booking_id, amount, currency, transaction_ref, payment_method, status, verified_at)
        VALUES (?, ?, ?, 'INR', ?, ?, 'SUCCESS', datetime('now'))
      `, [`pay_${Date.now()}`, bookingId, booking.total_amount, txnRef, paymentDetails.paymentMethod]);

      // 5. Update booking status
      run(`
        UPDATE bookings 
        SET payment_status = 'PAID', booking_status = 'CONFIRMED' 
        WHERE id = ?
      `, [bookingId]);

      // 6. Convert seat holds so they become permanently unavailable for this event
      for (const item of items) {
        run(`
          UPDATE seat_holds 
          SET status = 'CONVERTED' 
          WHERE seat_id = ? AND user_id = ? AND status = 'ACTIVE'
        `, [item.seat_id, userId]);
      }

      // 7. Fetch user details for tickets
      const user = queryOne<{ name: string; email: string }>('SELECT name, email FROM users WHERE id = ?', [userId]);
      const attendeeName = user ? user.name : 'Valued Attendee';
      const attendeeEmail = user ? user.email : '';

      // 8. Generate tickets with QR codes
      for (const item of items) {
        const ticketId = `tck_${bookingId}_${item.seat_id}`;
        const ticketCode = generateTicketCode();
        
        // Structured QR code payload containing verifiable ticket verification token
        const qrPayload = JSON.stringify({
          ticketCode,
          bookingRef: booking.booking_reference,
          eventId: booking.event_id,
          seat: item.seat_label,
          attendee: attendeeName,
          verified: true,
        });

        run(`
          INSERT INTO tickets (
            id, booking_id, event_id, user_id, seat_id,
            ticket_code, seat_label, section_name, attendee_name, attendee_email,
            qr_code_data, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VALID')
        `, [ticketId, bookingId, booking.event_id, userId, item.seat_id, ticketCode, item.seat_label, item.section_name, attendeeName, attendeeEmail, qrPayload]);
      }

      return { alreadyPaid: false, bookingId: booking.id };
    });
  })();

  const fullBooking = await getBookingDetails(bookingId);
  return { success: true, booking: fullBooking };
}

// Get full booking details with tickets and QR codes
export async function getBookingDetails(bookingId: string): Promise<BookingDetail> {
  const b = queryOne<{
    id: string;
    booking_reference: string;
    event_id: string;
    event_name: string;
    event_date: string;
    start_time: string;
    venue_name: string;
    venue_address: string;
    poster_url: string;
    user_id: string;
    attendee_name: string;
    attendee_email: string;
    subtotal: number;
    convenience_fee: number;
    total_amount: number;
    currency: string;
    payment_status: string;
    booking_status: string;
    created_at: string;
  }>(`
    SELECT 
      b.id,
      b.booking_reference,
      b.event_id,
      e.name AS event_name,
      e.event_date,
      e.start_time,
      v.name AS venue_name,
      v.address AS venue_address,
      e.poster_url,
      b.user_id,
      u.name AS attendee_name,
      u.email AS attendee_email,
      b.subtotal,
      b.convenience_fee,
      b.total_amount,
      b.currency,
      b.payment_status,
      b.booking_status,
      b.created_at
    FROM bookings b
    JOIN events e ON b.event_id = e.id
    JOIN venues v ON e.venue_id = v.id
    JOIN users u ON b.user_id = u.id
    WHERE b.id = ?
  `, [bookingId]);

  if (!b) throw new Error('Booking not found');

  const items = query<{
    id: string;
    seat_id: string;
    seat_label: string;
    section_name: string;
    price: number;
  }>(`
    SELECT id, seat_id, seat_label, section_name, price 
    FROM booking_items 
    WHERE booking_id = ?
  `, [bookingId]);

  const rawTickets = query<{
    id: string;
    ticket_code: string;
    seat_label: string;
    section_name: string;
    attendee_name: string;
    qr_code_data: string;
    status: string;
    checked_in_at: string | null;
  }>(`
    SELECT 
      t.id,
      t.ticket_code,
      t.seat_label,
      t.section_name,
      t.attendee_name,
      t.qr_code_data,
      t.status,
      ci.checked_in_at
    FROM tickets t
    LEFT JOIN check_ins ci ON t.id = ci.ticket_id
    WHERE t.booking_id = ?
  `, [bookingId]);

  // Generate QR Data URLs for tickets
  const tickets = await Promise.all(
    rawTickets.map(async t => {
      let qrDataUrl = '';
      try {
        qrDataUrl = await QRCode.toDataURL(t.qr_code_data, {
          width: 256,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
      } catch (e) {
        console.error('QR code generation failed:', e);
      }

      return {
        id: t.id,
        ticketCode: t.ticket_code,
        seatLabel: t.seat_label,
        sectionName: t.section_name,
        attendeeName: t.attendee_name,
        qrCodeData: qrDataUrl,
        status: t.status,
        checkedInAt: t.checked_in_at || undefined,
      };
    })
  );

  return {
    id: b.id,
    bookingReference: b.booking_reference,
    eventId: b.event_id,
    eventName: b.event_name,
    eventDate: b.event_date,
    startTime: b.start_time,
    venueName: b.venue_name,
    venueAddress: b.venue_address,
    posterUrl: b.poster_url,
    userId: b.user_id,
    attendeeName: b.attendee_name,
    attendeeEmail: b.attendee_email,
    subtotal: b.subtotal,
    convenienceFee: b.convenience_fee,
    totalAmount: b.total_amount,
    currency: b.currency,
    paymentStatus: b.payment_status,
    bookingStatus: b.booking_status,
    createdAt: b.created_at,
    items: items.map(i => ({
      id: i.id,
      seatId: i.seat_id,
      seatLabel: i.seat_label,
      sectionName: i.section_name,
      price: i.price,
    })),
    tickets,
  };
}

// Check in ticket scanned by organizer
export function checkInTicket(
  ticketInput: string,
  organizerUserId: string
): {
  success: boolean;
  status: 'CHECKED_IN' | 'ALREADY_CHECKED_IN' | 'INVALID';
  message: string;
  ticket?: {
    ticketCode: string;
    attendeeName: string;
    seatLabel: string;
    sectionName: string;
    bookingReference: string;
    eventName: string;
    checkedInAt: string;
  };
} {
  return transaction(() => {
    let cleanCode = ticketInput.trim();

    // If input is JSON string from QR code
    if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanCode);
        if (parsed.ticketCode) {
          cleanCode = parsed.ticketCode;
        }
      } catch {
        // ignore parse error, use raw string
      }
    }

    // Lookup ticket
    const ticket = queryOne<{
      id: string;
      ticket_code: string;
      event_id: string;
      event_name: string;
      organizer_id: string;
      seat_label: string;
      section_name: string;
      attendee_name: string;
      booking_reference: string;
      status: string;
      checked_in_at: string | null;
    }>(`
      SELECT 
        t.id,
        t.ticket_code,
        t.event_id,
        e.name AS event_name,
        e.organizer_id,
        t.seat_label,
        t.section_name,
        t.attendee_name,
        b.booking_reference,
        t.status,
        ci.checked_in_at
      FROM tickets t
      JOIN events e ON t.event_id = e.id
      JOIN bookings b ON t.booking_id = b.id
      LEFT JOIN check_ins ci ON t.id = ci.ticket_id
      WHERE t.ticket_code = ? OR t.id = ?
    `, [cleanCode, cleanCode]);

    if (!ticket) {
      return {
        success: false,
        status: 'INVALID',
        message: '✕ Invalid Ticket. No matching ticket record was found.',
      };
    }

    // Verify organizer has rights to this event
    if (ticket.organizer_id !== organizerUserId) {
      return {
        success: false,
        status: 'INVALID',
        message: '✕ Access Denied. This ticket belongs to an event hosted by another organizer.',
      };
    }

    if (ticket.status === 'CHECKED_IN') {
      return {
        success: false,
        status: 'ALREADY_CHECKED_IN',
        message: `⚠ Already Checked In on ${ticket.checked_in_at || 'earlier session'}.`,
        ticket: {
          ticketCode: ticket.ticket_code,
          attendeeName: ticket.attendee_name,
          seatLabel: ticket.seat_label,
          sectionName: ticket.section_name,
          bookingReference: ticket.booking_reference,
          eventName: ticket.event_name,
          checkedInAt: ticket.checked_in_at || new Date().toISOString(),
        },
      };
    }

    // Perform check-in
    const checkInId = `ci_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    run(`
      INSERT INTO check_ins (id, ticket_id, event_id, scanned_by_user_id, checked_in_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `, [checkInId, ticket.id, ticket.event_id, organizerUserId]);

    run(`
      UPDATE tickets 
      SET status = 'CHECKED_IN' 
      WHERE id = ?
    `, [ticket.id]);

    return {
      success: true,
      status: 'CHECKED_IN',
      message: '✓ Ticket Valid — Attendee Checked In Successfully!',
      ticket: {
        ticketCode: ticket.ticket_code,
        attendeeName: ticket.attendee_name,
        seatLabel: ticket.seat_label,
        sectionName: ticket.section_name,
        bookingReference: ticket.booking_reference,
        eventName: ticket.event_name,
        checkedInAt: nowIso,
      },
    };
  });
}
