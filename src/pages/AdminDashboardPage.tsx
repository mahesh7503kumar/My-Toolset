import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  CalendarPlus,
  CreditCard,
  Download,
  ExternalLink,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Moon,
  RotateCcw,
  Search,
  Settings,
  Sun,
  Users,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { StoredUser } from './LoginPage';
import {
  DeviceLockRecord,
  getStoredThemeMode,
  isCurrentlyDark,
  ThemeChoice,
  verifySingleDeviceSession,
} from '../utils/sessionGuards';

type AdminTab = 'dashboard' | 'users' | 'payments' | 'adskeys' | 'settings';
type PaymentFilter = 'all' | 'monthly' | 'lifetime' | 'expired';

interface PaymentRecord {
  key: string;
  email: string;
  plan: 'monthly' | 'lifetime';
  pid: string;
  amount: number;
  date: string;
  expiry: string;
  deviceId: string;
}

const SEVEN_DAY_BARS = [
  { day: 'Mon', pct: 42, heightClass: 'h-[42%]' },
  { day: 'Tue', pct: 68, heightClass: 'h-[68%]' },
  { day: 'Wed', pct: 54, heightClass: 'h-[54%]' },
  { day: 'Thu', pct: 85, heightClass: 'h-[85%]' },
  { day: 'Fri', pct: 73, heightClass: 'h-[73%]' },
  { day: 'Sat', pct: 94, heightClass: 'h-[94%]' },
  { day: 'Sun', pct: 62, heightClass: 'h-[62%]' },
];

function safeLoadUsers(): StoredUser[] {
  try {
    const parsed = JSON.parse(localStorage.getItem('allUsers') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeLoadPayments(): PaymentRecord[] {
  const records: PaymentRecord[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('pay_')) {
        try {
          const parsed = JSON.parse(localStorage.getItem(k) || '{}');
          const plan: 'monthly' | 'lifetime' = parsed.plan === 'monthly' ? 'monthly' : 'lifetime';
          const fallbackExp =
            plan === 'monthly'
              ? new Date(Date.now() + 30 * 86400000).toISOString()
              : new Date(Date.now() + 100 * 365 * 86400000).toISOString();
          records.push({
            key: k,
            email: parsed.email || 'Unknown',
            plan,
            pid: parsed.pid || '-',
            amount: Number(parsed.amount) || (plan === 'monthly' ? 299 : 1999),
            date: parsed.date || '',
            expiry: parsed.expiry || fallbackExp,
            deviceId: parsed.deviceId || '',
          });
        } catch {
          // ignore malformed entry
        }
      }
    }
  } catch {
    // ignore
  }
  return records.sort((a, b) => b.key.localeCompare(a.key));
}

function safeLoadDeviceLocks(): Record<string, DeviceLockRecord> {
  const map: Record<string, DeviceLockRecord> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('device_lock_')) {
        try {
          const emailKey = k.slice('device_lock_'.length).toLowerCase();
          map[emailKey] = JSON.parse(localStorage.getItem(k) || '{}');
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }
  return map;
}

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Core data
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [deviceLocks, setDeviceLocks] = useState<Record<string, DeviceLockRecord>>({});
  const [userSearch, setUserSearch] = useState<string>('');
  const [payFilter, setPayFilter] = useState<PaymentFilter>('all');

  // Ads & Keys
  const [rzpKey, setRzpKey] = useState<string>('');
  const [adBanner, setAdBanner] = useState<string>('');
  const [adInter, setAdInter] = useState<string>('');
  const [upiId, setUpiId] = useState<string>('');

  // Settings & Appearance
  const [pricing, setPricing] = useState<string>('1999');
  const [maintenance, setMaintenance] = useState<boolean>(false);
  const [allowMultiDevice, setAllowMultiDevice] = useState<boolean>(false);
  const [dark, setDark] = useState<boolean>(() => isCurrentlyDark());
  const [themeMode, setThemeMode] = useState<ThemeChoice>(() => getStoredThemeMode());

  const refreshData = useCallback(() => {
    setUsers(safeLoadUsers());
    setPayments(safeLoadPayments());
    setDeviceLocks(safeLoadDeviceLocks());
  }, []);

  useEffect(() => {
    if (!verifySingleDeviceSession()) {
      showToast('Logged out - account used on another device', 'error');
      navigate('/login', { replace: true });
      return;
    }
    if (localStorage.getItem('userRole') !== 'admin') {
      navigate('/login');
      return;
    }

    refreshData();
    setRzpKey(localStorage.getItem('rzp_key') || '');
    setAdBanner(localStorage.getItem('ad_banner') || '');
    setAdInter(localStorage.getItem('ad_inter') || '');
    setUpiId(localStorage.getItem('upi_id') || '');

    setPricing(localStorage.getItem('pricing') || '1999');
    setMaintenance(localStorage.getItem('maintenance') === 'true');
    setAllowMultiDevice(localStorage.getItem('allowMultiDevice') === 'true');

    const syncTheme = () => {
      setDark(isCurrentlyDark());
      setThemeMode(getStoredThemeMode());
    };
    window.addEventListener('themeChange', syncTheme);
    return () => window.removeEventListener('themeChange', syncTheme);
  }, [navigate, refreshData, showToast]);

  const now = Date.now();
  const todayDateStr = new Date().toDateString();

  // Metrics calculation
  const totalUsers = users.length;
  const proUsers = payments.length;
  const monthlyRevenue = payments
    .filter((p) => p.plan === 'monthly')
    .reduce((sum, p) => sum + p.amount, 0);
  const lifetimeRevenue = payments
    .filter((p) => p.plan === 'lifetime')
    .reduce((sum, p) => sum + p.amount, 0);

  const isPaymentExpired = (p: PaymentRecord): boolean => {
    if (!p.expiry) return false;
    const t = new Date(p.expiry).getTime();
    return !isNaN(t) && t <= now;
  };

  const activeSubsCount = payments.filter((p) => !isPaymentExpired(p)).length;
  const expiredSubsCount = payments.filter((p) => isPaymentExpired(p)).length;
  const expiredTodayCount = payments.filter((p) => {
    if (!isPaymentExpired(p)) return false;
    return new Date(p.expiry).toDateString() === todayDateStr;
  }).length;

  const proEmails = useMemo(() => {
    const s = new Set<string>();
    payments.forEach((p) => {
      if (!isPaymentExpired(p)) s.add(p.email.toLowerCase());
    });
    users.forEach((u) => {
      if (u.isPro) s.add((u.email || '').toLowerCase());
    });
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments, users]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.email || '').toLowerCase().includes(q));
  }, [users, userSearch]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const expired = isPaymentExpired(p);
      if (payFilter === 'monthly') return p.plan === 'monthly';
      if (payFilter === 'lifetime') return p.plan === 'lifetime';
      if (payFilter === 'expired') return expired;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments, payFilter]);

  const handleToggleBlock = (targetEmail: string) => {
    if (targetEmail.toLowerCase() === 'mahesh7503kumar@gmail.com') {
      showToast('Super Admin account cannot be blocked', 'info');
      return;
    }
    const updated = users.map((u) =>
      u.email === targetEmail ? { ...u, blocked: !u.blocked } : u
    );
    setUsers(updated);
    localStorage.setItem('allUsers', JSON.stringify(updated));
    showToast(`Updated block status for ${targetEmail}`);
  };

  const handleResetDevice = (targetEmail: string) => {
    const emailLower = targetEmail.toLowerCase();
    localStorage.removeItem('device_lock_' + emailLower);
    setDeviceLocks(safeLoadDeviceLocks());
    showToast(`Device lock reset for ${targetEmail}`);
  };

  const handleExtend30Days = (p: PaymentRecord) => {
    try {
      const currentExpMs = p.expiry ? new Date(p.expiry).getTime() : Date.now();
      const baseMs = !isNaN(currentExpMs) && currentExpMs > Date.now() ? currentExpMs : Date.now();
      const newExpIso = new Date(baseMs + 30 * 24 * 60 * 60 * 1000).toISOString();

      const raw = JSON.parse(localStorage.getItem(p.key) || '{}');
      const updatedRecord = {
        ...raw,
        email: p.email,
        plan: p.plan,
        pid: p.pid,
        amount: p.amount,
        date: p.date,
        expiry: newExpIso,
        deviceId: p.deviceId,
      };
      localStorage.setItem(p.key, JSON.stringify(updatedRecord));

      // If extending for the currently logged-in user, update active session keys too
      const curUser = (localStorage.getItem('userEmail') || '').toLowerCase();
      if (curUser && curUser === p.email.toLowerCase()) {
        localStorage.setItem('isPremium', 'true');
        localStorage.setItem('premiumPlan', p.plan);
        localStorage.setItem('premiumExpiry', newExpIso);
        localStorage.removeItem('premiumExpired');
      }

      refreshData();
      showToast(`Extended ${p.email} by +30 days`);
    } catch {
      showToast('Could not update payment expiry', 'error');
    }
  };

  const handleExportCsv = () => {
    const header = 'Email,Plan,Amount (INR),PID,Date,Expiry,Status\n';
    const rows = filteredPayments
      .map((p) => {
        const status = isPaymentExpired(p) ? 'Expired' : 'Active';
        return `"${p.email.replace(/"/g, '""')}","${p.plan}",${p.amount},"${p.pid.replace(
          /"/g,
          '""'
        )}","${p.date}","${p.expiry}","${status}"`;
      })
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-toolset-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showToast('Payments CSV downloaded');
  };

  const handleSaveAdsKeys = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('rzp_key', rzpKey.trim());
    localStorage.setItem('ad_banner', adBanner.trim());
    localStorage.setItem('ad_inter', adInter.trim());
    localStorage.setItem('upi_id', upiId.trim());
    showToast('Ads & Payment Keys saved!');
  };

  const handleSavePricing = (e: React.FormEvent) => {
    e.preventDefault();
    const safePrice = Number(pricing) > 0 ? String(Number(pricing)) : '1999';
    setPricing(safePrice);
    localStorage.setItem('pricing', safePrice);
    showToast(`Lifetime Pro price updated to Rs${safePrice}`);
  };

  const handleMaintenanceToggle = (checked: boolean) => {
    setMaintenance(checked);
    localStorage.setItem('maintenance', checked ? 'true' : 'false');
    showToast(
      checked
        ? 'Maintenance Mode enabled — Home page is now locked'
        : 'Maintenance Mode disabled — Home page is live'
    );
  };

  const handleAllowMultiToggle = (checked: boolean) => {
    setAllowMultiDevice(checked);
    localStorage.setItem('allowMultiDevice', checked ? 'true' : 'false');
    showToast(
      checked
        ? 'Multi-device login enabled across accounts'
        : 'Single-device lock enforced across accounts'
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  const navItems: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'adskeys', label: 'AdsKeys', icon: <KeyRound className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const getDaysLeftLabel = (p: PaymentRecord) => {
    if (p.plan === 'lifetime') return 'Lifetime';
    if (!p.expiry) return '-';
    const diff = new Date(p.expiry).getTime() - now;
    if (isNaN(diff)) return '-';
    const d = Math.max(0, Math.ceil(diff / 86400000));
    return `${d}d`;
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col md:flex-row">
      {/* Left Sidebar width 220px */}
      <aside className="w-full md:w-[220px] shrink-0 border-b md:border-b-0 md:border-r border-slate-800 bg-[#0F172A] flex flex-col justify-between">
        <div>
          <div className="p-5 border-b border-slate-800 flex items-center justify-between md:block">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-extrabold text-xs">
                MT
              </div>
              <span className="font-extrabold text-sm tracking-tight text-white whitespace-nowrap">
                My Toolset Admin
              </span>
            </div>

            <Link
              to="/"
              className="md:mt-3 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <span>Open Live App</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <nav className="p-3 flex md:flex-col gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#2563EB] text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}

            <Link
              to="/admin/tools-checker"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-slate-800/70 transition-colors whitespace-nowrap shrink-0"
            >
              <Activity className="w-4 h-4" />
              <span>Tools Checker</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="md:hidden flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-slate-800/70 whitespace-nowrap shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </nav>
        </div>

        <div className="hidden md:block p-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-400 hover:text-red-400 hover:bg-slate-800/70 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-5 sm:p-8 overflow-y-auto space-y-8">
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white">
                  Dashboard Overview
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Monthly &amp; Lifetime revenue, active subscriptions, and single-device telemetry
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.toggleAppTheme?.()}
                className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-base leading-none border border-slate-700"
                title="Toggle app theme"
              >
                {dark ? '☀️' : '🌙'}
              </button>
            </div>

            {/* 6 KPI Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="text-xs font-medium text-slate-400">Total Users</div>
                <div className="text-2xl font-extrabold text-white font-mono tabular-nums mt-1">
                  {totalUsers}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="text-xs font-medium text-slate-400">Pro Upgrades</div>
                <div className="text-2xl font-extrabold text-emerald-400 font-mono tabular-nums mt-1">
                  {proUsers}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="text-xs font-medium text-slate-400">Monthly Revenue</div>
                <div className="text-2xl font-extrabold text-blue-400 font-mono tabular-nums mt-1">
                  Rs{monthlyRevenue.toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="text-xs font-medium text-slate-400">Lifetime Revenue</div>
                <div className="text-2xl font-extrabold text-amber-400 font-mono tabular-nums mt-1">
                  Rs{lifetimeRevenue.toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="text-xs font-medium text-slate-400">Active Subs</div>
                <div className="text-2xl font-extrabold text-emerald-400 font-mono tabular-nums mt-1">
                  {activeSubsCount}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="text-xs font-medium text-slate-400">Expired (Today)</div>
                <div className="text-2xl font-extrabold text-red-400 font-mono tabular-nums mt-1">
                  {expiredSubsCount}{' '}
                  <span className="text-xs font-normal text-slate-400">({expiredTodayCount})</span>
                </div>
              </div>
            </div>

            {/* 7-Day Activity Bar Chart */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white">Last 7 Days Tool Usage Volume</h2>
                <span className="text-xs text-slate-400 font-mono tabular-nums">7-Day Window</span>
              </div>
              <div className="h-44 flex items-end justify-between gap-3 pt-4 px-2">
                {SEVEN_DAY_BARS.map((bar) => (
                  <div
                    key={bar.day}
                    className="flex-1 flex flex-col items-center gap-2 h-full justify-end"
                  >
                    <div
                      className={`w-full max-w-[44px] rounded-t-md bg-gradient-to-t from-[#1D4ED8] to-[#3B82F6] transition-opacity hover:opacity-90 ${bar.heightClass}`}
                      title={`${bar.day}: ${bar.pct}%`}
                    />
                    <span className="text-xs text-slate-400 font-mono">{bar.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent 5 Payments */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-sm font-bold text-white">Recent 5 Payments</h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('payments')}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                >
                  Manage Subscriptions →
                </button>
              </div>
              {payments.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  No Pro upgrades recorded yet. Completed Monthly or Lifetime checkouts appear here.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-xs text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Email</th>
                        <th className="px-5 py-3 font-semibold">Plan</th>
                        <th className="px-5 py-3 font-semibold text-right">Amount</th>
                        <th className="px-5 py-3 font-semibold">Days Left</th>
                        <th className="px-5 py-3 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {payments.slice(0, 5).map((p) => {
                        const expired = isPaymentExpired(p);
                        return (
                          <tr key={p.key} className="hover:bg-slate-800/40">
                            <td className="px-5 py-3 font-medium text-slate-200">{p.email}</td>
                            <td className="px-5 py-3 text-xs font-semibold uppercase text-slate-300">
                              {p.plan}
                            </td>
                            <td className="px-5 py-3 font-mono tabular-nums text-right text-emerald-400">
                              Rs{p.amount}
                            </td>
                            <td className="px-5 py-3 font-mono tabular-nums text-xs text-slate-300">
                              {getDaysLeftLabel(p)}
                            </td>
                            <td className="px-5 py-3 text-right text-xs font-semibold">
                              <span className={expired ? 'text-red-400' : 'text-emerald-400'}>
                                {expired ? 'Expired' : 'Active'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: USERS + DEVICE LOCK MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white">
                  Users &amp; Active Devices
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Inspect bound single-device locks, reset lost devices, or block accounts
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Filter by email..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-3.5 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  No users match your filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-xs text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Email</th>
                        <th className="px-4 py-3 font-semibold">IsPro?</th>
                        <th className="px-4 py-3 font-semibold">Device ID</th>
                        <th className="px-4 py-3 font-semibold">Device Name</th>
                        <th className="px-4 py-3 font-semibold">Last Active</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredUsers.map((u) => {
                        const emailLower = (u.email || '').toLowerCase();
                        const userIsPro = u.isPro || proEmails.has(emailLower);
                        const lock = deviceLocks[emailLower];
                        const shortDid = lock?.deviceId
                          ? `${lock.deviceId.slice(0, 8)}…${lock.deviceId.slice(-4)}`
                          : 'Unbound';
                        return (
                          <tr key={u.email} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-medium text-white">{u.email}</td>
                            <td className="px-4 py-3 text-xs font-semibold">
                              <span className={userIsPro ? 'text-emerald-400' : 'text-slate-400'}>
                                {userIsPro ? 'Yes (Pro)' : 'Free'}
                              </span>
                            </td>
                            <td
                              className="px-4 py-3 font-mono text-xs text-blue-300"
                              title={lock?.deviceId || 'No active device lock'}
                            >
                              {shortDid}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-300 max-w-[180px] truncate">
                              {lock?.deviceName || '-'}
                            </td>
                            <td className="px-4 py-3 font-mono tabular-nums text-xs text-slate-400">
                              {lock?.lastActive ? new Date(lock.lastActive).toLocaleString() : '-'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleResetDevice(u.email)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
                                  title="Clear single-device lock for this user"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Reset Device</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleBlock(u.email)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                    u.blocked
                                      ? 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30'
                                      : 'bg-red-600/20 text-red-300 hover:bg-red-600/30 border border-red-500/30'
                                  }`}
                                >
                                  {u.blocked ? 'Unblock' : 'Block'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PAYMENTS + FILTERS + EXTEND 30 DAYS */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white">
                  Subscriptions &amp; Payments
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Filter Monthly, Lifetime, or Expired plans and extend expiry by +30 days
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-1">
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'monthly', label: 'Monthly' },
                      { id: 'lifetime', label: 'Lifetime' },
                      { id: 'expired', label: 'Expired' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setPayFilter(f.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                        payFilter === f.id
                          ? 'bg-[#2563EB] text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-semibold hover:bg-slate-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden">
              {filteredPayments.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  No payment records match the selected filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-xs text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Email</th>
                        <th className="px-4 py-3 font-semibold">Plan</th>
                        <th className="px-4 py-3 font-semibold text-right">Amount</th>
                        <th className="px-4 py-3 font-semibold">PID</th>
                        <th className="px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3 font-semibold">Expiry</th>
                        <th className="px-4 py-3 font-semibold">Days Left</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold text-right">Extend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredPayments.map((p) => {
                        const expired = isPaymentExpired(p);
                        return (
                          <tr key={p.key} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-medium text-white">{p.email}</td>
                            <td className="px-4 py-3 text-xs font-bold uppercase text-blue-300">
                              {p.plan}
                            </td>
                            <td className="px-4 py-3 font-mono tabular-nums text-right text-emerald-400">
                              Rs{p.amount}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-300">{p.pid}</td>
                            <td className="px-4 py-3 font-mono tabular-nums text-xs text-slate-400">
                              {p.date ? new Date(p.date).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-4 py-3 font-mono tabular-nums text-xs text-slate-300">
                              {p.expiry ? new Date(p.expiry).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-4 py-3 font-mono tabular-nums text-xs text-slate-200">
                              {getDaysLeftLabel(p)}
                            </td>
                            <td className="px-4 py-3 text-xs font-semibold">
                              <span className={expired ? 'text-red-400' : 'text-emerald-400'}>
                                {expired ? 'Expired' : 'Active'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleExtend30Days(p)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-semibold whitespace-nowrap"
                              >
                                <CalendarPlus className="w-3.5 h-3.5" />
                                <span>Extend 30 Days</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ADS & KEYS */}
        {activeTab === 'adskeys' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                Ads &amp; Payment Keys
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Configure Razorpay Checkout, AdMob/AdSense banner slots, and merchant UPI ID
              </p>
            </div>

            <form
              onSubmit={handleSaveAdsKeys}
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-4"
            >
              <div>
                <label htmlFor="rzp_key" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Razorpay Key ID (`rzp_key`)
                </label>
                <input
                  id="rzp_key"
                  type="text"
                  value={rzpKey}
                  onChange={(e) => setRzpKey(e.target.value)}
                  placeholder="rzp_test_Bil8AHoANei2wA"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label htmlFor="ad_banner" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Ad Banner ID (`ad_banner`)
                </label>
                <input
                  id="ad_banner"
                  type="text"
                  value={adBanner}
                  onChange={(e) => setAdBanner(e.target.value)}
                  placeholder="ca-app-pub-XXXXXXXX/banner"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label htmlFor="ad_inter" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Interstitial Ad ID (`ad_inter`)
                </label>
                <input
                  id="ad_inter"
                  type="text"
                  value={adInter}
                  onChange={(e) => setAdInter(e.target.value)}
                  placeholder="ca-app-pub-XXXXXXXX/interstitial"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label htmlFor="upi_id" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Merchant UPI ID (`upi_id`)
                </label>
                <input
                  id="upi_id"
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="merchant@upi"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Save Keys
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 5: SETTINGS + APPEARANCE + MULTI-DEVICE */}
        {activeTab === 'settings' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                Platform Settings
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Configure theme appearance, single-device enforcement, pricing, and maintenance state
              </p>
            </div>

            {/* Appearance Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {dark ? (
                    <Moon className="w-5 h-5 text-blue-400" />
                  ) : (
                    <Sun className="w-5 h-5 text-amber-400" />
                  )}
                  <h2 className="text-base font-bold text-white">Appearance</h2>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={dark}
                    onChange={() => window.toggleAppTheme?.()}
                    className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-600 bg-slate-950"
                  />
                  <span>Dark Mode</span>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    { id: 'light', label: 'Light' },
                    { id: 'dark', label: 'Dark' },
                    { id: 'auto', label: 'Auto' },
                  ] as const
                ).map((opt) => {
                  const active = themeMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => window.setAppTheme?.(opt.id)}
                      className={`py-2.5 px-3 rounded-lg border text-xs font-bold transition-colors ${
                        active
                          ? 'border-blue-500 bg-blue-600/20 text-white'
                          : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pricing, Single Device & Maintenance Card */}
            <form
              onSubmit={handleSavePricing}
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="lifetime-price"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Lifetime Price (INR)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="lifetime-price"
                    type="number"
                    min={1}
                    value={pricing}
                    onChange={(e) => setPricing(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-mono tabular-nums text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition-colors shrink-0"
                  >
                    Save Price
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowMultiDevice}
                    onChange={(e) => handleAllowMultiToggle(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-600 bg-slate-950"
                  />
                  <span className="text-sm font-semibold text-white">Allow Multi Device</span>
                </label>
                <p className="text-xs text-slate-400 pl-7">
                  When off, each account is locked to 1 active device at a time.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={maintenance}
                    onChange={(e) => handleMaintenanceToggle(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-600 bg-slate-950"
                  />
                  <span className="text-sm font-semibold text-white">Maintenance Mode</span>
                </label>
                <p className="text-xs text-slate-400 pl-7">Home will show maintenance if on</p>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};
