 ReserveSeat — Event Booking & Seat Reservation Syst
 
 Live Demo: https://ticketboking.netlify.app/

A full-stack event booking platform where organizers can create events and seating layouts, while attendees can select seats, reserve them for 10 minutes, complete payment, and receive QR-code tickets.

Features

-  Attendee & Organizer authentication
-  Event creation and management
-  Interactive seat layout and seat selection
-  10-minute temporary seat reservations
-  Double-booking prevention
-  Payment/checkout flow
-  Digital tickets with QR codes
-  QR-based attendee check-in
-  Organizer dashboard with bookings, seats & revenue
-  Booking and attendee management
-  Responsive UI

 Key Engineering Challenge

The main focus of the project is **preventing two users from booking the same seat simultaneously**.

Seats follow a controlled state flow:

```text
AVAILABLE → HELD → BOOKED
              ↓
           EXPIRED
              ↓
          AVAILABLE
```

Seat availability is enforced on the backend/database rather than relying only on frontend state. Temporary holds expire after 10 minutes, after which the seats become available again.

 Tech Stack

- **Frontend:** React, TypeScript, CSS
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **Authentication:** JWT / secure authentication
- **Payments:** Payment gateway
- **Other:** QR Code generation & scanning

> Update the stack above to match the technologies actually used in the final implementation.


 Project Focus

This project was built to explore real-world full-stack concepts including **concurrency, temporary resource locking, database transactions, authentication, payment workflows, and QR-based ticket validation**.

 Live Demo

**https://ticketboking.netlify.app/**
