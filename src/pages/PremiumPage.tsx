import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Crown, ShieldCheck, Zap } from 'lucide-react';
import { Header } from '../components/Header';
import { useToast } from '../context/ToastContext';
import { StoredUser } from './LoginPage';
import {
  checkPremiumExpiry,
  getOrCreateDeviceId,
  verifySingleDeviceSession,
} from '../utils/sessionGuards';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

export const PremiumPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeCheckout, setActiveCheckout] = useState<'monthly' | 'lifetime' | null>(null);

  const ensureRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true));
        existingScript.addEventListener('error', () => resolve(false));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  useEffect(() => {
    checkPremiumExpiry();
    if (!verifySingleDeviceSession()) {
      showToast('Logged out - account used on another device', 'error');
      navigate('/login', { replace: true });
      return;
    }
    if (!localStorage.getItem('userRole')) {
      navigate('/login');
      return;
    }
    // Preload Razorpay Checkout SDK so button click is instant
    ensureRazorpayScript();
  }, [navigate, showToast]);

  const isPremium = localStorage.getItem('isPremium') === 'true';
  const currentPlan = localStorage.getItem('premiumPlan') || '';
  const currentExpiry = localStorage.getItem('premiumExpiry') || '';
  const lifetimePrice = Number(localStorage.getItem('pricing') || '1999') || 1999;
  const upiId = localStorage.getItem('upi_id') || '';

  const handlePay = async (type: 'monthly' | 'lifetime') => {
    if (activeCheckout) return;
    setActiveCheckout(type);
    const ready = await ensureRazorpayScript();
    setActiveCheckout(null);

    if (!ready || !window.Razorpay) {
      showToast('Payment SDK loading, please check connection and refresh', 'error');
      return;
    }

    const plan = type;
    const amt = plan === 'monthly' ? 29900 : lifetimePrice * 100;
    const exp =
      plan === 'monthly'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();

    const key = localStorage.getItem('rzp_key') || 'rzp_test_Bil8AHoANei2wA';
    const userEmail = (localStorage.getItem('userEmail') || 'user@test.com').toLowerCase();

    const opts = {
      key,
      amount: amt,
      currency: 'INR',
      name: 'My Toolset Pro',
      description: `${plan} plan`,
      prefill: { email: userEmail },
      handler: function (r: { razorpay_payment_id: string }) {
        try {
          localStorage.setItem('isPremium', 'true');
          localStorage.setItem('premiumPlan', plan);
          localStorage.setItem('premiumExpiry', exp);
          localStorage.removeItem('premiumExpired');

          const payData = {
            email: userEmail,
            plan,
            pid: r.razorpay_payment_id,
            amount: plan === 'monthly' ? 299 : lifetimePrice,
            date: new Date().toISOString(),
            expiry: exp,
            deviceId: getOrCreateDeviceId(),
          };
          localStorage.setItem('pay_' + Date.now(), JSON.stringify(payData));

          try {
            const allUsers: StoredUser[] = JSON.parse(localStorage.getItem('allUsers') || '[]');
            if (Array.isArray(allUsers)) {
              const updated = allUsers.map((u) =>
                (u.email || '').toLowerCase() === userEmail ? { ...u, isPro: true } : u
              );
              localStorage.setItem('allUsers', JSON.stringify(updated));
            }
          } catch {
            // ignore
          }

          showToast(`Pro Activated (${plan})`);
          navigate('/');
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Payment save error', 'error');
        }
      },
      theme: { color: '#2563eb' },
    };

    const rz = new window.Razorpay(opts);
    rz.open();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
      <Header showSearch={false} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>

        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Choose Your My Toolset Pro Plan
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Unlock an ad-free workspace across all 50 browser-native tools.
          </p>
        </div>

        {isPremium && (
          <div className="max-w-3xl mx-auto rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
            <span className="font-semibold">
              Active Plan: {currentPlan === 'monthly' ? 'Monthly Pro' : 'Lifetime Pro'}
              {currentPlan === 'monthly' && currentExpiry
                ? ` · Valid until ${new Date(currentExpiry).toLocaleDateString()}`
                : ''}
            </span>
            <Link to="/" className="font-bold underline">
              Open Tools →
            </Link>
          </div>
        )}

        {/* Two Side-by-Side Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch">
          {/* Card 1: Monthly Pro */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-7 sm:p-8 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="inline-block rounded-md bg-blue-100 dark:bg-blue-900/50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">
                  POPULAR
                </span>
                <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Monthly Pro
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Flexible 30-day access for solo creators
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4">
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                  Rs299{' '}
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400 font-sans">
                    /month
                  </span>
                </div>
              </div>

              <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
                {['No Ads', 'All 50 Tools', '1 Device Only', 'Monthly Support'].map((feat) => (
                  <li key={feat} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-medium">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => handlePay('monthly')}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
            >
              <span>
                {activeCheckout === 'monthly' ? 'Opening Checkout...' : 'Pay Rs299 Monthly'}
              </span>
            </button>
          </div>

          {/* Card 2: Lifetime Pro */}
          <div className="rounded-2xl border-2 border-yellow-400 bg-white dark:bg-slate-800 p-7 sm:p-8 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="inline-block rounded-md bg-amber-100 dark:bg-amber-900/50 px-2.5 py-1 text-xs font-bold text-amber-800 dark:text-amber-300">
                  LIFETIME
                </span>
                <Crown className="w-5 h-5 text-yellow-500" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Lifetime Pro
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Pay once, own forever — zero recurring renewals
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 space-y-0.5">
                <div className="text-xs text-slate-400 font-mono tabular-nums">
                  MRP <span className="line-through">Rs5999</span>
                </div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                  Rs{lifetimePrice}{' '}
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 font-sans">
                    Lifetime
                  </span>
                </div>
              </div>

              <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
                {[
                  'Everything in Monthly Pro',
                  'All 50 Tools Unlocked Forever',
                  'Lifetime Updates Included',
                  'Priority Support',
                ].map((feat) => (
                  <li key={feat} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-medium">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => handlePay('lifetime')}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-yellow-400 transition-colors"
            >
              <span>
                {activeCheckout === 'lifetime'
                  ? 'Opening Checkout...'
                  : `Pay Rs${lifetimePrice} Lifetime`}
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-2">
          <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            Secured by Razorpay Checkout{upiId ? ` · UPI: ${upiId}` : ''}
          </span>
        </div>
      </main>
    </div>
  );
};
