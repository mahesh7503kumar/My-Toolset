import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Mail, Smartphone } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import {
  DeviceLockRecord,
  getDeviceNameLabel,
  getOrCreateDeviceId,
  isCurrentlyDark,
} from '../utils/sessionGuards';

export interface StoredUser {
  email: string;
  role?: string;
  date: string;
  isPro?: boolean;
  blocked?: boolean;
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [dark, setDark] = useState<boolean>(() => isCurrentlyDark());
  const [conflictLock, setConflictLock] = useState<{
    emailLower: string;
    role: string;
    existing: DeviceLockRecord;
  } | null>(null);

  useEffect(() => {
    const syncTheme = () => setDark(isCurrentlyDark());
    window.addEventListener('themeChange', syncTheme);
    return () => window.removeEventListener('themeChange', syncTheme);
  }, []);

  const restoreUserProState = (emailLower: string) => {
    try {
      let latestActive: { plan: string; expiry: string } | null = null;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('pay_')) {
          const rec = JSON.parse(localStorage.getItem(k) || '{}');
          if ((rec.email || '').toLowerCase() === emailLower) {
            const expTime = rec.expiry ? new Date(rec.expiry).getTime() : Date.now() + 86400000 * 36500;
            if (!isNaN(expTime) && expTime > Date.now()) {
              latestActive = {
                plan: rec.plan || 'lifetime',
                expiry: rec.expiry || new Date(expTime).toISOString(),
              };
            }
          }
        }
      }
      if (latestActive) {
        localStorage.setItem('isPremium', 'true');
        localStorage.setItem('premiumPlan', latestActive.plan);
        localStorage.setItem('premiumExpiry', latestActive.expiry);
        localStorage.removeItem('premiumExpired');
      }
    } catch {
      // ignore
    }
  };

  const doLogin = (emailLower: string, role: string) => {
    localStorage.setItem('userEmail', emailLower);
    localStorage.setItem('userRole', role);

    try {
      let arr: StoredUser[] = JSON.parse(localStorage.getItem('allUsers') || '[]');
      if (!Array.isArray(arr)) arr = [];
      if (!arr.find((x) => (x.email || '').toLowerCase() === emailLower)) {
        arr.push({
          email: emailLower,
          role,
          date: new Date().toISOString(),
          isPro: false,
          blocked: false,
        });
        localStorage.setItem('allUsers', JSON.stringify(arr));
      }
    } catch {
      localStorage.setItem(
        'allUsers',
        JSON.stringify([{ email: emailLower, role, date: new Date().toISOString() }])
      );
    }

    restoreUserProState(emailLower);

    if (role === 'admin') {
      showToast('Welcome back, Super Admin');
      navigate('/admin/dashboard');
    } else {
      showToast('Signed in to My Toolset');
      navigate('/');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emailLower = email.toLowerCase().trim();
    if (!emailLower || !password.trim()) {
      showToast('Please enter both email and password', 'error');
      return;
    }

    const role = emailLower === 'mahesh7503kumar@gmail.com' ? 'admin' : 'user';

    try {
      const allUsers: StoredUser[] = JSON.parse(localStorage.getItem('allUsers') || '[]');
      if (Array.isArray(allUsers)) {
        const found = allUsers.find((u) => (u.email || '').toLowerCase() === emailLower);
        if (found?.blocked && role !== 'admin') {
          showToast('This account has been blocked by the administrator.', 'error');
          return;
        }
      }
    } catch {
      // ignore
    }

    const curDeviceId = getOrCreateDeviceId();
    const lockKey = 'device_lock_' + emailLower;
    let existing: DeviceLockRecord | null = null;
    try {
      const raw = localStorage.getItem(lockKey);
      if (raw) existing = JSON.parse(raw);
    } catch {
      existing = null;
    }

    const allowMulti = localStorage.getItem('allowMultiDevice') === 'true';
    if (!allowMulti && existing && existing.deviceId && existing.deviceId !== curDeviceId) {
      setConflictLock({ emailLower, role, existing });
      return;
    }

    try {
      const nd: DeviceLockRecord = {
        email: emailLower,
        deviceId: curDeviceId,
        deviceName: getDeviceNameLabel(),
        loginTime: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      };
      localStorage.setItem(lockKey, JSON.stringify(nd));
    } catch {
      // ignore
    }

    doLogin(emailLower, role);
  };

  const handleSwitchDeviceConfirm = () => {
    if (!conflictLock) return;
    const { emailLower, role } = conflictLock;
    const curDeviceId = getOrCreateDeviceId();
    const lockKey = 'device_lock_' + emailLower;
    try {
      const nl: DeviceLockRecord = {
        email: emailLower,
        deviceId: curDeviceId,
        deviceName: getDeviceNameLabel(),
        loginTime: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      };
      localStorage.setItem(lockKey, JSON.stringify(nl));
    } catch {
      // ignore
    }
    setConflictLock(null);
    doLogin(emailLower, role);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center px-4 py-12 relative transition-colors">
      {/* Top right theme switcher */}
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={() => window.toggleAppTheme?.()}
          className="p-2.5 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-lg leading-none border border-slate-200 dark:border-slate-700 transition-colors"
          title="Toggle theme"
        >
          {dark ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3B82F6] via-[#2563EB] to-[#1D4ED8] flex items-center justify-center text-white font-extrabold text-lg tracking-tight shadow-sm mb-3">
            MT
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Sign in to My Toolset
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Access 50+ fast, private, offline-capable utilities
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter any password"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors mt-2"
          >
            <span>Login</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
          Fast · Private · Single-Device Protected
        </div>
      </div>

      {/* Single-Device Conflict Modal */}
      {conflictLock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Device Already Active
              </h2>
            </div>

            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed">
              <p>
                This email is currently active on{' '}
                <strong className="text-slate-900 dark:text-white">
                  {conflictLock.existing.deviceName || 'another device'}
                </strong>
                .
              </p>
              {conflictLock.existing.lastActive && (
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  Last active: {new Date(conflictLock.existing.lastActive).toLocaleString()}
                </p>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                Switching will sign out the previous device immediately.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConflictLock(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSwitchDeviceConfirm}
                className="px-4 py-2 rounded-lg bg-[#2563EB] text-sm font-semibold text-white hover:bg-blue-700"
              >
                Yes, Switch Device
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
