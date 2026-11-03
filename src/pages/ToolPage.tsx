import React, { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Header } from '../components/Header';
import { toolsList } from '../data/toolsList';
import { useToast } from '../context/ToastContext';
import { checkPremiumExpiry, verifySingleDeviceSession } from '../utils/sessionGuards';
import { TOOL_COMPONENTS } from '../utils/toolRegistry';

export const ToolPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

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

  const resolvedId =
    id === 'background-blur' || id === 'blur-background' ? 'blur-image' : id;
  const tool = toolsList.find((t) => t.id === resolvedId);

  const renderWorkingTool = (toolId: string) => {
    const ActiveComponent = TOOL_COMPONENTS[toolId];
    return ActiveComponent ? <ActiveComponent /> : null;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
      <Header showSearch={false} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All 50 Tools</span>
          </Link>
        </div>

        {!tool ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-10 text-center space-y-3">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Tool Not Found</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No utility found with ID &ldquo;{id}&rdquo;.
            </p>
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
            >
              Return Home
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-start gap-4 pb-5 border-b border-slate-200 dark:border-slate-700">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-slate-900 border border-blue-100 dark:border-slate-700 flex items-center justify-center text-2xl shrink-0">
                {tool.icon}
              </div>
              <div>
                <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  {tool.category} · Live Working Tool
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {tool.name}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {tool.description}
                </p>
              </div>
            </div>

            <div className="tool-workspace">{renderWorkingTool(tool.id)}</div>
          </div>
        )}
      </main>
    </div>
  );
};
