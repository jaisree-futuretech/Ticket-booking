import React, { useEffect, useState } from 'react';
import { EventItem } from '../types';
import { api } from '../api/client';
import { 
  Search, 
  Calendar, 
  MapPin, 
  Tag, 
  ArrowRight, 
  Sparkles,
  Users,
  Filter,
  Loader2
} from 'lucide-react';

interface EventDiscoveryPageProps {
  onSelectEvent: (eventId: string) => void;
}

const CATEGORIES = ['All', 'Technology', 'Music', 'Comedy', 'Entertainment'];

export const EventDiscoveryPage: React.FC<EventDiscoveryPageProps> = ({ onSelectEvent }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDate, setSelectedDate] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getEvents({
        search: searchTerm,
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        date: selectedDate || undefined,
      });
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedCategory, selectedDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search events, venues, or cities..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Category Tabs (Interactive Segmented Control adhering to Zero-Pill rules) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {(searchTerm || selectedDate || selectedCategory !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('All');
                  setSelectedDate('');
                }}
                className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1.5 font-medium whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-600" />
          <p className="text-sm font-medium">Loading upcoming events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 mb-1">No upcoming events found</h3>
          <p className="text-xs text-slate-500 mb-4">
            Try adjusting your search query, clearing filters, or switching categories.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('All');
              setSelectedDate('');
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(event => (
            <div
              key={event.id}
              onClick={() => onSelectEvent(event.id)}
              className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
            >
              {/* Event Poster Image */}
              <div className="relative aspect-16/9 bg-slate-100 overflow-hidden">
                <img
                  src={event.poster_url || '/src/assets/images/event_tech_summit_1792576102557.jpg'}
                  alt={event.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-medium px-2.5 py-1 rounded-md">
                  {event.category}
                </div>
              </div>

              {/* Event Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  {/* Clean unboxed metadata with bullet separators (anti-pill rule) */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <span className="font-semibold text-slate-700">{event.event_date}</span>
                    <span aria-hidden="true">·</span>
                    <span>{event.start_time}</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-2">
                    {event.name}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{event.venue_name}, {event.venue_city}</span>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                    {event.description}
                  </p>
                </div>

                {/* Footer with Price & Availability */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-normal">Starts from</span>
                    <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                      ₹{event.min_price?.toLocaleString() || '499'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[11px] text-emerald-600 font-medium block">
                        {event.available_seats_count ?? 50} seats left
                      </span>
                    </div>

                    <button
                      type="button"
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 group-hover:bg-indigo-600 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <span>Select Seats</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
