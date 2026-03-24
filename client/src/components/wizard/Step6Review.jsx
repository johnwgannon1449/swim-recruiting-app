import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useWizard } from '../../contexts/WizardContext';
import api from '../../utils/api';
import Modal from '../Modal';

const DEBOUNCE_MS = 30000; // 30 seconds of inactivity

const STATUS_ICONS = { covered: '✅', partial: '⚠️', missing: '❌' };
const STATUS_COLORS = {
  covered: '#16a34a',
  partial: '#d97706',
  missing: '#dc2626',
};

export default function Step6Review() {
  const { t } = useTranslation();
  const { state, dispatch } = useWizard();
  const { finalizedText, selectedStandards } = state;

  const [text, setText] = useState(finalizedText || '');
  const [coverage, setCoverage] = useState([]);
  const [checkingCoverage, setCheckingCoverage] = useState(false);
  const [coverageDrawerOpen, setCoverageDrawerOpen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [lostStandards, setLostStandards] = useState([]);
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
    // Check if edits caused any previously-covered standards to lose coverage
    if (coverage.length > 0 && state.gapAnalysis?.length > 0) {
      const currentMap = {};
      for (const item of coverage) currentMap[item.standard_code] = item.status;

      const lost = state.gapAnalysis
        .filter((g) => g.coverage_status === 'covered')
        .filter((g) => currentMap[g.standard_code] && currentMap[g.standard_code] !== 'covered')
        .map((g) => g.standard_code);

      if (lost.length > 0) {
        setLostStandards(lost);
        setShowWarning(true);
        return;
      }
    }
    doFinalize();
  }

  function doFinalize() {
    dispatch({ type: 'SET_FINALIZED_TEXT', payload: text });
    dispatch({ type: 'NEXT_STEP' });
  }

  // Merge gap analysis + coverage check for display
  const coverageMap = {};
  for (const item of coverage) {
    coverageMap[item.standard_code] = item.status;
  }
  if (!coverage.length && state.gapAnalysis) {
    for (const item of state.gapAnalysis) {
      coverageMap[item.standard_code] = item.coverage_status;
    }
  }

  const CoveragePanel = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: '#374151' }}>
          {t('wizard.step6.coverage_sidebar')}
        </h3>
        {checkingCoverage && (
          <div className="w-3.5 h-3.5 rounded-full animate-spin flex-shrink-0"
            style={{ border: '2px solid #d6e0ee', borderTopColor: '#1e3a5f' }} />
        )}
      </div>

      {selectedStandards.length === 0 ? (
        <p className="text-xs" style={{ color: '#94a3b8' }}>No standards selected.</p>
      ) : (
        <ul className="space-y-2.5">
          {selectedStandards.map((std) => {
            const status = coverageMap[std.code];
            return (
              <li key={std.code} className="flex items-start gap-2">
                <span className="text-sm mt-0.5 flex-shrink-0">
                  {status ? STATUS_ICONS[status] : '○'}
                </span>
                <div className="min-w-0">
                  <span
                    className="text-xs font-mono font-medium block truncate"
                    style={{ color: status ? STATUS_COLORS[status] : '#94a3b8' }}
                  >
                    {std.code.split('.').slice(-2).join('.')}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button
        onClick={() => runCoverageCheck(text)}
        disabled={checkingCoverage || !text.trim()}
        className="mt-5 w-full text-xs btn-secondary py-1.5 min-h-[44px]"
      >
        {checkingCoverage ? (
          <span className="flex items-center justify-center gap-1.5">
            <span className="w-3 h-3 rounded-full animate-spin" style={{ border: '2px solid #d6e0ee', borderTopColor: '#1e3a5f' }} />
            Checking…
          </span>
        ) : '↻ Check Now'}
      </button>
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#1E293B' }}>{t('wizard.step6.title')}</h1>
      <p className="mb-6" style={{ color: '#64748B' }}>{t('wizard.step6.subtitle')}</p>

      {/* Mobile coverage toggle */}
      <div className="lg:hidden mb-5">
        <button
          onClick={() => setCoverageDrawerOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium min-h-[44px]"
          style={{ backgroundColor: '#F8FAFC', border: '1px solid #E8EEF5', color: '#374151' }}
        >
          <span>📊 {t('wizard.step6.coverage_sidebar')}</span>
          <span style={{ color: '#94a3b8' }}>{coverageDrawerOpen ? '▲' : '▼'}</span>
        </button>
        {coverageDrawerOpen && (
          <div className="mt-2 p-4 rounded-xl" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E8EEF5' }}>
            <CoveragePanel />
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main editor */}
        <div className="flex-1">
          <textarea
            className="w-full rounded-xl text-sm leading-relaxed font-mono resize-y"
            style={{
              minHeight: 420,
              padding: '16px',
              border: '1px solid #E8EEF5',
              backgroundColor: '#ffffff',
              color: '#1E293B',
              boxShadow: '0 1px 4px rgba(30,58,95,0.05)',
              outline: 'none',
            }}
            value={text}
            onChange={handleTextChange}
            placeholder="Your lesson plan will appear here..."
            onFocus={(e) => { e.target.style.borderColor = '#1e3a5f'; e.target.style.boxShadow = '0 0 0 3px rgba(30,58,95,0.1)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#E8EEF5'; e.target.style.boxShadow = '0 1px 4px rgba(30,58,95,0.05)'; }}
          />
          <p className="text-xs mt-1.5 text-right" style={{ color: '#94a3b8' }}>{text.length} characters</p>
        </div>

        {/* Coverage sidebar — desktop only */}
        <div className="hidden lg:block lg:w-56 flex-shrink-0">
          <div className="p-4 rounded-xl sticky top-24" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E8EEF5' }}>
            <CoveragePanel />
          </div>
        </div>
      </div>

      {/* Finalize button */}
      <div className="mt-7">
        <button
          onClick={handleFinalize}
          disabled={!text.trim()}
          className="btn-primary w-full py-3 text-base min-h-[44px]"
        >
          {t('wizard.step6.finalize')} →
        </button>
      </div>

      {/* Coverage Warning Modal */}
      <Modal open={showWarning} onClose={() => setShowWarning(false)}>
        <h2 className="text-lg font-semibold mb-2" style={{ color: '#1E293B' }}>Coverage Warning</h2>
        <p className="text-sm mb-5" style={{ color: '#374151', lineHeight: 1.6 }}>
          Your edits may have reduced coverage for:{' '}
          <span className="font-mono font-semibold" style={{ color: '#1E293B' }}>
            {lostStandards.join(', ')}
          </span>. Continue anyway?
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setShowWarning(false)}
            className="btn-secondary"
          >
            Go Back
          </button>
          <button
            onClick={() => { setShowWarning(false); doFinalize(); }}
            className="btn-accent"
          >
            Continue Anyway
          </button>
        </div>
      </Modal>
    </div>
  );
}
