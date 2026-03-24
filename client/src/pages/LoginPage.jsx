import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get('expired') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.userMessage || t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <span className="text-5xl">📚</span>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">{t('auth.welcome_back')}</h1>
          <p className="mt-2 text-sm text-gray-600">{t('auth.sign_in_subtitle')}</p>
        </div>

        <div className="mt-8 bg-white py-8 px-6 shadow-sm rounded-xl border border-gray-200 sm:px-10">
          {sessionExpired && (
            <div className="mb-4 p-3 bg-warning-50 border border-warning-200 rounded-lg text-sm text-warning-700">
              Your session has expired. Please sign in again to continue.
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="label">{t('auth.email')}</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                placeholder={t('auth.email_placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="label">{t('auth.password')}</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className="input"
                placeholder={t('auth.password_placeholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5"
            >
              {loading ? t('auth.signing_in') : t('auth.sign_in')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            {t('auth.no_account')}{' '}
            <Link to="/signup" className="font-medium text-primary-600 hover:text-primary-500">
              {t('auth.sign_up')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
