import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Crown, Wrench } from 'lucide-react';
import { Header } from '../components/Header';
import { CATEGORIES, ToolCategory, toolsList } from '../data/toolsList';
import { useToast } from '../context/ToastContext';
import { checkPremiumExpiry, verifySingleDeviceSession } from '../utils/sessionGuards';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | ToolCategory>('All');

  useEffect(() => {
    checkPremiumExpiry();
    if (!verifySingleDeviceSession()) {
      showToast('Logged out - account used on another device', 'error');
      navigate('/login', { replace: true });
      return;
    }
    if (!localStorage.getItem('userRole')) {
      navigate('/login');
    }
  }, [navigate, showToast]);

  const isMaintenance = localStorage.getItem('maintenance') === 'true';
  const userRole = localStorage.getItem('userRole');
  const isPremium = localStorage.getItem('isPremium') === 'true';
  const premiumExpired = localStorage.getItem('premiumExpired') === 'true';
  const adBannerId = localStorage.getItem('ad_banner') || 'ca-app-pub-XXXXXXXX';

  const expStr = localStorage.getItem('premiumExpiry');
  const planStr = localStorage.getItem('premiumPlan');
  let proStatusLabel = 'Pro Lifetime';
  if (isPremium && planStr === 'monthly' && expStr) {
    const expDate = new Date(expStr);
    if (!isNaN(expDate.getTime())) {
      const days = Math.max(0, Math.ceil((expDate.getTime() - Date.now()) / 86400000));
      proStatusLabel = `Pro Monthly - ${expDate.toLocaleDateString()} - ${days}d left`;
    }
  }

  const filteredTools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return toolsList.filter((tool) => {
      const matchesCat = selectedCategory === 'All' || tool.category === selectedCategory;
      const matchesSearch =
        !q ||
        tool.name.toLowerCase().includes(q) ||
        tool.id.toLowerCase().includes(q) ||
        tool.category.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  if (isMaintenance) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-5">
          <Wrench className="w-7 h-7 text-blue-400" />
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
          Under Maintenance - Back Soon
        </h1>
        <p className="text-sm sm:text-base text-slate-400 mt-3 max-w-md">
          We are performing scheduled upgrades on My Toolset. Please check back shortly.
        </p>
        <div className="mt-8 flex items-center gap-4 text-xs text-slate-400">
          {userRole === 'admin' ? (
            <Link
              to="/admin/dashboard"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              Return to Admin Dashboard
            </Link>
          ) : (
            <Link to="/login" className="hover:text-white underline">
              Admin Sign In
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showSearch={true}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Subscription Status / Expired Renewal Strip */}
        {isPremium && (
          <div className="rounded-xl border border-amber-300/70 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-900/20 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-300">
              <Crown className="w-4 h-4 shrink-0" />
              <span>{proStatusLabel}</span>
            </div>
            {planStr === 'monthly' && (
              <Link
                to="/premium"
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Upgrade to Lifetime
              </Link>
            )}
          </div>
        )}

        {!isPremium && premiumExpired && (
          <div className="rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
            <span className="font-medium text-red-800 dark:text-red-300">
              Your Monthly Pro plan has expired. Renew anytime to remove ads again.
            </span>
            <Link
              to="/premium"
              className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Renew Pro →
            </Link>
          </div>
        )}

        {/* Top Ad Slot for non-Premium */}
        {!isPremium && (
          <div className="w-full h-24 bg-gray-100 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center px-4 text-center">
            <span className="text-xs sm:text-sm font-mono text-slate-500 dark:text-slate-400">
              Ad Banner ID: {adBannerId}
            </span>
          </div>
        )}

        {/* Hero Section */}
        <section className="text-center max-w-2xl mx-auto space-y-2.5 pt-2">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white text-balance">
            My Toolset - 50+ Tools in One Place
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Fast, Private, Works Offline - No upload to server
          </p>
        </section>

        {/* Category Filter Bar */}
        <section className="flex items-center justify-start sm:justify-center overflow-x-auto pb-1">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </section>

        {/* 50 Working Tools Grid */}
        <section>
          {filteredTools.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-3">
              <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
                No tools match &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Try clearing your search or switching back to All categories.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
              {filteredTools.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => navigate(`/tool/${tool.id}`)}
                  className="group text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 p-4 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all duration-150 flex flex-col justify-between gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <div className="flex items-start justify-between gap-2 w-full">
                    <span
                      className="text-2xl leading-none select-none"
                      role="img"
                      aria-label={tool.name}
                    >
                      {tool.icon}
                    </span>
                    <span
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400"
                      title="Working Tool"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="hidden sm:inline">Working</span>
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                      {tool.name}
                    </h2>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <span>{tool.category}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Bottom Ad Slot for non-Premium */}
        {!isPremium && (
          <div className="w-full h-24 bg-gray-100 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center px-4 text-center">
            <span className="text-xs sm:text-sm font-mono text-slate-500 dark:text-slate-400">
              Ad Banner ID: {adBannerId}
            </span>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-5 px-4 sm:px-6 text-center text-xs text-slate-500 dark:text-slate-400">
        My Toolset · All 50 Client-Side Utilities Live · Private &amp; Offline Ready
      </footer>
    </div>
  );
};
