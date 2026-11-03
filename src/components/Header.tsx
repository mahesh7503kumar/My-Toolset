import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Crown, LogOut, Search, ShieldCheck } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { checkPremiumExpiry, isCurrentlyDark } from '../utils/sessionGuards';

interface HeaderProps {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  showSearch?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery = '',
  onSearchChange,
  showSearch = false,
}) => {
  const navigate = useNavigate();
  const [dark, setDark] = useState<boolean>(() => isCurrentlyDark());

  useEffect(() => {
    checkPremiumExpiry();
    const syncTheme = () => setDark(isCurrentlyDark());
    window.addEventListener('themeChange', syncTheme);
    return () => window.removeEventListener('themeChange', syncTheme);
  }, []);

  const isPremium = localStorage.getItem('isPremium') === 'true';
  const expStr = localStorage.getItem('premiumExpiry');
  const planStr = localStorage.getItem('premiumPlan');
  const userRole = localStorage.getItem('userRole');

  let proBadgeText = '';
  if (isPremium) {
    if (planStr === 'monthly' && expStr) {
      const d = new Date(expStr);
      if (!isNaN(d.getTime())) {
        const days = Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
        proBadgeText = `Pro Monthly - ${d.toLocaleDateString()} - ${days}d left`;
      } else {
        proBadgeText = 'Pro Monthly';
      }
    } else {
      proBadgeText = 'Pro Lifetime';
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap md:flex-nowrap items-center justify-between gap-3 md:gap-6">
        {/* Left: MT Logo + Brand */}
        <Link to="/" className="flex items-center gap-2.5 whitespace-nowrap shrink-0 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#3B82F6] via-[#2563EB] to-[#1D4ED8] flex items-center justify-center text-white font-extrabold text-sm tracking-tight shadow-sm">
            MT
          </div>
          <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
            My Toolset
          </span>
        </Link>

        {/* Center: Search Input */}
        {showSearch ? (
          <div className="order-3 md:order-2 w-full md:max-w-md md:flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search 50 tools..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 pr-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors"
            />
          </div>
        ) : (
          <div className="hidden md:block flex-1" />
        )}

        {/* Right: Actions */}
        <div className="order-2 md:order-3 flex items-center gap-2 shrink-0">
          <PWAInstallButton />

          {userRole === 'admin' && (
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}

          {isPremium ? (
            <Link
              to="/premium"
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 px-3 py-2 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors whitespace-nowrap shrink-0"
              title={proBadgeText}
            >
              <Crown className="w-3.5 h-3.5 shrink-0" />
              <span className="max-w-[200px] sm:max-w-none truncate">{proBadgeText}</span>
            </Link>
          ) : (
            <Link
              to="/premium"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] text-white px-3.5 py-2 text-xs font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Go Pro</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => window.toggleAppTheme?.()}
            className="p-2 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-base leading-none transition-colors shrink-0"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {dark ? '☀️' : '🌙'}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-red-600 dark:hover:text-red-400 transition-colors whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
