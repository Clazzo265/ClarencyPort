import { AnimatePresence, MotionConfig } from 'motion/react';
import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SyncStatusProvider } from './context/SyncStatusContext';
import { PublicPortfolioPage } from './pages/PublicPortfolioPage';

const AdminPage = lazy(() => import('./pages/AdminPage'));

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('KLARENCY ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#050816] px-4 text-center text-[#F8FAFC]">
          <div className="max-w-md rounded-2xl border border-slate-400/20 bg-[#080D1C] p-8">
            <h1 className="font-display text-xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-[#94A3B8]">
              An unexpected interface error occurred. Reloading the page usually restores normal
              operation.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 min-h-[44px] rounded-lg bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white"
            >
              Reload KLARENCY
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PublicPortfolioPage />} />
        <Route
          path="/admin"
          element={
            <Suspense
              fallback={
                <div className="flex min-h-screen items-center justify-center bg-[#050816] text-sm text-[#94A3B8]">
                  Loading Owner Studio…
                </div>
              }
            >
              <AdminPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <SyncStatusProvider>
            <BrowserRouter>
              <AnimatedRoutes />
            </BrowserRouter>
          </SyncStatusProvider>
        </AuthProvider>
      </MotionConfig>
    </AppErrorBoundary>
  );
}
