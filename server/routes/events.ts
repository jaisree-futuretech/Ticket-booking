import express, { Response } from 'express';
import { query, queryOne, run, transaction } from '../db.js';
import { AuthenticatedRequest, optionalAuth, requireAuth, requireOrganizer } from '../auth.js';
import { getEventSeats, holdSeats, releaseAllUserHolds, releaseSeatHold } from '../services/seatService.js';

const router = express.Router();

// List events with search, category filtering, and seat counts
router.get('/', (req, res: Response) => {
  const { search, category, date } = req.query;

  let sql = `
    SELECT 
      e.id,
      e.name,
      e.description,
      e.category,
      e.event_date,
      e.start_time,
      e.end_time,
      e.poster_url,
      e.max_capacity,
      e.status,
      v.name AS venue_name,
      v.city AS venue_city,
      v.address AS venue_address,
      (SELECT MIN(price) FROM sections WHERE event_id = e.id) AS min_price,
      (SELECT MAX(price) FROM sections WHERE event_id = e.id) AS max_price,
      (
        SELECT COUNT(s.id) 
        FROM seats s 
        WHERE s.event_id = e.id AND s.is_blocked = 0
          AND s.id NOT IN (
            SELECT bi.seat_id 
            FROM booking_items bi 
            JOIN bookings b ON bi.booking_id = b.id 
            WHERE b.booking_status = 'CONFIRMED'
          )
      ) AS available_seats_count
    FROM events e
    JOIN venues v ON e.venue_id = v.id
    WHERE e.status = 'PUBLISHED'
  `;

  const params: any[] = [];

  if (search && typeof search === 'string' && search.trim()) {
    sql += ` AND (e.name LIKE ? OR e.description LIKE ? OR v.city LIKE ? OR v.name LIKE ?)`;
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  if (category && typeof category === 'string' && category !== 'All' && category.trim()) {
    sql += ` AND e.category = ?`;
    params.push(category.trim());
  }

  if (date && typeof date === 'string' && date.trim()) {
    sql += ` AND e.event_date >= ?`;
    params.push(date.trim());
  }

  sql += ` ORDER BY e.event_date ASC, e.start_time ASC`;

  const events = query(sql, params);
  return res.json(events);
});

// Get single event details
router.get('/:id', (req, res: Response) => {
  const event = queryOne<{
    id: string;
    organizer_id: string;
    organizer_name: string;
    name: string;
    description: string;
    category: string;
    event_date: string;
    start_time: string;
    end_time: string;
    poster_url: string;
    max_capacity: number;
    booking_start_date: string;
    booking_end_date: string;
    status: string;
    venue_id: string;
    venue_name: string;
    venue_address: string;
    venue_city: string;
    min_price: number;
    max_price: number;
    total_seats: number;
    available_seats: number;
  }>(`
    SELECT 
      e.id,
      e.organizer_id,
      u.name AS organizer_name,
      e.name,
      e.description,
      e.category,
      e.event_date,
      e.start_time,
      e.end_time,
      e.poster_url,
      e.max_capacity,
      e.booking_start_date,
      e.booking_end_date,
      e.status,
      v.id AS venue_id,
      v.name AS venue_name,
      v.address AS venue_address,
      v.city AS venue_city,
      (SELECT MIN(price) FROM sections WHERE event_id = e.id) AS min_price,
      (SELECT MAX(price) FROM sections WHERE event_id = e.id) AS max_price,
      (SELECT COUNT(s.id) FROM seats s WHERE s.event_id = e.id) AS total_seats,
      (
        SELECT COUNT(s.id) 
        FROM seats s 
        WHERE s.event_id = e.id AND s.is_blocked = 0
          AND s.id NOT IN (
            SELECT bi.seat_id 
            FROM booking_items bi 
            JOIN bookings b ON bi.booking_id = b.id 
            WHERE b.booking_status = 'CONFIRMED'
          )
      ) AS available_seats
    FROM events e
    JOIN venues v ON e.venue_id = v.id
    JOIN users u ON e.organizer_id = u.id
    WHERE e.id = ?
  `, [req.params.id]);

  if (!event) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  // Fetch sections
  const sections = query(`
    SELECT id, name, price, color, display_order
    FROM sections
    WHERE event_id = ?
    ORDER BY display_order ASC
  `, [event.id]);

  return res.json({
    ...event,
    sections,
  });
});

// Create event with full seating layout (Organizer only)
router.post('/', requireOrganizer, (req: AuthenticatedRequest, res: Response) => {
  const {
    name,
    description,
    category,
    eventDate,
    startTime,
    endTime,
    venueName,
    venueAddress,
    venueCity,
    posterUrl,
    sections,
  } = req.body;

  if (!name || !eventDate || !startTime || !endTime || !venueName) {
    return res.status(400).json({ error: 'Please provide all required event details.' });
  }

  try {
    const eventId = transaction(() => {
      // 1. Create or link venue
      const venueId = `ven_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      run(`
        INSERT INTO venues (id, name, address, city)
        VALUES (?, ?, ?, ?)
      `, [venueId, venueName, venueAddress || venueName, venueCity || 'Main City']);

      // 2. Insert event
      const newEventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const poster = posterUrl || '/src/assets/images/event_tech_summit_1792576102557.jpg';

      run(`
        INSERT INTO events (
          id, organizer_id, venue_id, name, description, 
          category, event_date, start_time, end_time, 
          poster_url, max_capacity, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PUBLISHED')
      `, [
        newEventId,
        req.user!.id,
        venueId,
        name,
        description || '',
        category || 'Entertainment',
        eventDate,
        startTime,
        endTime,
        poster,
        150,
      ]);

      // 3. Build sections, rows, and seats
      const sectionsConfig = Array.isArray(sections) && sections.length > 0 ? sections : [
        { name: 'VIP Section', price: 1200, color: '#f59e0b', rows: ['A', 'B'], seatsPerRow: 8 },
        { name: 'General Admission', price: 600, color: '#6366f1', rows: ['C', 'D', 'E'], seatsPerRow: 8 },
      ];

      let displayOrder = 1;
      let totalSeatsCreated = 0;

      for (const sec of sectionsConfig) {
        const secId = `sec_${newEventId}_${Math.random().toString(36).substring(2, 6)}`;
        run(`
          INSERT INTO sections (id, event_id, name, price, color, display_order)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [secId, newEventId, sec.name, Number(sec.price) || 500, sec.color || '#6366f1', displayOrder++]);

        let rowOrder = 1;
        const rowLabels: string[] = Array.isArray(sec.rows) ? sec.rows : ['A', 'B'];
        const seatsCount = Number(sec.seatsPerRow) || 8;

        for (const rLabel of rowLabels) {
          const rowId = `row_${secId}_${rLabel}`;
          run(`
            INSERT INTO rows (id, section_id, row_label, row_order)
            VALUES (?, ?, ?, ?)
          `, [rowId, secId, rLabel, rowOrder++]);

          for (let sNum = 1; sNum <= seatsCount; sNum++) {
            const seatId = `seat_${rowId}_${sNum}`;
            const seatLabel = `${rLabel}${sNum}`;
            run(`
              INSERT INTO seats (id, event_id, section_id, row_id, seat_number, seat_label, is_blocked)
              VALUES (?, ?, ?, ?, ?, ?, 0)
            `, [seatId, newEventId, secId, rowId, sNum, seatLabel]);
            totalSeatsCreated++;
          }
        }
      }

      // Update max capacity to match total created seats
      run('UPDATE events SET max_capacity = ? WHERE id = ?', [totalSeatsCreated, newEventId]);

      return newEventId;
    });

    return res.status(201).json({ id: eventId, message: 'Event and seating layout created successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create event.' });
  }
});

// Update event details (Organizer only)
router.put('/:id', requireOrganizer, (req: AuthenticatedRequest, res: Response) => {
  const { name, description, category, eventDate, startTime, endTime, status } = req.body;
  const event = queryOne('SELECT organizer_id FROM events WHERE id = ?', [req.params.id]);

  if (!event) return res.status(404).json({ error: 'Event not found.' });
  if (event.organizer_id !== req.user!.id) {
    return res.status(403).json({ error: 'You are not authorized to edit this event.' });
  }

  run(`
    UPDATE events
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        event_date = COALESCE(?, event_date),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        status = COALESCE(?, status)
    WHERE id = ?
  `, [name, description, category, eventDate, startTime, endTime, status, req.params.id]);

  return res.json({ message: 'Event updated successfully.' });
});

// Get authoritative interactive seat map for an event
router.get('/:id/seats', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user?.id;
  try {
    const seats = getEventSeats(req.params.id, currentUserId);
    return res.json(seats);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error fetching seats' });
  }
});

// Reserve / Hold seats with 10-minute hold window and concurrency protection
router.post('/:id/holds', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { seatIds, sessionId } = req.body;
  const userId = req.user!.id;
  const eventId = req.params.id;

  if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
    return res.status(400).json({ error: 'Please select one or more seats to hold.' });
  }

  try {
    const holdResult = holdSeats(eventId, seatIds, userId, sessionId);
    return res.json(holdResult);
  } catch (err: any) {
    // 409 Conflict if reserved by another attendee or already booked
    return res.status(409).json({ error: err.message || 'Seat reservation conflict occurred.' });
  }
});

// Release user holds for an event
router.delete('/:id/holds', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const count = releaseAllUserHolds(req.params.id, userId);
  return res.json({ message: `Released ${count} seat holds.` });
});

// Release a specific seat hold
router.delete('/holds/:seatId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const released = releaseSeatHold(req.params.seatId, userId);
  return res.json({ success: released });
});

export default router;
