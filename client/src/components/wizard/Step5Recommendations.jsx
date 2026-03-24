import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useWizard } from '../../contexts/WizardContext';
import api, { withRetry } from '../../utils/api';
import WizardTooltip from '../WizardTooltip';

function RotatingMessage({ messages }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % messages.length), 2000);
    return () => clearInterval(id);
  }, [messages.length]);
  return <p className="text-sm min-h-5" style={{ color: '#64748B' }}>{messages[idx]}</p>;
}

function CoverageBar({ gapAnalysis, selectedStandards }) {
  const total = selectedStandards?.length || 0;
  const covered = gapAnalysis?.filter((r) => r.coverage_status === 'covered').length || 0;
  const pct = total > 0 ? Math.round((covered / total) * 100) : 0;

  return (
    <div className="mb-7">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium" style={{ color: '#374151' }}>Standards Coverage</span>
        <span className="text-sm font-semibold tabular-nums" style={{ color: '#16a34a' }}>{pct}%</span>
      </div>
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: 14, backgroundColor: '#E2E8F0' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: '#22C55E' }}
        />
      </div>
      <p className="text-xs mt-1.5" style={{ color: '#94a3b8' }}>
        {covered} of {total} standard{total !== 1 ? 's' : ''} covered going into this step
      </p>
    </div>
  );
}

export default function Step5Recommendations() {
  const { t } = useTranslation();
  const { state, dispatch } = useWizard();
  const { lessonText, selectedClass, gapAnalysis, recommendations, selectedStandards } = state;

  const [loading, setLoading] = useState(recommendations.length === 0);
  const [error, setError] = useState('');
  const [customAdditions, setCustomAdditions] = useState(state.customAdditions || '');
  const hasFetched = useRef(false);

  const loadingMessages = [
    t('wizard.step5.msg1'),
    t('wizard.step5.msg2'),
    t('wizard.step5.msg3'),
  ];

  useEffect(() => {
    if (recommendations.length > 0 || hasFetched.current) return;
    const needsWork = gapAnalysis?.filter(
      (r) => r.coverage_status === 'partial' || r.coverage_status === 'missing'
    );
    if (!needsWork?.length) {
      setLoading(false);
      return;
    }
    hasFetched.current = true;
    fetchRecommendations();
  }, []);

  async function fetchRecommendations() {
    setLoading(true);
    setError('');
    try {
      const res = await withRetry(() =>
        api.post('/analysis/recommendations', {
          lesson_text: lessonText,
          grade: selectedClass?.grade_level || 'K',
          subject: selectedClass?.subject || '',
          gap_results: gapAnalysis || [],
        })
      );
      const recs = res.data.recommendations.map((r) => ({
        ...r,
        _status: 'pending',
        _editedText: '',
        _editing: false,
      }));
      dispatch({ type: 'SET_RECOMMENDATIONS', payload: recs });
    } catch (err) {
      setError(err.userMessage || t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  function setRecStatus(idx, status) {
    dispatch({ type: 'UPDATE_RECOMMENDATION', index: idx, payload: { _status: status, _editing: false } });
  }

  function toggleEdit(idx) {
    const rec = recommendations[idx];
    if (!rec._editing) {
      dispatch({
        type: 'UPDATE_RECOMMENDATION',
        index: idx,
        payload: { _editing: true, _editedText: rec._editedText || rec.description },
      });
    } else {
      dispatch({
        type: 'UPDATE_RECOMMENDATION',
        index: idx,
        payload: { _editing: false, _status: 'edited' },
      });
    }
  }

  function handleEditText(idx, value) {
    dispatch({ type: 'UPDATE_RECOMMENDATION', index: idx, payload: { _editedText: value } });
  }

  function handleContinue() {
    dispatch({ type: 'SET_CUSTOM_ADDITIONS', payload: customAdditions });

    const accepted = recommendations.filter(
      (r) => r._status === 'accepted' || r._status === 'edited'
    );

    let merged = lessonText;
    if (accepted.length > 0) {
      merged += '\n\n--- Recommended Additions ---\n\n';
      merged += accepted
        .map((r) => {
          const desc = r._status === 'edited' && r._editedText ? r._editedText : r.description;
          const materials = Array.isArray(r.materials) ? r.materials.join(', ') : r.materials;
          return `${r.activity_title} (${r.time_estimate})\n${desc}\nMaterials: ${materials || 'None'}`;
        })
        .join('\n\n');
    }
    if (customAdditions.trim()) {
      merged += '\n\n--- Teacher\'s Own Additions ---\n\n' + customAdditions;
    }

    dispatch({ type: 'SET_FINALIZED_TEXT', payload: merged });
    dispatch({ type: 'NEXT_STEP' });
  }

  const needsWork = gapAnalysis?.filter(
    (r) => r.coverage_status === 'partial' || r.coverage_status === 'missing'
  ) || [];

  const recsWithIndex = recommendations.map((r, i) => ({ ...r, _globalIndex: i }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#1E293B' }}>{t('wizard.step5.title')}</h1>
      <p className="mb-6" style={{ color: '#64748B' }}>{t('wizard.step5.subtitle')}</p>

      {/* Coverage progress bar */}
      {!loading && gapAnalysis?.length > 0 && (
        <CoverageBar gapAnalysis={gapAnalysis} selectedStandards={selectedStandards} />
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-primary-100 rounded-full" />
            <div className="absolute inset-0 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <RotatingMessage messages={loadingMessages} />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="py-8">
          <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl text-sm text-danger-700 mb-4">
            {error}
          </div>
          <button onClick={fetchRecommendations} className="btn-primary">Try Again</button>
        </div>
      )}

      {/* No improvements needed */}
      {!loading && !error && needsWork.length === 0 && (
        <div className="text-center py-10 mb-6 bg-white rounded-xl"
          style={{ border: '1px solid #E8EEF5', boxShadow: '0 1px 4px rgba(30,58,95,0.07)' }}>
          <div className="text-4xl mb-3">🌟</div>
          <p className="font-semibold" style={{ color: '#1E293B' }}>Your lesson already covers all selected standards well!</p>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>You can still add your own ideas below, or continue to review.</p>
        </div>
      )}

      {/* Recommendation cards */}
      {!loading && !error && recommendations.length > 0 && (
        <div className="space-y-7 mb-8">
          {needsWork.map((gap) => {
            const recs = recsWithIndex.filter((r) => r.standard_code === gap.standard_code);
            if (!recs.length) return null;

            return (
              <div key={gap.standard_code}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#64748B' }}>
                  <span className="font-mono bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded text-xs">
                    {gap.standard_code}
                  </span>
                  <span>{gap.coverage_status === 'missing' ? '❌ Missing' : '⚠️ Partial'}</span>
                </h3>
                <div className="space-y-3">
                  {recs.map((rec) => {
                    const idx = rec._globalIndex;
                    const isDismissed = rec._status === 'dismissed';
                    const isAccepted = rec._status === 'accepted' || rec._status === 'edited';
                    const materialsText = Array.isArray(rec.materials) ? rec.materials.join(', ') : rec.materials;

                    return (
                      <div
                        key={idx}
                        className="rounded-xl transition-all"
                        style={{
                          border: `1px solid ${isDismissed ? '#e5e7eb' : isAccepted ? '#86efac' : '#E8EEF5'}`,
                          backgroundColor: isDismissed ? '#f9fafb' : isAccepted ? '#f0fdf4' : '#ffffff',
                          opacity: isDismissed ? 0.5 : 1,
                          boxShadow: '0 1px 4px rgba(30,58,95,0.05)',
                        }}
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                            <h4 className="font-semibold text-sm" style={{ color: '#1E293B' }}>{rec.activity_title}</h4>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {isDismissed ? (
                                <button
                                  onClick={() => setRecStatus(idx, 'pending')}
                                  className="text-xs px-2 py-1 border rounded"
                                  style={{ color: '#9ca3af', borderColor: '#e5e7eb' }}
                                >
                                  Undo
                                </button>
                              ) : (
                                <>
                                  <WizardTooltip
                                    id="step5-accept"
                                    title="Accept to add to your lesson"
                                    body="Click ✅ to merge this activity into your lesson plan. Use ✏️ Edit to customize it first. Dismiss anything that doesn't fit."
                                    position="bottom-right"
                                  >
                                    <button
                                      onClick={() => setRecStatus(idx, isAccepted ? 'pending' : 'accepted')}
                                      className={`text-xs px-2 py-1 rounded border transition-colors min-h-[36px]
                                        ${isAccepted
                                          ? 'border-success-400 bg-success-100 text-success-800'
                                          : 'border-success-300 text-success-700 hover:bg-success-50'}`}
                                    >
                                      {isAccepted ? `✓ ${t('wizard.step5.accepted')}` : `✅ ${t('wizard.step5.accept')}`}
                                    </button>
                                  </WizardTooltip>
                                  <button
                                    onClick={() => toggleEdit(idx)}
                                    className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                                  >
                                    ✏️ {rec._editing ? 'Done' : t('wizard.step5.edit')}
                                  </button>
                                  <button
                                    onClick={() => setRecStatus(idx, 'dismissed')}
                                    className="text-xs px-2 py-1 rounded border border-danger-200 text-danger-600 hover:bg-danger-50"
                                  >
                                    ✕
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {rec._editing ? (
                            <textarea
                              className="input text-sm min-h-24 resize-y"
                              value={rec._editedText || rec.description}
                              onChange={(e) => handleEditText(idx, e.target.value)}
                            />
                          ) : (
                            <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
                              {rec._status === 'edited' && rec._editedText ? rec._editedText : rec.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-3 mt-3 text-xs" style={{ color: '#94a3b8' }}>
                            <span>⏱ {t('wizard.step5.time', { time: rec.time_estimate })}</span>
                            {materialsText && (
                              <span>📦 {t('wizard.step5.materials', { materials: materialsText })}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Custom additions */}
      {!loading && (
        <div className="mb-6">
          <label className="label">{t('wizard.step5.add_own')}</label>
          <textarea
            className="input min-h-28 resize-y text-sm"
            placeholder={t('wizard.step5.add_own_placeholder')}
            value={customAdditions}
            onChange={(e) => setCustomAdditions(e.target.value)}
          />
        </div>
      )}

      {/* Continue */}
      {!loading && (
        <button onClick={handleContinue} className="btn-primary w-full py-3 text-base">
          {t('wizard.next')} — Review & Finalize →
        </button>
      )}
    </div>
  );
}
