import React, { useEffect, useState } from 'react';
import { EventItem } from '../types';
import { api } from '../api/client';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  ArrowLeft, 
  CheckCircle, 
  Ticket, 
  ShieldCheck,
  Loader2
} from 'lucide-react';

interface EventDetailsPageProps {
  eventId: string;
  onBack: () => void;
  onProceedToSeatSelection: (eventId: string) => void;
}

export const EventDetailsPage: React.FC<EventDetailsPageProps> = ({
  eventId,
  onBack,
  onProceedToSeatSelection,
}) => {
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvent() {
      setLoading(true);
      try {
        const data = await api.getEvent(eventId);
        setEvent(data);
      } catch (err) {
        console.error('Failed to load event details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [eventId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium">Loading event details...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <h3 className="text-base font-bold text-slate-900 mb-2">Event Not Found</h3>
        <p className="text-xs text-slate-500 mb-4">The requested event could not be found or has been removed.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
        >
          Back to Events
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to all events</span>
      </button>

      {/* Hero Visual Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="relative aspect-21/9 bg-slate-900 overflow-hidden">
          <img
            src={event.poster_url || '/src/assets/images/event_tech_summit_1792576102557.jpg'}
            alt={event.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <span className="text-xs font-semibold bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-md mb-2 inline-block">
              {event.category}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
              {event.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-200">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {event.event_date}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {event.start_time} - {event.end_time}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {event.venue_name}, {event.venue_city}
              </span>
            </div>
          </div>
        </div>

        {/* Content & Action Bar */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Description */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-2">About This Event</h2>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </div>

            {/* Venue Details */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Venue Location</h3>
              <p className="text-xs font-semibold text-slate-800">{event.venue_name}</p>
              <p className="text-xs text-slate-500">{event.venue_address}</p>
              <p className="text-xs text-slate-500">{event.venue_city}</p>
            </div>

            {/* Section Tiers & Pricing Breakdown */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3">Available Sections & Pricing</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {event.sections?.map(sec => (
                  <div
                    key={sec.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: sec.color }}
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-800">{sec.name}</div>
                        <div className="text-[11px] text-slate-400">Reserved Seating</div>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                      ₹{sec.price.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Booking Action Card */}
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Price Range</span>
                <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                  ₹{event.min_price?.toLocaleString()} - ₹{event.max_price?.toLocaleString()}
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600 border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between">
                  <span>Available Seats</span>
                  <span className="font-semibold text-emerald-600 font-mono tabular-nums">
                    {event.available_seats} / {event.total_seats || event.max_capacity}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Hold Window</span>
                  <span className="font-semibold text-slate-800">10 minutes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Instant Ticket</span>
                  <span className="font-semibold text-slate-800">Scannable QR</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onProceedToSeatSelection(event.id)}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Ticket className="w-4 h-4" />
                <span>Select Seats on Map</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Guaranteed double-booking prevention</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
