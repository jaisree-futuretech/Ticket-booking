import React from 'react';
import { TicketItem } from '../types';
import { Calendar, MapPin, Clock, User, QrCode, CheckCircle2, Printer } from 'lucide-react';

interface TicketCardProps {
  ticket: TicketItem;
  onPrint?: () => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket, onPrint }) => {
  const isCheckedIn = ticket.status === 'CHECKED_IN';

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col md:flex-row relative">
      {/* Visual Left Perforation Edge (Ticket Stub style) */}
      <div className="hidden md:flex flex-col justify-between items-center py-4 px-2 bg-slate-900 text-slate-400 border-r border-dashed border-slate-700">
        <span className="text-[10px] font-mono uppercase tracking-widest -rotate-90 origin-center whitespace-nowrap">
          ADMIT ONE
        </span>
      </div>

      {/* Main Ticket Info Section */}
      <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between">
        <div>
          {/* Header Row */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider font-mono">
                {ticket.sectionName}
              </span>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
                {ticket.eventName}
              </h3>
            </div>

            {/* Status indicator */}
            {isCheckedIn ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Checked In
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Valid Pass
              </span>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div>
              <span className="text-slate-400 block text-[11px]">Seat Number</span>
              <span className="font-bold text-slate-900 text-sm font-mono">{ticket.seatLabel}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Date & Time</span>
              <span className="font-semibold text-slate-900">
                {ticket.eventDate} • {ticket.startTime}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-slate-400 block text-[11px]">Attendee</span>
              <span className="font-semibold text-slate-900 truncate block">{ticket.attendeeName}</span>
            </div>
          </div>

          {/* Venue & Booking Reference */}
          <div className="space-y-1 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{ticket.venueName}, {ticket.venueAddress || ticket.venueCity}</span>
            </div>
            <div className="flex items-center gap-2 pt-1 font-mono text-[11px]">
              <span className="text-slate-400">Order:</span>
              <span className="font-semibold text-slate-700">{ticket.bookingReference}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-400">Code:</span>
              <span className="font-bold text-slate-900">{ticket.ticketCode}</span>
            </div>
          </div>
        </div>

        {/* Footer print action */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Present this QR at the venue entrance for admission
          </span>
          <button
            onClick={handlePrint}
            className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* QR Code Stub Right */}
      <div className="bg-slate-50 border-t md:border-t-0 md:border-l border-dashed border-slate-200 p-5 sm:p-6 flex flex-col items-center justify-center shrink-0 min-w-[170px]">
        {ticket.qrCodeDataUrl ? (
          <img
            src={ticket.qrCodeDataUrl}
            alt={`QR code for ticket ${ticket.ticketCode}`}
            referrerPolicy="no-referrer"
            className="w-32 h-32 rounded-lg bg-white p-1 border border-slate-200 shadow-2xs"
          />
        ) : (
          <div className="w-32 h-32 rounded-lg bg-slate-200 flex items-center justify-center">
            <QrCode className="w-12 h-12 text-slate-400" />
          </div>
        )}
        <div className="mt-2 text-center">
          <span className="font-mono text-xs font-bold text-slate-800 tracking-wider">
            {ticket.ticketCode}
          </span>
          <div className="text-[10px] text-slate-400">Scan at entrance</div>
        </div>
      </div>
    </div>
  );
};
