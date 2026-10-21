import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { BookingDetail } from '../types';
import { TicketCard } from '../components/TicketCard';
import { CheckCircle, Calendar, MapPin, Printer, ArrowRight } from 'lucide-react';

interface BookingConfirmationPageProps {
  booking: BookingDetail;
  onViewMyTickets: () => void;
  onBrowseEvents: () => void;
}

export const BookingConfirmationPage: React.FC<BookingConfirmationPageProps> = ({
  booking,
  onViewMyTickets,
  onBrowseEvents,
}) => {
  useEffect(() => {
    // Fire festive confetti on success
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Success Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 sm:p-8 text-center space-y-3">
        <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle className="w-7 h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Booking Confirmed!
        </h1>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Your payment has been verified by the backend. Your seats are permanently booked and digital entry passes are ready.
        </p>

        <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-emerald-200 text-xs shadow-2xs font-mono">
          <span className="text-slate-500 font-medium">Booking ID:</span>
          <span className="font-bold text-emerald-800 text-sm">{booking.bookingReference}</span>
        </div>
      </div>

      {/* Booking Summary Strip */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-slate-400 block text-[11px]">Event</span>
          <span className="font-bold text-slate-900">{booking.eventName}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Date & Time</span>
          <span className="font-semibold text-slate-800">
            {booking.eventDate} • {booking.startTime}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Seats Booked</span>
          <span className="font-bold text-indigo-600 font-mono">
            {booking.items.map(i => i.seatLabel).join(', ')}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Total Paid</span>
          <span className="font-bold text-slate-900 font-mono tabular-nums text-sm">
            ₹{booking.totalAmount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Digital Tickets generated with QR codes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Your Digital Entrance Tickets</h2>
          <span className="text-xs text-slate-500">
            {booking.tickets.length} pass{booking.tickets.length > 1 ? 'es' : ''} issued
          </span>
        </div>

        <div className="space-y-4">
          {booking.tickets.map(ticket => (
            <TicketCard
              key={ticket.id}
              ticket={{
                ...ticket,
                eventName: booking.eventName,
                eventDate: booking.eventDate,
                startTime: booking.startTime,
                venueName: booking.venueName,
                venueAddress: booking.venueAddress,
                bookingReference: booking.bookingReference,
                status: 'VALID',
              }}
            />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
        <button
          onClick={() => window.print()}
          className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print All Tickets</span>
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onBrowseEvents}
            className="flex-1 sm:flex-none px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Explore More Events
          </button>
          <button
            onClick={onViewMyTickets}
            className="flex-1 sm:flex-none px-5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
          >
            <span>Go to My Tickets</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
