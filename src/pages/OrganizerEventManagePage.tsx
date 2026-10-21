import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { SeatMap } from '../components/SeatMap';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  Ban, 
  CheckCircle, 
  Ticket, 
  Loader2,
  RefreshCw
} from 'lucide-react';

interface OrganizerEventManagePageProps {
  eventId: string;
  onBack: () => void;
  onOpenCheckIn: (eventId: string) => void;
}

export const OrganizerEventManagePage: React.FC<OrganizerEventManagePageProps> = ({
  eventId,
  onBack,
  onOpenCheckIn,
}) => {
  const [data, setData] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'layout' | 'attendees'>('layout');
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadEventData = async () => {
    setLoading(true);
    try {
      const [detailRes, attendeesRes] = await Promise.all([
        api.getOrganizerEventDetail(eventId),
        api.getEventAttendees(eventId),
      ]);
      setData(detailRes);
      setAttendees(attendeesRes);
    } catch (err) {
      console.error('Failed to load event data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const handleToggleBlock = async (seat: any) => {
    setActionMessage(null);
    try {
      await api.toggleSeatBlock(seat.id, !seat.isBlocked);
      setActionMessage(`Seat ${seat.seatLabel} marked as ${!seat.isBlocked ? 'UNAVAILABLE (Blocked)' : 'AVAILABLE'}.`);
      await loadEventData();
    } catch (err: any) {
      setActionMessage(err.message || 'Failed to update seat block status');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium">Loading event management & seating layout...</p>
      </div>
    );
  }

  const event = data?.event;
  const seats = (data?.seats || []).map((s: any) => ({
    id: s.id,
    eventId: s.event_id || eventId,
    sectionId: s.section_id,
    sectionName: s.section_name,
    sectionPrice: s.price,
    sectionColor: s.color || '#6366f1',
    rowId: s.row_id,
    rowLabel: s.row_label,
    seatNumber: s.seat_number,
    seatLabel: s.seat_label,
    status: s.is_blocked === 1 ? 'UNAVAILABLE' : s.ticket_status ? 'BOOKED' : 'AVAILABLE',
    isBlocked: s.is_blocked === 1,
  }));

  const bookedCount = seats.filter((s: any) => s.status === 'BOOKED').length;
  const blockedCount = seats.filter((s: any) => s.isBlocked).length;
  const availableCount = seats.filter((s: any) => s.status === 'AVAILABLE').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">{event?.name}</h1>
            <p className="text-xs text-slate-500">
              {event?.event_date} • {event?.venue_name}, {event?.venue_city}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenCheckIn(eventId)}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Ticket className="w-3.5 h-3.5 text-indigo-600" />
            <span>Open Check-in Station</span>
          </button>
          <button
            onClick={loadEventData}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 border border-slate-200"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-400 block text-[11px]">Total Venue Capacity</span>
          <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">{seats.length} seats</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-400 block text-[11px]">Booked & Sold</span>
          <span className="text-lg font-bold text-indigo-600 font-mono tabular-nums">{bookedCount} seats</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-400 block text-[11px]">Blocked / Unavailable</span>
          <span className="text-lg font-bold text-slate-600 font-mono tabular-nums">{blockedCount} seats</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-400 block text-[11px]">Available to Attendees</span>
          <span className="text-lg font-bold text-emerald-600 font-mono tabular-nums">{availableCount} seats</span>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-900 flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-indigo-600 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('layout')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'layout'
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Visual Seating Layout & Availability Control
        </button>
        <button
          onClick={() => setActiveTab('attendees')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'attendees'
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Attendee Roster & Check-ins ({attendees.length})
        </button>
      </div>

      {activeTab === 'layout' ? (
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
            <Ban className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Organizer Seat Management:</strong> Click any seat below to toggle its status between <strong>Available</strong> and <strong>Blocked / Unavailable</strong> (e.g. for VIP VIP reservations or technical equipment).
            </span>
          </div>

          <SeatMap
            seats={seats}
            selectedSeatIds={[]}
            onToggleSeat={() => {}}
            isOrganizerMode={true}
            onBlockSeatToggle={handleToggleBlock}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <tr>
                  <th className="py-3 px-4">Seat</th>
                  <th className="py-3 px-4">Attendee Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">Ticket Code</th>
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4 text-center">Check-in Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No attendee tickets issued yet for this event.
                    </td>
                  </tr>
                ) : (
                  attendees.map(a => (
                    <tr key={a.ticket_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold font-mono text-slate-900">
                        {a.seat_label}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {a.attendee_name}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {a.attendee_email}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {a.section_name}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                        {a.ticket_code}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {a.booking_reference}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          a.status === 'CHECKED_IN'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {a.status === 'CHECKED_IN' ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>Checked In</span>
                            </>
                          ) : (
                            <span>Awaiting Entry</span>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
