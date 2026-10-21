import React, { useEffect, useState, useCallback } from 'react';
import { EventItem, SeatItem, BookingSummary } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { SeatMap } from '../components/SeatMap';
import { SeatHoldTimer } from '../components/SeatHoldTimer';
import { PaymentModal } from '../components/PaymentModal';
import { 
  ArrowLeft, 
  AlertCircle, 
  ShieldAlert, 
  CreditCard, 
  RefreshCw, 
  Trash2,
  Loader2,
  Info
} from 'lucide-react';

interface SeatSelectionPageProps {
  eventId: string;
  onBack: () => void;
  onBookingConfirmed: (bookingDetail: any) => void;
}

export const SeatSelectionPage: React.FC<SeatSelectionPageProps> = ({
  eventId,
  onBack,
  onBookingConfirmed,
}) => {
  const { user } = useAuth();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [seats, setSeats] = useState<SeatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [holdingLoading, setHoldingLoading] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Selected seats by user
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [activeHoldSeconds, setActiveHoldSeconds] = useState<number | null>(null);

  // Checkout order
  const [pendingOrder, setPendingOrder] = useState<BookingSummary | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Fetch seats authoritative from backend
  const refreshSeats = useCallback(async () => {
    try {
      const seatsData = await api.getSeats(eventId);
      setSeats(seatsData);

      // Check if current user already has active holds on this event
      const myHeldSeats = seatsData.filter(s => s.status === 'HELD_BY_ME');
      if (myHeldSeats.length > 0) {
        setSelectedSeatIds(myHeldSeats.map(s => s.id));
        const minRemaining = Math.min(...myHeldSeats.map(s => s.remainingSeconds || 600));
        setActiveHoldSeconds(minRemaining > 0 ? minRemaining : 600);
      }
    } catch (err) {
      console.error('Failed to load seats:', err);
    }
  }, [eventId]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [eventData] = await Promise.all([
          api.getEvent(eventId),
          refreshSeats(),
        ]);
        setEvent(eventData);
      } finally {
        setLoading(false);
      }
    }
    init();

    // Auto-refresh seat availability every 8 seconds to catch concurrent holds by other attendees
    const interval = setInterval(() => {
      refreshSeats();
    }, 8000);

    return () => clearInterval(interval);
  }, [eventId, refreshSeats]);

  // Handle seat click
  const handleToggleSeat = async (seat: SeatItem) => {
    setConflictError(null);

    const isAlreadySelected = selectedSeatIds.includes(seat.id);
    let newSelection: string[];

    if (isAlreadySelected) {
      // Unselect
      newSelection = selectedSeatIds.filter(id => id !== seat.id);
      setSelectedSeatIds(newSelection);

      // Release hold on backend
      try {
        await api.releaseSeatHold(seat.id);
        await refreshSeats();
      } catch (err) {
        console.warn('Error releasing hold:', err);
      }

      if (newSelection.length === 0) {
        setActiveHoldSeconds(null);
      }
    } else {
      // User is selecting an available seat
      newSelection = [...selectedSeatIds, seat.id];
      setSelectedSeatIds(newSelection);
      setHoldingLoading(true);

      try {
        // ATOMIC BACKEND HOLD WITH CONCURRENCY CHECK
        const holdResult = await api.holdSeats(eventId, newSelection);
        setActiveHoldSeconds(holdResult.remainingSeconds || 600);
        await refreshSeats();
      } catch (err: any) {
        // CONCURRENCY COLLISION OR EXPIRED:
        // Example: "Sorry, seat A12 was just reserved by another attendee."
        setConflictError(err.message || 'Seat could not be held. Please choose another seat.');
        // Revert selection and sync fresh authoritative state
        setSelectedSeatIds(selectedSeatIds);
        await refreshSeats();
      } finally {
        setHoldingLoading(false);
      }
    }
  };

  // Clear all held seats
  const handleClearSelection = async () => {
    setSelectedSeatIds([]);
    setActiveHoldSeconds(null);
    setConflictError(null);
    try {
      await api.releaseEventHolds(eventId);
      await refreshSeats();
    } catch (err) {
      console.warn('Error releasing holds:', err);
    }
  };

  // Hold timer expiration
  const handleTimerExpired = () => {
    setConflictError('Your 10-minute seat reservation has expired. The seats have been released for other attendees.');
    setSelectedSeatIds([]);
    setActiveHoldSeconds(null);
    refreshSeats();
  };

  // Proceed to payment checkout
  const handleProceedToCheckout = async () => {
    if (selectedSeatIds.length === 0) return;
    setHoldingLoading(true);
    setConflictError(null);

    try {
      // Server creates pending booking and calculates authoritative prices directly from DB
      const order = await api.createBookingOrder(eventId, selectedSeatIds);
      setPendingOrder(order);
      setShowPaymentModal(true);
    } catch (err: any) {
      setConflictError(err.message || 'Unable to proceed to checkout. Please verify your seat selection.');
      await refreshSeats();
    } finally {
      setHoldingLoading(false);
    }
  };

  // Selected seat details
  const selectedSeatsList = seats.filter(s => selectedSeatIds.includes(s.id));
  const subtotal = selectedSeatsList.reduce((sum, s) => sum + s.sectionPrice, 0);
  const convenienceFee = selectedSeatsList.length * 50;
  const grandTotal = subtotal + convenienceFee;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium">Loading interactive seat map & live reservation engine...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">{event?.name}</h1>
            <p className="text-xs text-slate-500">
              {event?.event_date} • {event?.venue_name}, {event?.venue_city}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button
            onClick={() => refreshSeats()}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Live Map</span>
          </button>
        </div>
      </div>

      {/* Double Booking / Concurrency Error Notification */}
      {conflictError && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-3 text-rose-900 animate-in fade-in slide-in-from-top-2">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-rose-800 text-sm mb-0.5">Seat Reservation Notice</h4>
            <p className="leading-relaxed">{conflictError}</p>
          </div>
          <button
            onClick={() => setConflictError(null)}
            className="text-xs text-rose-600 hover:text-rose-900 font-semibold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Interactive Seat Map (Left/Center) + Booking Summary Sidebar (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Seat Map Column */}
        <div className="lg:col-span-2 space-y-4">
          <SeatMap
            seats={seats}
            selectedSeatIds={selectedSeatIds}
            onToggleSeat={handleToggleSeat}
          />
        </div>

        {/* Booking Summary & Hold Timer Sidebar */}
        <div className="space-y-4">
          {/* Active 10-Minute Hold Countdown */}
          {activeHoldSeconds !== null && selectedSeatIds.length > 0 && (
            <SeatHoldTimer
              initialSeconds={activeHoldSeconds}
              onExpire={handleTimerExpired}
            />
          )}

          {/* Selected Seats Summary Box */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Selected Seats</h3>
              {selectedSeatIds.length > 0 && (
                <button
                  onClick={handleClearSelection}
                  className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {selectedSeatsList.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <Info className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">No seats selected yet.</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Click on any available white seat on the map to place an exclusive 10-minute hold.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* List of seats */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedSeatsList.map(s => (
                    <div
                      key={s.id}
                      className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 font-mono">Seat {s.seatLabel}</span>
                        <span className="text-slate-400 ml-2 text-[11px]">({s.sectionName})</span>
                      </div>
                      <div className="font-bold text-slate-900 font-mono tabular-nums">
                        ₹{s.sectionPrice.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Calculation Breakdown */}
                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal ({selectedSeatsList.length} seats)</span>
                    <span className="font-mono tabular-nums">₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Convenience Fee (₹50 / seat)</span>
                    <span className="font-mono tabular-nums">₹{convenienceFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Total Amount</span>
                    <span className="font-mono tabular-nums text-indigo-600">
                      ₹{grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Checkout CTA */}
                <button
                  type="button"
                  disabled={holdingLoading}
                  onClick={handleProceedToCheckout}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 mt-4"
                >
                  {holdingLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Locking seats & preparing checkout...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Proceed to Payment</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Gateway Modal */}
      {showPaymentModal && pendingOrder && (
        <PaymentModal
          order={pendingOrder}
          onSuccess={confirmedBooking => {
            setShowPaymentModal(false);
            onBookingConfirmed(confirmedBooking);
          }}
          onCancel={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
};
