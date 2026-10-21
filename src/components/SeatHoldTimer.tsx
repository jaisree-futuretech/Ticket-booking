import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface SeatHoldTimerProps {
  initialSeconds: number;
  onExpire: () => void;
}

export const SeatHoldTimer: React.FC<SeatHoldTimerProps> = ({ initialSeconds, onExpire }) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onExpire();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, onExpire]);

  const minutes = Math.floor(secondsLeft / 60);
  const remainingSecs = secondsLeft % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;

  const percentLeft = Math.max(0, Math.min(100, (secondsLeft / 600) * 100));
  const isUrgent = secondsLeft < 120; // under 2 minutes

  return (
    <div className={`p-4 rounded-xl border transition-colors ${
      isUrgent 
        ? 'bg-rose-50/80 border-rose-200 text-rose-900' 
        : 'bg-amber-50/80 border-amber-200 text-amber-900'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isUrgent ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 animate-bounce" />
          ) : (
            <Clock className="w-4 h-4 text-amber-600" />
          )}
          <span className="text-xs font-semibold uppercase tracking-wider">
            {isUrgent ? 'Reservation Expiring Soon' : 'Seats Held For You'}
          </span>
        </div>
        <div className={`text-base font-bold font-mono tabular-nums ${
          isUrgent ? 'text-rose-700' : 'text-amber-800'
        }`}>
          {timeFormatted}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear rounded-full ${
            isUrgent ? 'bg-rose-600' : 'bg-amber-500'
          }`}
          style={{ width: `${percentLeft}%` }}
        />
      </div>

      <p className="text-[11px] mt-2 text-slate-600 leading-snug">
        Your selected seats are locked for 10 minutes so no one else can book them. Complete checkout before the timer reaches zero.
      </p>
    </div>
  );
};
