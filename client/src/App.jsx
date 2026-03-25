import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import ArchivePage from './pages/ArchivePage';
import WizardPage from './pages/WizardPage';

function SplashScreen({ fading }) {
  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center ${fading ? 'splash-fade-out' : ''}`}
      style={{ backgroundColor: '#1E3A5F' }}
    >
      <h1 className="text-5xl font-bold text-white tracking-tight mb-3">
        Room<span style={{ color: '#F59E0B' }}>4</span>AI
      </h1>
      <p className="text-sm mb-10" style={{ color: '#94b8d8' }}>
        Lesson planning, elevated.
      </p>
      <div
        className="w-7 h-7 rounded-full animate-spin"
        style={{ border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff' }}
      />
    </div>
  );
}

export default function App() {
  const [splashPhase, setSplashPhase] = useState(() =>
    sessionStorage.getItem('r4_splash') ? 'done' : 'visible'
  );

  useEffect(() => {
    if (splashPhase !== 'visible') return;
    const t1 = setTimeout(() => setSplashPhase('fading'), 1200);
    const t2 = setTimeout(() => {
      setSplashPhase('done');
      sessionStorage.setItem('r4_splash', '1');
    }, 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <ErrorBoundary>
      {splashPhase !== 'done' && <SplashScreen fading={splashPhase === 'fading'} />}
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/archive"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ArchivePage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/wizard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <WizardPage />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
