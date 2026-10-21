import React, { useEffect, useState } from 'react';
import { TicketItem } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { TicketCard } from '../components/TicketCard';
import { 
  Ticket, 
  History, 
  User, 
  Calendar, 
  MapPin, 
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface AttendeeDashboardPageProps {
  initialTab?: 'tickets' | 'history' | 'profile';
  onSelectEvent: (eventId: string) => void;
  onViewBooking: (bookingId: string) => void;
}

export const AttendeeDashboardPage: React.FC<AttendeeDashboardPageProps> = ({
  initialTab = 'tickets',
  onSelectEvent,
  onViewBooking,
}) => {
  const { user, switchDemo } = useAuth();
  const [activeTab, setActiveTab] = useState<'tickets' | 'history' | 'profile'>(initialTab);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [ticketsData, bookingsData] = await Promise.all([
          api.getMyTickets(),
          api.getMyBookings(),
        ]);
        setTickets(ticketsData);
        setBookings(bookingsData);
      } catch (err) {
        console.error('Failed to load attendee data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Profile Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Attendee Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your booked events, scannable entrance passes, and order history.
          </p>
        </div>

        {/* Tab Controls (Segmented Control adhering to Zero-Pill rules) */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'tickets'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>My Tickets ({tickets.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Booking History ({bookings.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
          <p className="text-sm font-medium">Loading your dashboard...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: UPCOMING TICKETS */}
          {activeTab === 'tickets' && (
            <div className="space-y-4">
              {tickets.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-md mx-auto">
                  <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-900 mb-1">No tickets yet</h3>
                  <p className="text-xs text-slate-500 mb-4">
                    You haven't reserved or booked tickets for any upcoming events.
                  </p>
                  <button
                    onClick={() => onSelectEvent('')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Browse Events & Book Seats
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {tickets.map(ticket => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BOOKING HISTORY */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              {bookings.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No previous bookings found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                      <tr>
                        <th className="py-3 px-4">Booking Ref</th>
                        <th className="py-3 px-4">Event</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Seats</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bookings.map(b => (
                        <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {b.booking_reference}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {b.event_name}
                            <div className="text-[11px] text-slate-400 font-normal">
                              {b.venue_name}, {b.venue_city}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {b.event_date}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-700">
                            {b.seats_list || `${b.seat_count} seats`}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                            ₹{b.total_amount?.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              b.payment_status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {b.payment_status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => onViewBooking(b.id)}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                            >
                              <span>View Tickets</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROFILE */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs max-w-xl mx-auto space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Account Profile</h3>
                <p className="text-xs text-slate-500">Your attendee information and role assignment.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    disabled
                    value={user?.name || ''}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Email Address</label>
                  <input
                    type="text"
                    disabled
                    value={user?.email || ''}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Current Role</label>
                  <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-xs font-bold font-mono">
                    {user?.role}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 mb-2">Evaluation Switcher</h4>
                <p className="text-[11px] text-slate-500 mb-3">
                  Quickly switch between attendee accounts to test concurrency locks, or switch to organizer mode to check in tickets.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => switchDemo('ORGANIZER', 'organizer@eventflow.com')}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
                  >
                    Switch to Organizer (Sarah)
                  </button>
                  <button
                    onClick={() => switchDemo('ATTENDEE', 'attendee2@eventflow.com')}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-200"
                  >
                    Switch to Attendee 2 (Jordan)
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
