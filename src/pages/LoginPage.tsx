import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck, Loader2 } from 'lucide-react';

interface LoginPageProps {
  onNavigate: (view: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login, switchDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      onNavigate('discovery');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role: 'ORGANIZER' | 'ATTENDEE', demoEmail: string) => {
    setError(null);
    setLoading(true);
    try {
      await switchDemo(role, demoEmail);
      if (role === 'ORGANIZER') {
        onNavigate('organizer-dashboard');
      } else {
        onNavigate('discovery');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to switch demo account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base mx-auto shadow-sm">
          RS
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sign in to ReserveSeat</h1>
        <p className="text-xs text-slate-500">
          Enter your credentials or use the instant reviewer demo accounts below.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-medium">
          {error}
        </div>
      )}

      {/* Quick Demo Logins for Fast Reviewer Evaluation */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          One-Click Demo Logins
        </span>
        <div className="space-y-1.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleQuickDemo('ORGANIZER', 'organizer@eventflow.com')}
            className="w-full p-2.5 rounded-lg border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-950 flex items-center justify-between text-xs transition-colors"
          >
            <div className="text-left">
              <span className="font-semibold block">Sarah Jenkins (Organizer)</span>
              <span className="text-[10px] text-slate-500">Manage seating layout, revenue, scan tickets</span>
            </div>
            <span className="text-[10px] bg-indigo-200/60 text-indigo-800 px-1.5 py-0.5 rounded font-mono font-medium">
              ORGANIZER
            </span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleQuickDemo('ATTENDEE', 'attendee@eventflow.com')}
            className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 flex items-center justify-between text-xs transition-colors"
          >
            <div className="text-left">
              <span className="font-semibold block">Alex Rivera (Attendee 1)</span>
              <span className="text-[10px] text-slate-500">Has confirmed booking & scannable tickets</span>
            </div>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono font-medium">
              ATTENDEE
            </span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleQuickDemo('ATTENDEE', 'attendee2@eventflow.com')}
            className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 flex items-center justify-between text-xs transition-colors"
          >
            <div className="text-left">
              <span className="font-semibold block">Jordan Lee (Attendee 2)</span>
              <span className="text-[10px] text-slate-500">Test concurrent double-booking locks</span>
            </div>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono font-medium">
              ATTENDEE
            </span>
          </button>
        </div>
      </div>

      {/* Standard Form */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign In</span>}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
          Don't have an account?{' '}
          <button
            onClick={() => onNavigate('register')}
            className="font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Create account
          </button>
        </div>
      </div>
    </div>
  );
};
