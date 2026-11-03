/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ToastProvider, useToast } from './context/ToastContext';
import { OfflineIndicator } from './components/OfflineIndicator';
import { generateMTIconDataUrl } from './hooks/usePWAInstall';
import {
  checkPremiumExpiry,
  getOrCreateDeviceId,
  registerGlobalThemeHelpers,
  verifySingleDeviceSession,
} from './utils/sessionGuards';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { PremiumPage } from './pages/PremiumPage';
import { ToolPage } from './pages/ToolPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminToolsCheckerPage } from './pages/AdminToolsCheckerPage';

const SessionMonitor: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    const runChecks = () => {
      const expiredNow = checkPremiumExpiry();
      if (expiredNow) {
        showToast('Your Monthly Pro subscription has expired.', 'info');
      }

      if (location.pathname !== '/login') {
        const validDevice = verifySingleDeviceSession();
        if (!validDevice) {
          showToast('Logged out - account used on another device', 'error');
          navigate('/login', { replace: true });
        }
      }
    };

    runChecks();
    window.addEventListener('storage', runChecks);
    window.addEventListener('focus', runChecks);
    return () => {
      window.removeEventListener('storage', runChecks);
      window.removeEventListener('focus', runChecks);
    };
  }, [location.pathname, navigate, showToast]);

  return null;
};

export default function App() {
  useEffect(() => {
    registerGlobalThemeHelpers();
    getOrCreateDeviceId();
    checkPremiumExpiry();

    try {
      const th = localStorage.getItem('appTheme');
      if (th === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (th === 'light') {
        document.documentElement.classList.remove('dark');
      }
    } catch {
      // ignore
    }

    const icon192 = generateMTIconDataUrl(192);
    if (icon192) {
      let appleLink = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
      if (!appleLink) {
        appleLink = document.createElement('link');
        appleLink.rel = 'apple-touch-icon';
        document.head.appendChild(appleLink);
      }
    }
  }, []);

  return (
    <ToastProvider>
      <BrowserRouter>
        <SessionMonitor />
        <OfflineIndicator />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/premium" element={<PremiumPage />} />
          <Route path="/tool/:id" element={<ToolPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/tools-checker" element={<AdminToolsCheckerPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
