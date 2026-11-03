import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  FlaskConical,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Wrench,
  XCircle,
} from 'lucide-react';
import { CATEGORIES, ToolCategory, ToolItem, toolsList } from '../data/toolsList';
import { useToast } from '../context/ToastContext';
import { copyToClipboard } from '../utils/fileHelpers';
import { isCurrentlyDark, verifySingleDeviceSession } from '../utils/sessionGuards';
import { runSingleToolHealthCheck, ToolHealthResult } from '../utils/toolRegistry';

type StatusFilter = 'all' | 'pass' | 'fail' | 'unchecked';

export const AdminToolsCheckerPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [results, setResults] = useState<Record<string, ToolHealthResult>>({});
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [autoRunning, setAutoRunning] = useState<boolean>(false);
  const [progressCount, setProgressCount] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<'All' | ToolCategory>('All');
  const [dark, setDark] = useState<boolean>(() => isCurrentlyDark());

  useEffect(() => {
    if (!verifySingleDeviceSession()) {
      showToast('Logged out - account used on another device', 'error');
      navigate('/login', { replace: true });
      return;
    }
    if (localStorage.getItem('userRole') !== 'admin') {
      showToast('Super Admin access required', 'error');
      navigate('/login', { replace: true });
      return;
    }

    const syncTheme = () => setDark(isCurrentlyDark());
    window.addEventListener('themeChange', syncTheme);
    return () => window.removeEventListener('themeChange', syncTheme);
  }, [navigate, showToast]);

  const handleCheckSingle = useCallback(
    async (tool: ToolItem) => {
      setCheckingId(tool.id);
      const res = await runSingleToolHealthCheck(tool);
      setResults((prev) => ({ ...prev, [tool.id]: res }));
      setCheckingId(null);

      if (res.status === 'pass') {
        showToast(`${tool.name}: PASS`, 'success');
      } else {
        showToast(`${tool.name}: FAIL — ${res.reason || 'Diagnostic error'}`, 'error');
      }
    },
    [showToast]
  );

  const handleAutoCheckAll = useCallback(async () => {
    if (autoRunning) return;
    setAutoRunning(true);
    setProgressCount(0);

    let passCount = 0;
    let failCount = 0;
    const nextResults: Record<string, ToolHealthResult> = {};

    for (let i = 0; i < toolsList.length; i++) {
      const tool = toolsList[i];
      setCheckingId(tool.id);
      const res = await runSingleToolHealthCheck(tool);
      nextResults[tool.id] = res;
      if (res.status === 'pass') passCount += 1;
      else failCount += 1;

      setResults((prev) => ({ ...prev, [tool.id]: res }));
      setProgressCount(i + 1);
      // Small yield so UI smoothly updates progress across all 50 cards
      await new Promise((resolve) => setTimeout(resolve, 14));
    }

    setCheckingId(null);
    setAutoRunning(false);
    showToast(
      `Health Check Complete: ${passCount}/${toolsList.length} Working, ${failCount} Failing`,
      failCount === 0 ? 'success' : 'info'
    );
  }, [autoRunning, showToast]);

  const handleResetAll = () => {
    if (autoRunning) return;
    setResults({});
    setProgressCount(0);
    setStatusFilter('all');
    showToast('Cleared all health check results', 'info');
  };

  const handleSimulateSampleFaults = () => {
    if (autoRunning) return;
    const nowTime = new Date().toLocaleTimeString();
    setResults((prev) => ({
      ...prev,
      'blur-image': {
        status: 'fail',
        reason: 'Canvas filter not supported',
        details: 'Simulated fault on CanvasRenderingContext2D.filter',
        durationMs: 2,
        checkedAt: nowTime,
      },
      'png-to-jpg': {
        status: 'fail',
        reason: 'Upload handler missing',
        details: 'Simulated missing FileReader upload handler',
        durationMs: 1,
        checkedAt: nowTime,
      },
      'pdf-to-images': {
        status: 'fail',
        reason: 'Preview not updating',
        details: 'Simulated stale canvas output preview',
        durationMs: 3,
        checkedAt: nowTime,
      },
    }));
    showToast('Simulated 3 sample faults — click "Fix This Tool" or "Auto Check All" to re-verify', 'info');
  };

  const handleCopyFixPrompt = async (tool: ToolItem, reason?: string) => {
    const issueText = reason || 'Runtime health check failed';
    const promptText = [
      `Fix "${tool.name}" (Tool ID: "${tool.id}", Category: ${tool.category}) in My Toolset.`,
      `Detected Failure Reason: ${issueText}.`,
      `Requirements:`,
      `1. Ensure the "${tool.id}" component in ToolPage renders cleanly in both light and dark mode with zero runtime errors.`,
      `2. Resolve "${issueText}" with proper browser fallback support, working file/input handlers, live preview updates, and working download/copy actions.`,
      `3. Do not break any of the other 49 tools, Monthly/Lifetime Pro plans, Single-Device Lock, or Dark Mode.`,
    ].join('\n');

    const copied = await copyToClipboard(promptText);
    if (copied) {
      showToast(`Copied fix prompt for "${tool.name}"`, 'success');
    } else {
      showToast('Failed to copy fix prompt to clipboard', 'error');
    }
  };

  const totalCount = toolsList.length; // 50
  const { workingCount, failingCount, uncheckedCount, percentage } = useMemo(() => {
    let pass = 0;
    let fail = 0;
    for (const tool of toolsList) {
      const r = results[tool.id];
      if (r?.status === 'pass') pass += 1;
      else if (r?.status === 'fail') fail += 1;
    }
    const unchecked = totalCount - pass - fail;
    const pct = totalCount > 0 ? Math.round((pass / totalCount) * 100) : 0;
    return {
      workingCount: pass,
      failingCount: fail,
      uncheckedCount: unchecked,
      percentage: pct,
    };
  }, [results, totalCount]);

  const filteredTools = useMemo(() => {
    return toolsList.filter((tool) => {
      if (categoryFilter !== 'All' && tool.category !== categoryFilter) {
        return false;
      }
      const r = results[tool.id];
      if (statusFilter === 'pass') return r?.status === 'pass';
      if (statusFilter === 'fail') return r?.status === 'fail';
      if (statusFilter === 'unchecked') return !r;
      return true;
    });
  }, [categoryFilter, results, statusFilter]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Admin Dashboard</span>
            </Link>

            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Super Admin Only</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <span>Live App</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <button
              type="button"
              onClick={() => window.toggleAppTheme?.()}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-base leading-none transition-colors"
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Page Title & Primary Action */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
              <Activity className="w-4 h-4" />
              <span>2-Minute Diagnostic Suite</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Tools Health Checker - 50 Tools Status
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Verify component bindings, 1x1 Canvas &amp; blur filters, FileReader uploads, PDF engines, QR codecs, and text/math execution across all 50 tools.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleAutoCheckAll}
              disabled={autoRunning}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 text-sm font-bold shadow-sm transition-colors cursor-pointer"
            >
              {autoRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>
                    Checking {progressCount}/{totalCount}...
                  </span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Auto Check All</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSimulateSampleFaults}
              disabled={autoRunning}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer"
              title="Simulate 3 failing tools to test failure reasons and Fix This Tool prompt copy"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Test Fail UI</span>
            </button>

            <button
              type="button"
              onClick={handleResetAll}
              disabled={autoRunning}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Top Summary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Tools
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {totalCount}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {uncheckedCount} unchecked
            </div>
          </div>

          <div className="rounded-xl border-2 border-emerald-500/60 dark:border-emerald-500/50 bg-white dark:bg-slate-800 p-4 sm:p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Working (PASS)
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
              {workingCount}
            </div>
            <div className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1">
              Green verified tools
            </div>
          </div>

          <div className="rounded-xl border-2 border-red-500/60 dark:border-red-500/50 bg-white dark:bg-slate-800 p-4 sm:p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
              Failing (FAIL)
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-red-600 dark:text-red-400 mt-1">
              {failingCount}
            </div>
            <div className="text-xs text-red-700/80 dark:text-red-400/80 mt-1">
              {failingCount === 0 ? 'Zero errors detected' : 'Action required below'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Health Percentage
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-1">
              {percentage}%
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden mt-2">
              <div
                className={`h-full transition-all duration-200 ${
                  failingCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                } ${
                  percentage === 100
                    ? 'w-full'
                    : percentage >= 90
                    ? 'w-11/12'
                    : percentage >= 75
                    ? 'w-3/4'
                    : percentage >= 50
                    ? 'w-1/2'
                    : percentage > 0
                    ? 'w-1/4'
                    : 'w-0'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Status & Category Filters */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: `All (${totalCount})` },
                { id: 'pass', label: `Working (${workingCount})` },
                { id: 'fail', label: `Failing (${failingCount})` },
                { id: 'unchecked', label: `Unchecked (${uncheckedCount})` },
              ] as Array<{ id: StatusFilter; label: string }>
            ).map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => {
              const active = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* 50 Tools Diagnostic Grid */}
        {filteredTools.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-10 text-center">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              No tools match the selected filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTools.map((tool) => {
              const indexNum = toolsList.findIndex((t) => t.id === tool.id) + 1;
              const res = results[tool.id];
              const isChecking = checkingId === tool.id;
              const isPass = res?.status === 'pass';
              const isFail = res?.status === 'fail';

              const borderClass = isPass
                ? 'border-2 border-emerald-500 dark:border-emerald-500'
                : isFail
                ? 'border-2 border-red-500 dark:border-red-500'
                : 'border border-slate-200 dark:border-slate-700';

              return (
                <div
                  key={tool.id}
                  className={`rounded-xl bg-white dark:bg-slate-800 p-4 shadow-sm flex flex-col justify-between gap-3.5 transition-all ${borderClass}`}
                >
                  <div className="space-y-2.5">
                    {/* Header Row: Icon + Index + Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xl shrink-0">
                          {tool.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono font-bold text-slate-400 dark:text-slate-500">
                              #{indexNum}
                            </span>
                            <span className="inline-block rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                              {tool.category}
                            </span>
                          </div>
                          <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
                            {tool.name}
                          </h2>
                        </div>
                      </div>

                      {isPass && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>PASS</span>
                        </span>
                      )}

                      {isFail && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-700 px-2 py-0.5 text-[11px] font-extrabold text-red-700 dark:text-red-300 shrink-0">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>FAIL</span>
                        </span>
                      )}

                      {!res && !isChecking && (
                        <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                          IDLE
                        </span>
                      )}
                    </div>

                    {/* Diagnostic Output / Reason */}
                    {isPass && res && (
                      <div className="rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-2 text-xs text-emerald-800 dark:text-emerald-300">
                        <div className="font-semibold">{res.details}</div>
                        <div className="text-[11px] opacity-80 font-mono mt-0.5">
                          {res.durationMs}ms · {res.checkedAt}
                        </div>
                      </div>
                    )}

                    {isFail && res && (
                      <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 px-2.5 py-2 text-xs text-red-800 dark:text-red-200 space-y-1">
                        <div className="flex items-start gap-1.5 font-bold text-red-700 dark:text-red-300">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>Reason: {res.reason || 'Runtime diagnostic failed'}</span>
                        </div>
                        <div className="text-[11px] text-red-700/80 dark:text-red-300/80">
                          {res.details}
                        </div>
                      </div>
                    )}

                    {!res && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        Click Check Now to verify {tool.category} runtime APIs and component handler.
                      </p>
                    )}
                  </div>

                  {/* Card Footer Buttons */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/70 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                      <button
                        type="button"
                        onClick={() => handleCheckSingle(tool)}
                        disabled={isChecking || autoRunning}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 disabled:opacity-50 text-white px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        {isChecking ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Testing...</span>
                          </>
                        ) : (
                          <span>Check Now</span>
                        )}
                      </button>

                      {isFail && (
                        <button
                          type="button"
                          onClick={() => handleCopyFixPrompt(tool, res?.reason)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer"
                          title="Copy specific fix prompt for this failing tool"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Fix This Tool</span>
                          <Copy className="w-3 h-3 opacity-80" />
                        </button>
                      )}
                    </div>

                    <Link
                      to={`/tool/${tool.id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                      title={`Open ${tool.name}`}
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
