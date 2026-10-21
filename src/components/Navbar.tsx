import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { 
  Calendar, 
  Ticket, 
  LayoutDashboard, 
  QrCode, 
  PlusCircle, 
  History, 
  User as UserIcon,
  ChevronDown,
  LogOut,
  Users
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, logout, switchDemo } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const isOrganizer = user?.role === 'ORGANIZER';

  const handleRoleSwitch = async (role: UserRole, email?: string) => {
    setShowRoleMenu(false);
    await switchDemo(role, email);
    if (role === 'ORGANIZER') {
      onNavigate('organizer-dashboard');
    } else {
      onNavigate('discovery');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text wordmark */}
          <button 
            onClick={() => onNavigate(isOrganizer ? 'organizer-dashboard' : 'discovery')}
            className="flex items-center gap-2 text-left font-bold text-lg tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:opacity-80 transition-opacity"
          >
            <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              RS
            </span>
            <span>ReserveSeat</span>
          </button>

          {/* Zone 2: 4-5 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            {isOrganizer ? (
              <>
                <button
                  onClick={() => onNavigate('organizer-dashboard')}
                  className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'organizer-dashboard' ? 'text-indigo-600 font-semibold' : 'hover:text-slate-900'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => onNavigate('organizer-events')}
                  className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'organizer-events' ? 'text-indigo-600 font-semibold' : 'hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Events</span>
                </button>
                <button
                  onClick={() => onNavigate('create-event')}
                  className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'create-event' ? 'text-indigo-600 font-semibold' : 'hover:text-slate-900'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>New Event</span>
                </button>
                <button
                  onClick={() => onNavigate('qr-scanner')}
                  className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'qr-scanner' ? 'text-indigo-600 font-semibold' : 'hover:text-slate-900'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>Check-In</span>
                </button>
                <button
                  onClick={() => onNavigate('discovery')}
                  className="transition-colors whitespace-nowrap shrink-0 text-slate-400 hover:text-slate-700 text-xs"
                >
                  <span>Attendee Portal ↗</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onNavigate('discovery')}
                  className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'discovery' ? 'text-indigo-600 font-semibold' : 'hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Browse Events</span>
                </button>
                <button
                  onClick={() => onNavigate('my-tickets')}
                  className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'my-tickets' ? 'text-indigo-600 font-semibold' : 'hover:text-slate-900'
                  }`}
                >
                  <Ticket className="w-4 h-4" />
                  <span>My Tickets</span>
                </button>
                <button
                  onClick={() => onNavigate('booking-history')}
                  className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'booking-history' ? 'text-indigo-600 font-semibold' : 'hover:text-slate-900'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>History</span>
                </button>
                <button
                  onClick={() => onNavigate('profile')}
                  className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    currentView === 'profile' ? 'text-indigo-600 font-semibold' : 'hover:text-slate-900'
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Profile</span>
                </button>
              </>
            )}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="relative flex items-center gap-3 shrink-0">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowRoleMenu(!showRoleMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 border border-slate-200"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold">{user.name}</span>
                  <span className="text-slate-400 font-normal">({user.role})</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {showRoleMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 z-50 text-xs">
                    <div className="px-3 py-1.5 border-b border-slate-100">
                      <p className="font-semibold text-slate-900">{user.name}</p>
                      <p className="text-slate-500 truncate">{user.email}</p>
                    </div>

                    <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Switch Role / Demo User
                    </div>

                    <button
                      onClick={() => handleRoleSwitch('ORGANIZER', 'organizer@eventflow.com')}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 ${
                        user.email === 'organizer@eventflow.com' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-medium">Sarah Jenkins</div>
                        <div className="text-[11px] text-slate-500">Organizer (Manage & Scan)</div>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">ORGANIZER</span>
                    </button>

                    <button
                      onClick={() => handleRoleSwitch('ATTENDEE', 'attendee@eventflow.com')}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 ${
                        user.email === 'attendee@eventflow.com' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-medium">Alex Rivera</div>
                        <div className="text-[11px] text-slate-500">Attendee 1 (Has Tickets)</div>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">ATTENDEE</span>
                    </button>

                    <button
                      onClick={() => handleRoleSwitch('ATTENDEE', 'attendee2@eventflow.com')}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 ${
                        user.email === 'attendee2@eventflow.com' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-medium">Jordan Lee</div>
                        <div className="text-[11px] text-slate-500">Attendee 2 (Test Concurrency)</div>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">ATTENDEE</span>
                    </button>

                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={() => {
                          setShowRoleMenu(false);
                          logout();
                          onNavigate('login');
                        }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 text-rose-600 hover:bg-rose-50"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 shadow-sm"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
