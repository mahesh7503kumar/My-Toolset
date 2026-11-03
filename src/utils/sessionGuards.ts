export type ThemeChoice = 'light' | 'dark' | 'auto';

declare global {
  interface Window {
    toggleAppTheme: () => void;
    setAppTheme: (theme: ThemeChoice) => void;
  }
}

export interface DeviceLockRecord {
  email: string;
  deviceId: string;
  deviceName: string;
  loginTime: string;
  lastActive: string;
}

export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem('deviceId');
    if (existing) return existing;
    const nid = 'DEV_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('deviceId', nid);
    return nid;
  } catch {
    return 'DEV_LOCAL';
  }
}

export function getDeviceNameLabel(): string {
  try {
    const plat = navigator.platform || 'Browser';
    const ua = (navigator.userAgent || '').substring(0, 40);
    return `${plat} · ${ua}`.trim();
  } catch {
    return 'Web Browser';
  }
}

export function checkPremiumExpiry(): boolean {
  try {
    const exp = localStorage.getItem('premiumExpiry');
    if (exp) {
      const d = new Date(exp);
      if (!isNaN(d.getTime()) && d.getTime() < Date.now()) {
        localStorage.removeItem('isPremium');
        localStorage.removeItem('premiumPlan');
        localStorage.setItem('premiumExpired', 'true');
        return true; // expired now
      }
    }
  } catch {
    // ignore storage read issues
  }
  return false;
}

/**
 * Verifies single-device lock for the currently signed-in user.
 * Returns false and clears session if another device took over the lock.
 */
export function verifySingleDeviceSession(): boolean {
  try {
    if (localStorage.getItem('allowMultiDevice') === 'true') return true;
    const userEmail = (localStorage.getItem('userEmail') || '').toLowerCase().trim();
    if (!userEmail) return true;
    const did = localStorage.getItem('deviceId');
    const raw = localStorage.getItem('device_lock_' + userEmail);
    if (!raw || !did) return true;
    const lock: DeviceLockRecord = JSON.parse(raw);
    if (lock && lock.deviceId && lock.deviceId !== did) {
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userRole');
      localStorage.removeItem('isPremium');
      return false;
    }
    // Update lastActive heartbeat safely
    lock.lastActive = new Date().toISOString();
    localStorage.setItem('device_lock_' + userEmail, JSON.stringify(lock));
    return true;
  } catch {
    return true;
  }
}

export function isCurrentlyDark(): boolean {
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark');
  }
  return false;
}

export function getStoredThemeMode(): ThemeChoice {
  try {
    const raw = localStorage.getItem('appTheme');
    if (raw === 'dark' || raw === 'light') return raw;
    return 'auto';
  } catch {
    return 'auto';
  }
}

export function registerGlobalThemeHelpers(): void {
  if (typeof window === 'undefined') return;

  window.toggleAppTheme = function () {
    try {
      const currentlyDark = document.documentElement.classList.contains('dark');
      const nxt = currentlyDark ? 'light' : 'dark';
      localStorage.setItem('appTheme', nxt);
      if (nxt === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      window.dispatchEvent(new Event('themeChange'));
    } catch {
      // ignore
    }
  };

  window.setAppTheme = function (theme: ThemeChoice) {
    try {
      if (theme === 'auto') {
        localStorage.removeItem('appTheme');
        const sys =
          window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (sys) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } else {
        localStorage.setItem('appTheme', theme);
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      window.dispatchEvent(new Event('themeChange'));
    } catch {
      // ignore
    }
  };
}

// Register immediately so any component can invoke window.toggleAppTheme / window.setAppTheme safely
registerGlobalThemeHelpers();
