import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useWizard } from '../../contexts/WizardContext';
import api from '../../utils/api';

const DEBOUNCE_MS = 30000; // 30 seconds of inactivity

const STATUS_ICONS = { covered: '✅', partial: '⚠️', missing: '❌' };
const STATUS_COLORS = {
  covered: 'text-success-700',
  partial: 'text-warning-700',
  missing: 'text-danger-700',
};

export default function Step6Review() {
  const { t } = useTranslation();
  const { state, dispatch } = useWizard();
  const { finalizedText, selectedStandards } = state;

  const [text, setText] = useState(finalizedText || '');
  const [coverage, setCoverage] = useState([]);
  const [checkingCoverage, setCheckingCoverage] = useState(false);
  const [coverageDrawerOpen, setCoverageDrawerOpen] = useState(false);
  const debounceTimer = useRef(null);
  const lastCheckedText = useRef('');

  // Run initial coverage check
  useEffect(() => {
    if (text && selectedStandards.length > 0) {
      debouncedCoverageCheck(text);
    }
  }, []);

  const debouncedCoverageCheck = useCallback((newText) => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (newText === lastCheckedText.current) return;
      runCoverageCheck(newText);
    }, DEBOUNCE_MS);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => clearTimeout(debounceTimer.current), []);

  async function runCoverageCheck(checkText) {
    if (!checkText.trim() || !selectedStandards.length) return;
    lastCheckedText.current = checkText;
    setCheckingCoverage(true);
    try {
      const res = await api.post('/analysis/coverage-check', {
        text: checkText,
        standards: selectedStandards.map((s) => ({ code: s.code, description: s.description })),
      });
      setCoverage(res.data.coverage || []);
    } catch {
      // Coverage check failure is non-blocking
    } finally {
      setCheckingCoverage(false);
    }
  }

  function handleTextChange(e) {
    const newText = e.target.value;
    setText(newText);
    debouncedCoverageCheck(newText);
  }

  function handleFinalize() {
    dispatch({ type: 'SET_FINALIZED_TEXT', payload: text });
    dispatch({ type: 'NEXT_STEP' });
  }

  // Merge gap analysis + coverage check for display
  const coverageMap = {};
  for (const item of coverage) {
    coverageMap[item.standard_code] = item.status;
  }
  // Fall back to gap analysis data if coverage check hasn't run yet
  if (!coverage.length && state.gapAnalysis) {
    for (const item of state.gapAnalysis) {
      coverageMap[item.standard_code] = item.coverage_status;
    }
  }

  const CoveragePanel = () => (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          {t('wizard.step6.coverage_sidebar')}
        </h3>
        {checkingCoverage && (
          <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {selectedStandards.length === 0 ? (
        <p className="text-xs text-gray-400">No standards selected.</p>
      ) : (
        <ul className="space-y-2">
          {selectedStandards.map((std) => {
            const status = coverageMap[std.code];
            return (
              <li key={std.code} className="flex items-start gap-2">
                <span className="text-sm mt-0.5 flex-shrink-0">
                  {status ? STATUS_ICONS[status] : '○'}
                </span>
                <div className="min-w-0">
                  <span className={`text-xs font-mono font-medium block truncate ${status ? STATUS_COLORS[status] : 'text-gray-400'}`}>
                    {std.code.split('.').slice(-2).join('.')}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!checkingCoverage && coverage.length === 0 && (
        <p className="text-xs text-gray-400 mt-3 italic">
          {t('wizard.step6.coverage_hint')}
        </p>
      )}

      <button
        onClick={() => runCoverageCheck(text)}
        disabled={checkingCoverage || !text.trim()}
        className="mt-4 w-full text-xs btn-secondary py-1.5 min-h-[44px]"
      >
        {checkingCoverage ? t('wizard.step6.checking') : '↻ Check Now'}
      </button>
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('wizard.step6.title')}</h1>
      <p className="text-gray-500 mb-4">{t('wizard.step6.subtitle')}</p>

      {/* Mobile coverage toggle button */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setCoverageDrawerOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 min-h-[44px]"
        >
          <span>📊 {t('wizard.step6.coverage_sidebar')}</span>
          <span className="text-gray-400">{coverageDrawerOpen ? '▲' : '▼'}</span>
        </button>
        {coverageDrawerOpen && (
          <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <CoveragePanel />
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main editor */}
        <div className="flex-1">
          <textarea
            className="input min-h-[400px] sm:min-h-[480px] resize-y text-sm leading-relaxed font-mono w-full"
            value={text}
            onChange={handleTextChange}
            placeholder="Your lesson plan will appear here..."
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{text.length} characters</p>
        </div>

        {/* Coverage sidebar — desktop only */}
        <div className="hidden lg:block lg:w-56 flex-shrink-0">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sticky top-24">
            <CoveragePanel />
          </div>
        </div>
      </div>

      {/* Finalize button — min 44px */}
      <div className="mt-6">
        <button
          onClick={handleFinalize}
          disabled={!text.trim()}
          className="btn-primary w-full py-3 text-base min-h-[44px]"
        >
          {t('wizard.step6.finalize')} →
        </button>
      </div>
    </div>
  );
}
