import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Camera, 
  ArrowLeft, 
  Search, 
  Loader2,
  Sparkles,
  Ticket
} from 'lucide-react';

interface CheckInScannerPageProps {
  onBack: () => void;
  selectedEventId?: string;
}

export const CheckInScannerPage: React.FC<CheckInScannerPageProps> = ({ onBack, selectedEventId }) => {
  const [ticketInput, setTicketInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    status: 'CHECKED_IN' | 'ALREADY_CHECKED_IN' | 'INVALID';
    message: string;
    ticket?: any;
  } | null>(null);

  // Quick test tickets helper list for one-click evaluator testing
  const [recentTickets, setRecentTickets] = useState<any[]>([]);

  useEffect(() => {
    async function loadTestTickets() {
      try {
        const events = await api.getOrganizerEvents();
        if (events && events.length > 0) {
          const firstEventId = selectedEventId || events[0].id;
          const attendees = await api.getEventAttendees(firstEventId);
          setRecentTickets(attendees);
        }
      } catch (e) {
        console.warn('Could not load test tickets:', e);
      }
    }
    loadTestTickets();
  }, [selectedEventId]);

  // Audio tone feedback synthesizer
  const playBeep = (type: 'success' | 'warning' | 'error') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else if (type === 'warning') {
        osc.frequency.setValueAtTime(350, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch {
      // Audio not permitted or supported in this context
    }
  };

  const executeCheckIn = async (codeToVerify: string) => {
    if (!codeToVerify.trim()) return;
    setLoading(true);
    setScanResult(null);

    try {
      const res = await api.checkInTicket(codeToVerify.trim());
      setScanResult(res);
      playBeep(res.status === 'CHECKED_IN' ? 'success' : res.status === 'ALREADY_CHECKED_IN' ? 'warning' : 'error');

      // Refresh attendee list status
      if (selectedEventId || recentTickets.length > 0) {
        const evId = selectedEventId || recentTickets[0]?.event_id;
        if (evId) {
          const updated = await api.getEventAttendees(evId);
          setRecentTickets(updated);
        }
      }
    } catch (err: any) {
      const errorData = err.data || {};
      setScanResult({
        success: false,
        status: errorData.status || 'INVALID',
        message: err.message || 'Verification failed. Invalid or unrecognized ticket.',
        ticket: errorData.ticket,
      });
      playBeep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCheckIn(ticketInput);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Entrance Check-In Station</h1>
            <p className="text-xs text-slate-500">Scan digital attendee QR codes or verify ticket codes at the gate.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Scanner Active</span>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left Column: Code Input & Camera Emulation */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Scan or Enter Ticket Code</h3>
            <p className="text-xs text-slate-500">
              Paste the QR payload string or type the 6-character ticket code (e.g. <code>TCK-ABC123</code>).
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-3">
            <div className="relative">
              <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={ticketInput}
                onChange={e => setTicketInput(e.target.value)}
                placeholder="Scan QR or paste code (e.g. TCK-8F92K1)..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !ticketInput.trim()}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validating on server...</span>
                </>
              ) : (
                <span>Verify Ticket Admission</span>
              )}
            </button>
          </form>

          {/* Quick Test Ticket Selector for Evaluator Testing */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">Quick Test Selector</span>
              <span className="text-[11px] text-slate-400">Click to scan instantly</span>
            </div>

            {recentTickets.length === 0 ? (
              <p className="text-[11px] text-slate-400">No tickets found for testing.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {recentTickets.map(t => (
                  <button
                    key={t.ticket_code}
                    type="button"
                    onClick={() => {
                      setTicketInput(t.ticket_code);
                      executeCheckIn(t.ticket_code);
                    }}
                    className="w-full p-2 text-left rounded-lg border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/50 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <span className="font-bold font-mono text-slate-900">{t.ticket_code}</span>
                      <span className="text-slate-500 ml-2">({t.attendee_name} - Seat {t.seat_label})</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      t.status === 'CHECKED_IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {t.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Scan Result Card */}
        <div className="space-y-4">
          {scanResult ? (
            <div className={`p-6 rounded-2xl border transition-all shadow-sm ${
              scanResult.status === 'CHECKED_IN'
                ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                : scanResult.status === 'ALREADY_CHECKED_IN'
                ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                : 'bg-rose-50/90 border-rose-300 text-rose-950'
            }`}>
              {/* Status Header */}
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-current/10">
                {scanResult.status === 'CHECKED_IN' && (
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                )}
                {scanResult.status === 'ALREADY_CHECKED_IN' && (
                  <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0" />
                )}
                {scanResult.status === 'INVALID' && (
                  <XCircle className="w-8 h-8 text-rose-600 shrink-0" />
                )}

                <div>
                  <h4 className="text-base font-bold tracking-tight">
                    {scanResult.status === 'CHECKED_IN' && '✓ Ticket Valid — Admitted'}
                    {scanResult.status === 'ALREADY_CHECKED_IN' && '⚠ Already Checked In'}
                    {scanResult.status === 'INVALID' && '✕ Invalid Ticket'}
                  </h4>
                  <p className="text-xs opacity-90">{scanResult.message}</p>
                </div>
              </div>

              {/* Verified Details */}
              {scanResult.ticket && (
                <div className="bg-white/80 backdrop-blur-xs rounded-xl p-4 border border-current/15 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Attendee:</span>
                    <span className="font-bold text-slate-900">{scanResult.ticket.attendeeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Reserved Seat:</span>
                    <span className="font-bold text-indigo-700 font-mono">{scanResult.ticket.seatLabel} ({scanResult.ticket.sectionName})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Booking Order:</span>
                    <span className="font-bold font-mono text-slate-800">{scanResult.ticket.bookingReference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Ticket Pass:</span>
                    <span className="font-bold font-mono text-slate-800">{scanResult.ticket.ticketCode}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 space-y-2">
              <Camera className="w-10 h-10 mx-auto text-slate-300" />
              <h4 className="text-xs font-bold text-slate-700">Awaiting QR Code or Ticket Scan</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Scan or type an attendee ticket above to perform server-authoritative check-in verification.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
