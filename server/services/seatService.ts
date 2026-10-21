import { query, queryOne, run, transaction } from '../db.js';

export interface SeatStatusInfo {
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
  status: 'AVAILABLE' | 'HELD' | 'HELD_BY_ME' | 'BOOKED' | 'UNAVAILABLE';
  isBlocked: boolean;
  holdExpiresAt?: string | null;
  remainingSeconds?: number;
}

// Sweep expired holds so that available seats immediately open up
export function cleanupExpiredHolds(): number {
  const result = run(`
    UPDATE seat_holds
    SET status = 'EXPIRED'
    WHERE status = 'ACTIVE' AND expires_at <= datetime('now')
  `);
  return result.changes;
}

// Get all seats with real-time authoritative status from backend
export function getEventSeats(eventId: string, currentUserId?: string): SeatStatusInfo[] {
  // Always sweep expired holds first
  cleanupExpiredHolds();

  const seats = query<{
    id: string;
    event_id: string;
    section_id: string;
    section_name: string;
    section_price: number;
    section_color: string;
    row_id: string;
    row_label: string;
    seat_number: number;
    seat_label: string;
    is_blocked: number;
    booked_booking_id: string | null;
    hold_id: string | null;
    hold_user_id: string | null;
    hold_expires_at: string | null;
    current_time_str: string;
  }>(`
    SELECT 
      s.id,
      s.event_id,
      s.section_id,
      sec.name AS section_name,
      sec.price AS section_price,
      sec.color AS section_color,
      s.row_id,
      r.row_label,
      s.seat_number,
      s.seat_label,
      s.is_blocked,
      (
        SELECT b.id 
        FROM booking_items bi 
        JOIN bookings b ON bi.booking_id = b.id 
        WHERE bi.seat_id = s.id AND b.booking_status = 'CONFIRMED'
        LIMIT 1
      ) AS booked_booking_id,
      sh.id AS hold_id,
      sh.user_id AS hold_user_id,
      sh.expires_at AS hold_expires_at,
      datetime('now') AS current_time_str
    FROM seats s
    JOIN sections sec ON s.section_id = sec.id
    JOIN rows r ON s.row_id = r.id
    LEFT JOIN seat_holds sh ON (
      sh.seat_id = s.id 
      AND sh.status = 'ACTIVE' 
      AND sh.expires_at > datetime('now')
    )
    WHERE s.event_id = ?
    ORDER BY sec.display_order ASC, r.row_order ASC, s.seat_number ASC
  `, [eventId]);

  const nowMs = Date.now();

  return seats.map(s => {
    let status: 'AVAILABLE' | 'HELD' | 'HELD_BY_ME' | 'BOOKED' | 'UNAVAILABLE';

    if (s.is_blocked === 1) {
      status = 'UNAVAILABLE';
    } else if (s.booked_booking_id) {
      status = 'BOOKED';
    } else if (s.hold_id && s.hold_user_id) {
      if (currentUserId && s.hold_user_id === currentUserId) {
        status = 'HELD_BY_ME';
      } else {
        status = 'HELD';
      }
    } else {
      status = 'AVAILABLE';
    }

    let remainingSeconds = 0;
    if (s.hold_expires_at) {
      // Calculate remaining seconds
      const expiryMs = new Date(s.hold_expires_at.replace(' ', 'T') + 'Z').getTime();
      remainingSeconds = Math.max(0, Math.floor((expiryMs - nowMs) / 1000));
      // Fallback if formatting variance
      if (isNaN(remainingSeconds) || remainingSeconds <= 0) {
        remainingSeconds = 600; // default to 10 min window if parsing edge case
      }
    }

    return {
      id: s.id,
      eventId: s.event_id,
      sectionId: s.section_id,
      sectionName: s.section_name,
      sectionPrice: s.section_price,
      sectionColor: s.section_color,
      rowId: s.row_id,
      rowLabel: s.row_label,
      seatNumber: s.seat_number,
      seatLabel: s.seat_label,
      status,
      isBlocked: s.is_blocked === 1,
      holdExpiresAt: s.hold_expires_at,
      remainingSeconds: status === 'HELD_BY_ME' ? remainingSeconds : undefined,
    };
  });
}

// Concurrency-safe atomic seat holding with 10-minute hold window
export function holdSeats(
  eventId: string,
  seatIds: string[],
  userId: string,
  sessionId: string = 'session_default'
): { success: boolean; heldSeats: string[]; expiresAt: string; remainingSeconds: number } {
  if (!seatIds || seatIds.length === 0) {
    throw new Error('No seats specified for hold');
  }

  // Atomically process hold inside a transaction
  return transaction(() => {
    // 1. Sweep expired holds
    cleanupExpiredHolds();

    // 2. Verify all seats exist for this event
    const placeholders = seatIds.map(() => '?').join(',');
    const seats = query<{ id: string; seat_label: string; is_blocked: number }>(`
      SELECT id, seat_label, is_blocked 
      FROM seats 
      WHERE event_id = ? AND id IN (${placeholders})
    `, [eventId, ...seatIds]);

    if (seats.length !== seatIds.length) {
      throw new Error('One or more selected seats were not found for this event');
    }

    // Check blocked seats
    for (const seat of seats) {
      if (seat.is_blocked === 1) {
        throw new Error(`Seat ${seat.seat_label} is blocked and unavailable for booking.`);
      }
    }

    // 3. Concurrency check: Ensure none of the seats are booked
    for (const seat of seats) {
      const booked = queryOne<{ id: string }>(`
        SELECT b.id 
        FROM booking_items bi 
        JOIN bookings b ON bi.booking_id = b.id 
        WHERE bi.seat_id = ? AND b.booking_status = 'CONFIRMED'
        LIMIT 1
      `, [seat.id]);

      if (booked) {
        throw new Error(`Sorry, seat ${seat.seat_label} has already been booked.`);
      }
    }

    // 4. Concurrency check: Ensure none of the seats are held by someone else
    for (const seat of seats) {
      const existingHold = queryOne<{ id: string; user_id: string; expires_at: string }>(`
        SELECT id, user_id, expires_at 
        FROM seat_holds 
        WHERE seat_id = ? AND status = 'ACTIVE' AND expires_at > datetime('now')
        LIMIT 1
      `, [seat.id]);

      if (existingHold) {
        if (existingHold.user_id !== userId) {
          throw new Error(`Sorry, seat ${seat.seat_label} was just reserved by another attendee.`);
        }
      }
    }

    // 5. Expiration time: exactly 10 minutes from now (600 seconds)
    const expiresAtRes = queryOne<{ expiry: string }>(`
      SELECT datetime('now', '+10 minutes') AS expiry
    `);
    const expiresAt = expiresAtRes ? expiresAtRes.expiry : new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // 6. Create or refresh holds for requested seats
    for (const seat of seats) {
      // Mark any prior hold for this user & seat as replaced
      run(`
        UPDATE seat_holds 
        SET status = 'RELEASED' 
        WHERE seat_id = ? AND user_id = ? AND status = 'ACTIVE'
      `, [seat.id, userId]);

      const holdId = `hold_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      run(`
        INSERT INTO seat_holds (id, seat_id, event_id, user_id, session_id, held_at, expires_at, status)
        VALUES (?, ?, ?, ?, ?, datetime('now'), ?, 'ACTIVE')
      `, [holdId, seat.id, eventId, userId, sessionId, expiresAt]);
    }

    return {
      success: true,
      heldSeats: seatIds,
      expiresAt,
      remainingSeconds: 600,
    };
  });
}

// Release hold for a specific seat
export function releaseSeatHold(seatId: string, userId: string): boolean {
  return transaction(() => {
    const result = run(`
      UPDATE seat_holds 
      SET status = 'RELEASED' 
      WHERE seat_id = ? AND user_id = ? AND status = 'ACTIVE'
    `, [seatId, userId]);
    return result.changes > 0;
  });
}

// Release all holds of a user for an event
export function releaseAllUserHolds(eventId: string, userId: string): number {
  return transaction(() => {
    const result = run(`
      UPDATE seat_holds 
      SET status = 'RELEASED' 
      WHERE event_id = ? AND user_id = ? AND status = 'ACTIVE'
    `, [eventId, userId]);
    return result.changes;
  });
}
