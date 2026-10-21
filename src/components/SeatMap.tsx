import React from 'react';
import { SeatItem, SeatStatus } from '../types';
import { Check, Lock, Ban } from 'lucide-react';

interface SeatMapProps {
  seats: SeatItem[];
  selectedSeatIds: string[];
  onToggleSeat: (seat: SeatItem) => void;
  isOrganizerMode?: boolean;
  onBlockSeatToggle?: (seat: SeatItem) => void;
}

export const SeatMap: React.FC<SeatMapProps> = ({
  seats,
  selectedSeatIds,
  onToggleSeat,
  isOrganizerMode = false,
  onBlockSeatToggle,
}) => {
  // Group seats by Section -> Row
  const sectionsMap = new Map<string, {
    sectionId: string;
    sectionName: string;
    sectionPrice: number;
    sectionColor: string;
    rows: Map<string, SeatItem[]>;
  }>();

  for (const s of seats) {
    if (!sectionsMap.has(s.sectionId)) {
      sectionsMap.set(s.sectionId, {
        sectionId: s.sectionId,
        sectionName: s.sectionName,
        sectionPrice: s.sectionPrice,
        sectionColor: s.sectionColor,
        rows: new Map(),
      });
    }

    const sec = sectionsMap.get(s.sectionId)!;
    if (!sec.rows.has(s.rowLabel)) {
      sec.rows.set(s.rowLabel, []);
    }
    sec.rows.get(s.rowLabel)!.push(s);
  }

  const sectionsList = Array.from(sectionsMap.values());

  const getSeatVisualState = (seat: SeatItem) => {
    const isSelected = selectedSeatIds.includes(seat.id);

    if (seat.isBlocked) {
      return {
        bg: 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed',
        icon: <Ban className="w-3 h-3 text-slate-400" />,
        tooltip: `${seat.seatLabel} • Blocked / Unavailable`,
        clickable: isOrganizerMode,
      };
    }

    if (seat.status === 'BOOKED') {
      return {
        bg: 'bg-slate-300 text-slate-500 border border-slate-400 cursor-not-allowed opacity-75',
        icon: null,
        tooltip: `${seat.seatLabel} • Sold / Booked`,
        clickable: false,
      };
    }

    if (isSelected) {
      return {
        bg: 'bg-indigo-600 text-white border-2 border-indigo-700 shadow-sm ring-2 ring-indigo-200 scale-105 transition-transform',
        icon: <Check className="w-3 h-3 stroke-[3]" />,
        tooltip: `${seat.seatLabel} • Selected (₹${seat.sectionPrice})`,
        clickable: true,
      };
    }

    if (seat.status === 'HELD_BY_ME') {
      return {
        bg: 'bg-indigo-500 text-white border-2 border-indigo-600 shadow-sm',
        icon: <Check className="w-3 h-3" />,
        tooltip: `${seat.seatLabel} • Reserved by you (₹${seat.sectionPrice})`,
        clickable: true,
      };
    }

    if (seat.status === 'HELD') {
      return {
        bg: 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed animate-pulse',
        icon: <Lock className="w-2.5 h-2.5 text-amber-600" />,
        tooltip: `${seat.seatLabel} • Temporarily Held by another attendee`,
        clickable: false,
      };
    }

    // Available
    return {
      bg: 'bg-white text-slate-700 border border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 shadow-xs cursor-pointer active:scale-95 transition-all',
      icon: null,
      tooltip: `${seat.seatLabel} • Available (₹${seat.sectionPrice})`,
      clickable: true,
    };
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col items-center">
      {/* Visual Curved Stage Display */}
      <div className="w-full max-w-2xl mb-8 flex flex-col items-center">
        <div className="relative w-full h-12 flex items-center justify-center">
          <div className="absolute inset-x-8 top-0 h-6 border-t-4 border-slate-700 rounded-t-[100px] opacity-80" />
          <div className="z-10 bg-slate-900 text-white text-xs font-semibold uppercase tracking-widest px-6 py-1.5 rounded-full shadow-sm">
            STAGE
          </div>
        </div>
        <div className="text-[11px] text-slate-400 mt-1 font-medium">All eyes facing forward</div>
      </div>

      {/* Seating Sections */}
      <div className="w-full max-w-4xl space-y-8 overflow-x-auto pb-4">
        {sectionsList.map(sec => (
          <div key={sec.sectionId} className="border border-slate-100 rounded-lg p-4 bg-slate-50/60">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: sec.sectionColor }}
                />
                <h4 className="text-sm font-bold text-slate-900 tracking-tight">{sec.sectionName}</h4>
              </div>
              <div className="text-xs font-semibold text-slate-700 font-mono tabular-nums">
                ₹{sec.sectionPrice.toLocaleString()}
              </div>
            </div>

            {/* Rows & Seats Grid */}
            <div className="space-y-2.5">
              {Array.from(sec.rows.entries()).map(([rowLabel, rowSeats]) => (
                <div key={rowLabel} className="flex items-center justify-center gap-2 sm:gap-3">
                  {/* Row Indicator Left */}
                  <span className="w-5 text-center text-xs font-bold text-slate-400 font-mono">
                    {rowLabel}
                  </span>

                  {/* Seats in Row */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {rowSeats.map(seat => {
                      const visual = getSeatVisualState(seat);

                      return (
                        <button
                          key={seat.id}
                          type="button"
                          title={visual.tooltip}
                          disabled={!visual.clickable}
                          onClick={() => {
                            if (isOrganizerMode && onBlockSeatToggle) {
                              onBlockSeatToggle(seat);
                            } else {
                              onToggleSeat(seat);
                            }
                          }}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md flex flex-col items-center justify-center text-[10px] sm:text-xs font-medium font-mono tabular-nums select-none ${visual.bg}`}
                        >
                          {visual.icon || seat.seatNumber}
                        </button>
                      );
                    })}
                  </div>

                  {/* Row Indicator Right */}
                  <span className="w-5 text-center text-xs font-bold text-slate-400 font-mono">
                    {rowLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-8 pt-6 border-t border-slate-200 w-full flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-slate-300 bg-white shadow-2xs" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-indigo-600 text-white flex items-center justify-center">
            <Check className="w-2.5 h-2.5" />
          </div>
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-100 border border-amber-300 flex items-center justify-center">
            <Lock className="w-2.5 h-2.5 text-amber-700" />
          </div>
          <span>Held (10 min hold)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-slate-300 border border-slate-400" />
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-slate-200 border border-slate-300 flex items-center justify-center">
            <Ban className="w-2.5 h-2.5 text-slate-400" />
          </div>
          <span>Unavailable</span>
        </div>
      </div>
    </div>
  );
};
