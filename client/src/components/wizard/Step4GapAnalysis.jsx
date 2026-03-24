import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useWizard } from '../../contexts/WizardContext';
import api, { withRetry } from '../../utils/api';
import WizardTooltip from '../WizardTooltip';

const LOADING_MESSAGES_KEY = 'wizard.step4.loading_messages';

const STATUS_CONFIG = {
  covered: {
    icon: '✅',
    label: 'wizard.step4.covered',
    bg: 'bg-success-50',
    border: 'border-success-200',
    text: 'text-success-700',
    badge: 'bg-success-100 text-success-800',
  },
  partial: {
    icon: '⚠️',
    label: 'wizard.step4.partial',
    bg: 'bg-warning-50',
    border: 'border-warning-200',
    text: 'text-warning-700',
    badge: 'bg-warning-100 text-warning-800',
  },
  missing: {
    icon: '❌',
    label: 'wizard.step4.missing',
    bg: 'bg-danger-50',
    border: 'border-danger-200',
    text: 'text-danger-700',
    badge: 'bg-red-100 text-red-800',
  },
};

function RotatingMessage({ messages }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % messages.length), 2000);
    return () => clearInterval(id);
  }, [messages.length]);
  return (
    <p className="text-gray-500 text-sm transition-all duration-500 min-h-5">
      {messages[idx]}
    </p>
  );
}

export default function Step4GapAnalysis() {
  const { t } = useTranslation();
  const { state, dispatch } = useWizard();
  const { lessonText, selectedStandards, gapAnalysis } = state;

  const [loading, setLoading] = useState(!gapAnalysis);
  const [error, setError] = useState('');
  const hasFetched = useRef(false);

  const loadingMessages = [
    t('wizard.step4.msg1'),
    t('wizard.step4.msg2'),
    t('wizard.step4.msg3'),
    t('wizard.step4.msg4'),
  ];

  useEffect(() => {
    if (gapAnalysis || hasFetched.current) return;
    hasFetched.current = true;
    runGapAnalysis();
  }, []);

  async function runGapAnalysis() {
    setLoading(true);
    setError('');
    try {
      const res = await withRetry(() =>
        api.post('/analysis/gaps', {
          lesson_text: lessonText,
          standards: selectedStandards.map((s) => ({
            code: s.code,
            description: s.description,
          })),
        })
      );
      dispatch({ type: 'SET_GAP_ANALYSIS', payload: res.data.results });
    } catch (err) {
      setError(err.userMessage || t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  function handleContinue() {
    dispatch({ type: 'NEXT_STEP' });
  }

  // Group results by status
  const grouped = { covered: [], partial: [], missing: [] };
  if (gapAnalysis) {
    for (const item of gapAnalysis) {
      const status = item.coverage_status;
      if (grouped[status]) grouped[status].push(item);
    }
  }

  const hasImprovements = grouped.partial.length + grouped.missing.length > 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        {loading ? t('wizard.step4.title_loading') : t('wizard.step4.title_done')}
      </h1>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-primary-200 rounded-full" />
            <div className="absolute inset-0 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <RotatingMessage messages={loadingMessages} />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="py-8">
          <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl text-danger-700 text-sm mb-4">
            {error}
          </div>
          <button onClick={runGapAnalysis} className="btn-primary">
            Try Again
          </button>
        </div>
      )}

      {/* Results */}
      {!loading && !error && gapAnalysis && (
        <div>
          {/* Summary bar */}
          <WizardTooltip
            id="step4-results"
            title="Reading your gap analysis"
            body="✅ Covered means the standard is well addressed. ⚠️ Partial means it's touched on but could be stronger. ❌ Missing means it needs attention. Continue to get activity suggestions."
            position="bottom-left"
          >
            <div className="flex gap-4 mb-6 flex-wrap">
            {Object.entries(grouped).map(([status, items]) => {
              const cfg = STATUS_CONFIG[status];
              return (
                <div key={status} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${cfg.bg} border ${cfg.border}`}>
                  <span>{cfg.icon}</span>
                  <span className={`text-sm font-medium ${cfg.text}`}>
                    {items.length} {t(cfg.label)}
                  </span>
                </div>
              );
            })}
            </div>
          </WizardTooltip>

          {/* Sections */}
          {['missing', 'partial', 'covered'].map((status) => {
            const items = grouped[status];
            if (!items.length) return null;
            const cfg = STATUS_CONFIG[status];

            return (
              <div key={status} className="mb-8">
                <h2 className={`text-base font-semibold mb-3 flex items-center gap-2 ${cfg.text}`}>
                  <span>{cfg.icon}</span> {t(cfg.label)}
                </h2>
                <div className="space-y-3">
                  {items.map((item) => {
                    const std = selectedStandards.find((s) => s.code === item.standard_code);
                    return (
                      <div key={item.standard_code} className={`p-4 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <span className="text-xs font-mono font-semibold bg-white bg-opacity-70 px-2 py-0.5 rounded">
                            {item.standard_code}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                            {Math.round((item.confidence_score || 0.8) * 100)}% confidence
                          </span>
                        </div>
                        {std && (
                          <p className="text-xs text-gray-500 mt-1 mb-2 line-clamp-1">{std.description}</p>
                        )}
                        <p className={`text-sm ${cfg.text} leading-relaxed`}>{item.explanation}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Continue */}
          <div className="mt-4 space-y-2">
            <button onClick={handleContinue} className="btn-primary w-full py-3 text-base">
              {hasImprovements ? `${t('wizard.next')} — See Recommendations →` : `${t('wizard.next')} →`}
            </button>
            <button onClick={runGapAnalysis} className="btn-secondary w-full text-sm">
              Re-analyze
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
