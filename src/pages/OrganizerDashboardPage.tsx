import React, { useEffect, useState } from 'react';
import { OrganizerAnalytics } from '../types';
import { api } from '../api/client';
import { 
  Calendar, 
  Ticket, 
  DollarSign, 
  QrCode, 
  TrendingUp, 
  CheckCircle, 
  PlusCircle, 
  Search, 
  ExternalLink,
  Loader2,
  Users
} from 'lucide-react';

interface OrganizerDashboardPageProps {
  onNavigate: (view: string, param?: string) => void;
}

export const OrganizerDashboardPage: React.FC<OrganizerDashboardPageProps> = ({ onNavigate }) => {
  const [analytics, setAnalytics] = useState<OrganizerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingSearch, setBookingSearch] = useState('');

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      try {
        const data = await api.getOrganizerAnalytics();
        setAnalytics(data);
      } catch (err) {
        console.error('Failed to load organizer analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium">Loading real-time organizer metrics...</p>
      </div>
    );
  }

  const filteredBookings = (analytics?.recentBookings || []).filter(b => {
    const term = bookingSearch.toLowerCase();
    return (
      b.booking_reference.toLowerCase().includes(term) ||
      b.attendee_name.toLowerCase().includes(term) ||
      b.event_name.toLowerCase().includes(term) ||
      b.seats_list?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header & Fast Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Organizer Control Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time ticket sales, venue capacity, attendee admissions, and revenue ledger.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('qr-scanner')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <QrCode className="w-3.5 h-3.5 text-indigo-600" />
            <span>Launch Check-in Scanner</span>
          </button>
          <button
            onClick={() => onNavigate('create-event')}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create New Event</span>
          </button>
        </div>
      </div>

      {/* 4-Column KPI Metric Strip adhering to Section 2 of SaaS Dashboard rules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Revenue</span>
            <span className="text-xs font-mono font-medium text-emerald-600">INR (₹)</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            ₹{analytics?.totalRevenue.toLocaleString() || '0'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Verified sandbox transactions</div>
        </div>

        {/* Metric 2: Total Bookings */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Bookings</span>
            <Ticket className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {analytics?.totalBookings || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Confirmed attendee orders</div>
        </div>

        {/* Metric 3: Tickets Checked In */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Checked In</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {analytics?.ticketsCheckedIn || 0}{' '}
            <span className="text-sm font-normal text-slate-400 font-sans">
              / {analytics?.totalTickets || 0} tickets
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Verified entrance scans</div>
        </div>

        {/* Metric 4: Active Events */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Events</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {analytics?.totalEvents || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{analytics?.upcomingEvents || 0} upcoming on calendar</div>
        </div>
      </div>

      {/* Revenue & Occupancy Breakdown by Event */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Event Performance & Capacity</h3>

        <div className="space-y-4">
          {analytics?.revenueByEvent.map(ev => {
            const occupancyPct = ev.max_capacity > 0 ? Math.min(100, Math.round((ev.tickets_sold / ev.max_capacity) * 100)) : 0;

            return (
              <div key={ev.event_id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{ev.event_name}</h4>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {ev.bookings_count} orders · {ev.tickets_sold} seats sold
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div>
                      <span className="text-slate-400 text-[10px] block font-sans">Occupancy</span>
                      <span className="font-bold text-slate-800 tabular-nums">{occupancyPct}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-sans">Revenue</span>
                      <span className="font-bold text-indigo-600 tabular-nums">
                        ₹{ev.revenue.toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={() => onNavigate('organizer-manage-event', ev.event_id)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100"
                    >
                      Manage ↗
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${occupancyPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Bookings Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Attendee Bookings</h3>
            <p className="text-xs text-slate-500">Live booking records synced directly from SQLite database.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={bookingSearch}
              onChange={e => setBookingSearch(e.target.value)}
              placeholder="Filter by ref, attendee, seat..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="py-3 px-4">Booking Ref</th>
                <th className="py-3 px-4">Attendee</th>
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4">Seats</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No bookings matched your filter.
                  </td>
                </tr>
              ) : (
                filteredBookings.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {b.booking_reference}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{b.attendee_name}</div>
                      <div className="text-[11px] text-slate-400">{b.attendee_email}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-[200px] truncate">
                      {b.event_name}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-indigo-600">
                      {b.seats_list}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      ₹{b.total_amount?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {b.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 text-[11px] font-mono">
                      {b.created_at?.split(' ')[1] || b.created_at}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
