import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useWizard } from '../../contexts/WizardContext';
import api, { withRetry } from '../../utils/api';
import WizardTooltip from '../WizardTooltip';

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
    <p className="text-sm transition-all duration-500 min-h-5" style={{ color: '#64748B' }}>
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

  // Build compact summary bullets (max 5)
  function buildSummaryBullets() {
    const bullets = [];

    if (grouped.covered.length > 0) {
      const codes = grouped.covered.slice(0, 3).map((i) => i.standard_code).join(', ');
      const extra = grouped.covered.length > 3 ? ` +${grouped.covered.length - 3} more` : '';
      bullets.push({
        icon: '✓',
        color: '#16a34a',
        label: 'Strengths',
        text: `Your lesson covers ${grouped.covered.length} standard${grouped.covered.length !== 1 ? 's' : ''} well: ${codes}${extra}.`,
      });
    }

    if (grouped.partial.length > 0) {
      const codes = grouped.partial.map((i) => i.standard_code).join(', ');
      bullets.push({
        icon: '⚠',
        color: '#d97706',
        label: 'Partially covered',
        text: `${codes} — addressed but could be strengthened.`,
      });
    }

    if (grouped.missing.length > 0) {
      const codes = grouped.missing.map((i) => i.standard_code).join(', ');
      bullets.push({
        icon: '✗',
        color: '#dc2626',
        label: 'Gaps to address',
        text: `${codes} — not yet covered in this lesson.`,
      });
    }

    // One focused recommendation
    const topGap = grouped.missing[0] || grouped.partial[0];
    if (topGap?.explanation) {
      bullets.push({
        icon: '→',
        color: '#1e3a5f',
        label: 'Focus area',
        text: topGap.explanation,
      });
    }

    return bullets;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#1E293B' }}>
        {loading ? t('wizard.step4.title_loading') : t('wizard.step4.title_done')}
      </h1>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-primary-100 rounded-full" />
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
          {/* Summary count badges */}
          <WizardTooltip
            id="step4-results"
            title="Reading your gap analysis"
            body="✅ Covered means the standard is well addressed. ⚠️ Partial means it's touched on but could be stronger. ❌ Missing means it needs attention. Continue to get activity suggestions."
            position="bottom-left"
          >
            <div className="flex gap-3 mb-6 flex-wrap">
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

          {/* High-level summary card */}
          <div className="bg-white rounded-xl p-6 mb-6 space-y-4"
            style={{ border: '1px solid #E8EEF5', boxShadow: '0 1px 4px rgba(30,58,95,0.07)' }}>
            {buildSummaryBullets().map((bullet, i) => (
              <div key={i} className="flex gap-3">
                <span
                  className="mt-0.5 text-base font-bold flex-shrink-0 w-5 text-center"
                  style={{ color: bullet.color }}
                >
                  {bullet.icon}
                </span>
                <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
                  <span className="font-semibold" style={{ color: '#1E293B' }}>{bullet.label}: </span>
                  {bullet.text}
                </p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-2">
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
