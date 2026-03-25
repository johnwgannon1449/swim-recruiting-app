import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import i18n from '../i18n';

export default function Layout({ children }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function toggleLanguage() {
    const next = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(next);
    localStorage.setItem('language', next);
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header
        className="bg-white sticky top-0 z-10"
        style={{ borderBottom: '1px solid #E8EEF5', boxShadow: '0 1px 4px rgba(30,58,95,0.06)' }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Room4 wordmark */}
          <Link to="/dashboard" className="flex items-center select-none">
            <span className="text-2xl font-bold tracking-tight" style={{ color: '#1E3A5F' }}>
              Room<span style={{ color: '#F59E0B' }}>4</span>AI
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <button
              onClick={toggleLanguage}
              className="text-sm font-medium px-2 py-1 rounded transition-colors text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              {t('language_toggle')}
            </button>

            {user && (
              <>
                <nav className="hidden sm:flex items-center gap-4 text-sm font-medium">
                  <Link
                    to="/dashboard"
                    className={`transition-colors hover:text-primary-600 ${
                      location.pathname === '/dashboard' ? 'text-primary-600' : 'text-gray-500'
                    }`}
                  >
                    {t('nav.dashboard')}
                  </Link>
                  <Link
                    to="/archive"
                    className={`transition-colors hover:text-primary-600 ${
                      location.pathname === '/archive' ? 'text-primary-600' : 'text-gray-500'
                    }`}
                  >
                    {t('nav.archive')}
                  </Link>
                </nav>

                <button onClick={handleLogout} className="btn-secondary text-sm">
                  {t('nav.sign_out')}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
