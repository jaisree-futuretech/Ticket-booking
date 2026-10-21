import React, { useState } from 'react';
import { api } from '../api/client';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  MapPin, 
  Sparkles, 
  Layers, 
  Check, 
  ArrowLeft,
  Loader2
} from 'lucide-react';

interface CreateEventPageProps {
  onBack: () => void;
  onEventCreated: (eventId: string) => void;
}

interface SectionFormState {
  name: string;
  price: number;
  color: string;
  rows: string[];
  seatsPerRow: number;
}

const PRESET_POSTERS = [
  { label: 'Tech Conference', url: '/src/assets/images/event_tech_summit_1792576102557.jpg' },
  { label: 'Symphony Gala', url: '/src/assets/images/event_symphony_1792576119533.jpg' },
  { label: 'Comedy Theater', url: '/src/assets/images/event_standup_1792576135079.jpg' },
  { label: 'Rock Arena Concert', url: '/src/assets/images/event_rock_arena_1792576150003.jpg' },
];

export const CreateEventPage: React.FC<CreateEventPageProps> = ({ onBack, onEventCreated }) => {
  // Event details state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technology');
  const [eventDate, setEventDate] = useState('2027-04-15');
  const [startTime, setStartTime] = useState('10:00 AM');
  const [endTime, setEndTime] = useState('05:00 PM');
  const [venueName, setVenueName] = useState('Grand Metro Convention Centre');
  const [venueAddress, setVenueAddress] = useState('77 Innovation Parkway, Tech Park');
  const [venueCity, setVenueCity] = useState('Bengaluru');
  const [posterUrl, setPosterUrl] = useState(PRESET_POSTERS[0].url);

  // Seating layout builder state
  const [sections, setSections] = useState<SectionFormState[]>([
    {
      name: 'VIP Front Row',
      price: 1500,
      color: '#f59e0b',
      rows: ['A', 'B'],
      seatsPerRow: 8,
    },
    {
      name: 'Premium Club',
      price: 950,
      color: '#6366f1',
      rows: ['C', 'D'],
      seatsPerRow: 8,
    },
    {
      name: 'General Admission',
      price: 499,
      color: '#10b981',
      rows: ['E', 'F', 'G'],
      seatsPerRow: 8,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calculations for layout preview
  const totalSeats = sections.reduce(
    (sum, sec) => sum + sec.rows.length * sec.seatsPerRow,
    0
  );
  const potentialRevenue = sections.reduce(
    (sum, sec) => sum + sec.rows.length * sec.seatsPerRow * sec.price,
    0
  );

  const handleAddSection = () => {
    const nextRowLetter = String.fromCharCode(65 + sections.reduce((acc, s) => acc + s.rows.length, 0));
    setSections([
      ...sections,
      {
        name: `Section ${sections.length + 1}`,
        price: 500,
        color: '#8b5cf6',
        rows: [nextRowLetter],
        seatsPerRow: 8,
      },
    ]);
  };

  const handleRemoveSection = (idx: number) => {
    if (sections.length <= 1) return;
    setSections(sections.filter((_, i) => i !== idx));
  };

  const handleUpdateSection = (idx: number, field: keyof SectionFormState, value: any) => {
    const updated = [...sections];
    updated[idx] = { ...updated[idx], [field]: value };
    setSections(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await api.createEvent({
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
      });

      if (res.id) {
        onEventCreated(res.id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create event. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Create New Event</h1>
          <p className="text-xs text-slate-500">Configure event details and construct the interactive seating layout.</p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Basic Event Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
            1. Event Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Event Title *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. NextGen Web & Cloud Summit 2027"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Technology">Technology</option>
                <option value="Music">Music</option>
                <option value="Comedy">Comedy</option>
                <option value="Entertainment">Entertainment</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Event Date *</label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Start Time</label>
              <input
                type="text"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                placeholder="09:00 AM"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">End Time</label>
              <input
                type="text"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                placeholder="06:00 PM"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Event Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Detailed schedule, guest performers, speaker bios, and venue instructions..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Venue Specifications */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
            2. Venue & Location
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Venue Name *</label>
              <input
                type="text"
                required
                value={venueName}
                onChange={e => setVenueName(e.target.value)}
                placeholder="e.g. Royal Auditorium"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">City *</label>
              <input
                type="text"
                required
                value={venueCity}
                onChange={e => setVenueCity(e.target.value)}
                placeholder="e.g. Chennai"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Full Street Address</label>
              <input
                type="text"
                value={venueAddress}
                onChange={e => setVenueAddress(e.target.value)}
                placeholder="Address line"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Poster Picker */}
          <div>
            <label className="block font-medium text-slate-700 mb-2 text-xs">Event Poster Artwork</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PRESET_POSTERS.map(p => (
                <div
                  key={p.url}
                  onClick={() => setPosterUrl(p.url)}
                  className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all aspect-16/9 bg-slate-100 ${
                    posterUrl === p.url ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-transparent hover:border-slate-300'
                  }`}
                >
                  <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-slate-950/70 text-white text-[10px] py-0.5 px-1.5 truncate">
                    {p.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Visual Seating Layout Builder */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                3. Seating Layout Builder
              </h2>
              <p className="text-xs text-slate-500">
                Design custom tiered seating sections, define rows and seat counts, and set pricing.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-slate-600">Capacity: <strong className="text-slate-900">{totalSeats} seats</strong></span>
              <span className="text-slate-600">Max Gross: <strong className="text-emerald-600">₹{potentialRevenue.toLocaleString()}</strong></span>
            </div>
          </div>

          {/* Section Editors */}
          <div className="space-y-4">
            {sections.map((sec, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: sec.color }}
                    />
                    <span className="text-xs font-bold text-slate-800">Section {idx + 1}</span>
                  </div>

                  {sections.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSection(idx)}
                      className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Section Name</label>
                    <input
                      type="text"
                      value={sec.name}
                      onChange={e => handleUpdateSection(idx, 'name', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Seat Price (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={sec.price}
                      onChange={e => handleUpdateSection(idx, 'price', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Rows (comma-separated)</label>
                    <input
                      type="text"
                      value={sec.rows.join(',')}
                      onChange={e => handleUpdateSection(idx, 'rows', e.target.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean))}
                      placeholder="A,B"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Seats Per Row</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={sec.seatsPerRow}
                      onChange={e => handleUpdateSection(idx, 'seatsPerRow', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md font-mono"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddSection}
              className="w-full py-2 border-2 border-dashed border-slate-300 hover:border-indigo-400 text-slate-600 hover:text-indigo-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors bg-white"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Section</span>
            </button>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publishing Event & Seating Grid...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Publish Event & Seating Layout</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
