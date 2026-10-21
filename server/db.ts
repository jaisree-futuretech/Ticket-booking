import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

let db: Database;
let inTransaction = false;
const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'database.sqlite');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Save database to disk
export function saveDatabase() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Error saving SQLite database to disk:', err);
  }
}

// Database query helpers
export function query<T = any>(sql: string, params: any[] = []): T[] {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return rows;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const rows = query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function run(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number } {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  if (!inTransaction) {
    saveDatabase();
  }
  const lastIdRes = query<{ id: number }>('SELECT last_insert_rowid() AS id');
  const lastInsertRowid = lastIdRes.length > 0 ? lastIdRes[0].id : 0;
  const changesRes = query<{ changes: number }>('SELECT changes() AS changes');
  const changes = changesRes.length > 0 ? changesRes[0].changes : 0;
  return { changes, lastInsertRowid };
}

// Transaction helper ensuring synchronous atomicity & re-entrancy
export function transaction<T>(fn: () => T): T {
  if (!db) throw new Error('Database not initialized');
  if (inTransaction) {
    return fn();
  }

  inTransaction = true;
  db.run('BEGIN TRANSACTION;');
  try {
    const result = fn();
    db.run('COMMIT;');
    inTransaction = false;
    saveDatabase();
    return result;
  } catch (err) {
    try {
      db.run('ROLLBACK;');
    } catch {
      // ignore if rollback already occurred
    }
    inTransaction = false;
    throw err;
  }
}

// Initialize database schema and initial data
export async function initDatabase(): Promise<Database> {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
      console.log('Loaded existing database from', DB_FILE);
    } catch (e) {
      console.warn('Failed to load existing database file, creating fresh one:', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ORGANIZER', 'ATTENDEE')),
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS venues (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 500,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      organizer_id TEXT NOT NULL,
      venue_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      event_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      poster_url TEXT,
      max_capacity INTEGER NOT NULL DEFAULT 100,
      booking_start_date TEXT,
      booking_end_date TEXT,
      status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK(status IN ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organizer_id) REFERENCES users(id),
      FOREIGN KEY (venue_id) REFERENCES venues(id)
    );

    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366f1',
      display_order INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rows (
      id TEXT PRIMARY KEY,
      section_id TEXT NOT NULL,
      row_label TEXT NOT NULL,
      row_order INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS seats (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      section_id TEXT NOT NULL,
      row_id TEXT NOT NULL,
      seat_number INTEGER NOT NULL,
      seat_label TEXT NOT NULL,
      is_blocked INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(event_id, seat_label),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
      FOREIGN KEY (row_id) REFERENCES rows(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS seat_holds (
      id TEXT PRIMARY KEY,
      seat_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      held_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'EXPIRED', 'RELEASED', 'CONVERTED')),
      FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      booking_reference TEXT UNIQUE NOT NULL,
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      subtotal REAL NOT NULL,
      convenience_fee REAL NOT NULL,
      total_amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
      booking_status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK(booking_status IN ('CONFIRMED', 'CANCELLED')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS booking_items (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      seat_id TEXT NOT NULL,
      section_id TEXT NOT NULL,
      price REAL NOT NULL,
      seat_label TEXT NOT NULL,
      section_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (seat_id) REFERENCES seats(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      transaction_ref TEXT UNIQUE NOT NULL,
      payment_method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'SUCCESS', 'FAILED')),
      verified_at DATETIME,
      failure_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      seat_id TEXT NOT NULL,
      ticket_code TEXT UNIQUE NOT NULL,
      seat_label TEXT NOT NULL,
      section_name TEXT NOT NULL,
      attendee_name TEXT NOT NULL,
      attendee_email TEXT NOT NULL,
      qr_code_data TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'VALID' CHECK(status IN ('VALID', 'CHECKED_IN', 'CANCELLED')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (seat_id) REFERENCES seats(id)
    );

    CREATE TABLE IF NOT EXISTS check_ins (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      scanned_by_user_id TEXT NOT NULL,
      checked_in_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (scanned_by_user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_seat_holds_seat_active ON seat_holds(seat_id, status, expires_at);
    CREATE INDEX IF NOT EXISTS idx_seat_holds_user ON seat_holds(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_booking_items_seat ON booking_items(seat_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(ticket_code);
  `);

  // Seed initial data if database is empty
  seedInitialData();

  saveDatabase();
  return db;
}

function seedInitialData() {
  const usersCount = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users');
  if (usersCount && usersCount.count > 0) {
    return; // Already seeded
  }

  console.log('Seeding initial data for event booking platform...');

  const passwordHash = bcrypt.hashSync('password123', 10);

  // Seed Users
  run(`
    INSERT INTO users (id, name, email, password_hash, role) VALUES
    ('usr_organizer_1', 'Sarah Jenkins', 'organizer@eventflow.com', ?, 'ORGANIZER'),
    ('usr_attendee_1', 'Alex Rivera', 'attendee@eventflow.com', ?, 'ATTENDEE'),
    ('usr_attendee_2', 'Jordan Lee', 'attendee2@eventflow.com', ?, 'ATTENDEE')
  `, [passwordHash, passwordHash, passwordHash]);

  // Seed Venues
  run(`
    INSERT INTO venues (id, name, address, city, capacity) VALUES
    ('ven_trade_centre', 'Chennai Trade & Exhibition Centre', 'Nandambakkam, Mount Poonamallee Road', 'Chennai', 850),
    ('ven_symphony_hall', 'St. Andrew Grand Philharmonic Hall', 'Victoria Auditorium Crescent', 'Bengaluru', 600),
    ('ven_broken_brick', 'The Broken Brick Comedy Theatre', '12 Khar West Lane', 'Mumbai', 180),
    ('ven_arena_live', 'SuperDome Arena Complex', 'Sector 21 Stadium Boulevard', 'New Delhi', 1200)
  `);

  // Seed Events
  run(`
    INSERT INTO events (id, organizer_id, venue_id, name, description, category, event_date, start_time, end_time, poster_url, max_capacity, booking_start_date, booking_end_date, status) VALUES
    ('evt_tech_conf_2027', 'usr_organizer_1', 'ven_trade_centre', 'Global Tech Summit 2027', 
     'The premier annual technology leadership gathering focusing on distributed systems, modern AI engineering, and cloud platforms. Features 24 keynote speakers, interactive developer roundtables, and VIP networking lounges.',
     'Technology', '2027-03-15', '09:00 AM', '06:00 PM', 
     '/src/assets/images/event_tech_summit_1792576102557.jpg', 
     120, '2026-10-01', '2027-03-14', 'PUBLISHED'),
    
    ('evt_symphony_gala', 'usr_organizer_1', 'ven_symphony_hall', 'Royal Philharmonic: Nocturne In Gold',
     'An enchanting evening of Tchaikovsky and Rachmaninoff performed by the 80-piece Royal Philharmonic Orchestra under guest conductor Maestro Christopher Rossi.',
     'Music', '2027-04-08', '07:30 PM', '10:00 PM',
     '/src/assets/images/event_symphony_1792576119533.jpg',
     90, '2026-10-15', '2027-04-07', 'PUBLISHED'),
     
    ('evt_comedy_night', 'usr_organizer_1', 'ven_broken_brick', 'Unfiltered: Stand-up All-Stars Special',
     'A riotous showcase of top touring stand-up comedians delivering punchy, unfiltered comedy sets in an intimate cabaret theater setting.',
     'Comedy', '2027-03-28', '08:00 PM', '10:30 PM',
     '/src/assets/images/event_standup_1792576135079.jpg',
     60, '2026-10-10', '2027-03-27', 'PUBLISHED'),
     
    ('evt_rock_arena', 'usr_organizer_1', 'ven_arena_live', 'Prism Horizon World Tour',
     'Electrifying stadium arena rock concert with laser pyrotechnics, immersive audio visual production, and opening sets by international indie chart-toppers.',
     'Music', '2027-05-20', '07:00 PM', '11:00 PM',
     '/src/assets/images/event_rock_arena_1792576150003.jpg',
     150, '2026-10-20', '2027-05-19', 'PUBLISHED')
  `);

  // Build Seating for Tech Conference
  buildEventSeating('evt_tech_conf_2027', [
    { name: 'VIP Front Row', price: 1499, color: '#f59e0b', rows: ['A', 'B'], seatsPerRow: 10 },
    { name: 'Executive Premium', price: 999, color: '#6366f1', rows: ['C', 'D', 'E'], seatsPerRow: 10 },
    { name: 'Standard General', price: 499, color: '#10b981', rows: ['F', 'G', 'H'], seatsPerRow: 10 }
  ]);

  // Build Seating for Symphony Gala
  buildEventSeating('evt_symphony_gala', [
    { name: 'Orchestra Stalls (VIP)', price: 1999, color: '#d97706', rows: ['A', 'B'], seatsPerRow: 8 },
    { name: 'Mezzanine Tier', price: 1199, color: '#8b5cf6', rows: ['C', 'D'], seatsPerRow: 8 },
    { name: 'Balcony Promenade', price: 699, color: '#06b6d4', rows: ['E', 'F'], seatsPerRow: 8 }
  ]);

  // Build Seating for Comedy Night
  buildEventSeating('evt_comedy_night', [
    { name: 'Front Table VIP', price: 799, color: '#ef4444', rows: ['A', 'B'], seatsPerRow: 6 },
    { name: 'Club Lounge', price: 499, color: '#3b82f6', rows: ['C', 'D'], seatsPerRow: 8 }
  ]);

  // Build Seating for Rock Arena
  buildEventSeating('evt_rock_arena', [
    { name: 'Golden Circle (Stage Front)', price: 2499, color: '#ec4899', rows: ['A', 'B'], seatsPerRow: 12 },
    { name: 'Lower Tier Reserved', price: 1299, color: '#8b5cf6', rows: ['C', 'D', 'E'], seatsPerRow: 12 },
    { name: 'Upper Bowl General', price: 699, color: '#10b981', rows: ['F', 'G'], seatsPerRow: 12 }
  ]);

  // Block a couple seats for soundboard / technical obstruction
  run(`UPDATE seats SET is_blocked = 1 WHERE event_id = 'evt_tech_conf_2027' AND seat_label IN ('VIP-B1', 'General-H10')`);

  // Seed a demo confirmed booking for Alex Rivera so attendee dashboard has real data right away
  seedDemoBooking();
}

function buildEventSeating(
  eventId: string,
  sectionsConfig: Array<{ name: string; price: number; color: string; rows: string[]; seatsPerRow: number }>
) {
  let displayOrder = 1;
  for (const sec of sectionsConfig) {
    const secId = `sec_${eventId}_${sec.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    run(`
      INSERT INTO sections (id, event_id, name, price, color, display_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [secId, eventId, sec.name, sec.price, sec.color, displayOrder++]);

    let rowOrder = 1;
    for (const rLabel of sec.rows) {
      const rowId = `row_${secId}_${rLabel}`;
      run(`
        INSERT INTO rows (id, section_id, row_label, row_order)
        VALUES (?, ?, ?, ?)
      `, [rowId, secId, rLabel, rowOrder++]);

      for (let sNum = 1; sNum <= sec.seatsPerRow; sNum++) {
        const seatId = `seat_${rowId}_${sNum}`;
        const seatLabel = `${rLabel}${sNum}`;
        run(`
          INSERT INTO seats (id, event_id, section_id, row_id, seat_number, seat_label, is_blocked)
          VALUES (?, ?, ?, ?, ?, ?, 0)
        `, [seatId, eventId, secId, rowId, sNum, seatLabel]);
      }
    }
  }
}

function seedDemoBooking() {
  const bookingId = 'bk_demo_001';
  const bookingRef = 'EVT-8F92K1';
  const eventId = 'evt_tech_conf_2027';
  const userId = 'usr_attendee_1';

  // Find seats A4 and A5
  const seats = query<{ id: string; section_id: string; seat_label: string }>(`
    SELECT s.id, s.section_id, s.seat_label 
    FROM seats s 
    WHERE s.event_id = ? AND s.seat_label IN ('A4', 'A5')
  `, [eventId]);

  if (seats.length < 2) return;

  const subtotal = 1499 * 2;
  const fee = 100;
  const total = subtotal + fee;

  run(`
    INSERT INTO bookings (id, booking_reference, event_id, user_id, subtotal, convenience_fee, total_amount, currency, payment_status, booking_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'INR', 'PAID', 'CONFIRMED')
  `, [bookingId, bookingRef, eventId, userId, subtotal, fee, total]);

  for (const s of seats) {
    const itemId = `bki_${bookingId}_${s.id}`;
    run(`
      INSERT INTO booking_items (id, booking_id, seat_id, section_id, price, seat_label, section_name)
      VALUES (?, ?, ?, ?, 1499, ?, 'VIP Front Row')
    `, [itemId, bookingId, s.id, s.section_id, s.seat_label]);

    const ticketId = `tck_${bookingId}_${s.id}`;
    const ticketCode = `TCK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const qrData = JSON.stringify({
      ticketCode,
      bookingRef,
      eventId,
      seat: s.seat_label,
      attendee: 'Alex Rivera'
    });

    run(`
      INSERT INTO tickets (id, booking_id, event_id, user_id, seat_id, ticket_code, seat_label, section_name, attendee_name, attendee_email, qr_code_data, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'VIP Front Row', 'Alex Rivera', 'attendee@eventflow.com', ?, 'VALID')
    `, [ticketId, bookingId, eventId, userId, s.id, ticketCode, s.seat_label, qrData]);
  }

  // Payment record
  run(`
    INSERT INTO payments (id, booking_id, amount, currency, transaction_ref, payment_method, status, verified_at)
    VALUES ('pay_demo_001', ?, ?, 'INR', 'TXN-TEST-778899', 'TEST_CARD', 'SUCCESS', CURRENT_TIMESTAMP)
  `, [bookingId, total]);
}
