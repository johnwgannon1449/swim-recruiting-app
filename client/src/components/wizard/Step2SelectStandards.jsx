import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useWizard } from '../../contexts/WizardContext';
import api from '../../utils/api';
import { StandardsRowSkeleton } from '../Skeleton';
import WizardTooltip from '../WizardTooltip';

const GRADES = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const STANDARDS_TYPES = ['ccss-ela', 'ccss-math', 'ngss', 'hss', 'vapa', 'pe', 'cte'];

export default function Step2SelectStandards() {
  const { t } = useTranslation();
  const { state, dispatch } = useWizard();
  const { selectedClass, selectedStandards } = state;

  const [standardsType, setStandardsType] = useState(
    selectedClass?.standards_type || 'ccss-ela'
  );
  const [grade, setGrade] = useState(selectedClass?.grade_level || 'K');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedCode, setExpandedCode] = useState(null);

  const fetchStandards = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ type: standardsType, grade });
      if (query) params.set('q', query);
      const res = await api.get(`/standards?${params}`);
      setResults(res.data.standards);
    } catch {
      setError(t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }, [standardsType, grade, query]);

  // Debounce search
  useEffect(() => {
    const id = setTimeout(fetchStandards, 300);
    return () => clearTimeout(id);
  }, [fetchStandards]);

  function toggleStandard(std) {
    const exists = selectedStandards.find((s) => s.code === std.code);
    if (exists) {
      dispatch({ type: 'SET_STANDARDS', payload: selectedStandards.filter((s) => s.code !== std.code) });
    } else {
      dispatch({ type: 'SET_STANDARDS', payload: [...selectedStandards, std] });
    }
  }

  function isSelected(code) {
    return selectedStandards.some((s) => s.code === code);
  }

  function handleContinue() {
    if (selectedStandards.length === 0) return;
    dispatch({ type: 'NEXT_STEP' });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('wizard.step2.title')}</h1>
      <p className="text-gray-500 mb-6">{t('wizard.step2.subtitle')}</p>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <label className="label">{t('wizard.step2.type_filter')}</label>
          <select
            className="input"
            value={standardsType}
            onChange={(e) => setStandardsType(e.target.value)}
          >
            {STANDARDS_TYPES.map((s) => (
              <option key={s} value={s}>{t(`classes.standards_types.${s}`)}</option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <label className="label">{t('wizard.step2.grade_filter')}</label>
          <select
            className="input"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          >
            {GRADES.map((g) => (
              <option key={g} value={g}>{t(`grades.${g}`)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <WizardTooltip
          id="step2-search"
          title="Search by keyword or code"
          body="Type a topic like 'fractions' or a standard code like 'RL.5' to quickly find the right standards for your lesson."
          position="bottom-left"
        >
          <input
            type="text"
            className="input"
            placeholder={t('wizard.step2.search_placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </WizardTooltip>
      </div>

      {/* Selected count badge */}
      {selectedStandards.length > 0 && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-primary-700 bg-primary-50 px-3 py-1 rounded-full">
            {t('wizard.step2.selected_count', { count: selectedStandards.length })}
          </span>
          <button
            onClick={() => dispatch({ type: 'SET_STANDARDS', payload: [] })}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">
          {error}
        </div>
      )}

      {/* Standards list */}
      <div className="border border-gray-200 rounded-xl overflow-hidden mb-6 max-h-96 overflow-y-auto">
        {loading ? (
          <div>
            {[...Array(5)].map((_, i) => <StandardsRowSkeleton key={i} />)}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">{t('wizard.step2.no_results')}</div>
        ) : (
          results.map((std) => {
            const selected = isSelected(std.code);
            const expanded = expandedCode === std.code;

            return (
              <div
                key={std.code}
                className={`border-b border-gray-100 last:border-0 transition-colors
                  ${selected ? 'bg-primary-50' : 'bg-white hover:bg-gray-50'}`}
              >
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer"
                  onClick={() => toggleStandard(std)}
                >
                  {/* Checkbox */}
                  <div className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors
                    ${selected ? 'bg-primary-600 border-primary-600' : 'border-gray-300'}`}>
                    {selected && <span className="text-white text-xs font-bold">✓</span>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-semibold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded">
                        {std.code}
                      </span>
                      <span className="text-xs text-gray-400">{std.domain}</span>
                    </div>
                    <p className={`text-sm text-gray-700 mt-1 ${expanded ? '' : 'line-clamp-2'}`}>
                      {std.description}
                    </p>
                    {std.description.length > 120 && (
                      <button
                        className="text-xs text-primary-600 hover:text-primary-700 mt-0.5"
                        onClick={(e) => { e.stopPropagation(); setExpandedCode(expanded ? null : std.code); }}
                      >
                        {expanded ? 'Show less' : 'Show more'}
                      </button>
                    )}
                    {/* Sub-standards preview */}
                    {expanded && std.sub_standards?.length > 0 && (
                      <ul className="mt-2 space-y-1 border-l-2 border-primary-200 pl-3">
                        {std.sub_standards.map((sub) => (
                          <li key={sub.code} className="text-xs text-gray-600">
                            <span className="font-mono font-semibold">{sub.code.split('.').pop()}</span>
                            {' — '}{sub.description}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Continue button */}
      <button
        onClick={handleContinue}
        disabled={selectedStandards.length === 0}
        className="btn-primary w-full py-3 text-base"
      >
        {selectedStandards.length === 0
          ? t('wizard.step2.select_to_continue')
          : `${t('wizard.next')} →`}
      </button>
    </div>
  );
}
