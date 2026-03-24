import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { LessonCardSkeleton } from '../components/Skeleton';

const GRADES = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const STANDARDS_TYPES = ['ccss-ela', 'ccss-math', 'ngss', 'hss', 'vapa', 'pe', 'cte'];

export default function ArchivePage() {
  const { t } = useTranslation();

  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  const [filterGrade, setFilterGrade] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    fetchLessons(1);
  }, [filterGrade, filterType]);

  async function fetchLessons(page = 1) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (filterGrade) params.set('grade_level', filterGrade);
      if (filterType) params.set('standards_type', filterType);
      const res = await api.get(`/lessons?${params}`);
      setLessons(res.data.lessons);
      setPagination(res.data.pagination);
    } catch {
      setError(t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  const hasActiveFilters = filterGrade || filterType;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('nav.archive')}</h1>
          <p className="text-gray-500 mt-0.5">
            {pagination.total > 0
              ? `${pagination.total} saved lesson${pagination.total !== 1 ? 's' : ''}`
              : 'Your saved lesson plans'}
          </p>
        </div>
        <Link to="/wizard" className="btn-primary text-sm min-h-[44px] flex items-center">
          ✨ New Lesson
        </Link>
      </div>

      {/* Filters — full on tablet+, collapsible on mobile */}
      <div className="mb-6">
        {/* Mobile toggle */}
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className="sm:hidden flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 min-h-[44px] mb-2"
        >
          🔍 Filter
          {hasActiveFilters && (
            <span className="ml-1 w-2 h-2 rounded-full bg-primary-600 inline-block" />
          )}
          <span className="ml-auto text-gray-400">{filtersOpen ? '▲' : '▼'}</span>
        </button>

        <div className={`flex flex-wrap gap-3 ${filtersOpen ? 'flex' : 'hidden sm:flex'}`}>
          <select
            className="input w-auto text-sm min-h-[44px]"
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
          >
            <option value="">All Grades</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>{t(`grades.${g}`)}</option>
            ))}
          </select>
          <select
            className="input w-auto text-sm min-h-[44px]"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Standards</option>
            {STANDARDS_TYPES.map((s) => (
              <option key={s} value={s}>{t(`classes.standards_types.${s}`)}</option>
            ))}
          </select>
          {hasActiveFilters && (
            <button
              onClick={() => { setFilterGrade(''); setFilterType(''); }}
              className="text-sm text-gray-400 hover:text-gray-600 px-2 min-h-[44px]"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <LessonCardSkeleton key={i} />)}
        </div>
      ) : lessons.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">📂</div>
          <p className="font-semibold text-gray-800 text-lg">
            {hasActiveFilters ? 'No lessons match these filters' : 'Your archive is empty'}
          </p>
          <p className="text-sm text-gray-500 mt-2 mb-6 max-w-sm mx-auto">
            {hasActiveFilters
              ? 'Try adjusting your filters or clear them to see all lessons.'
              : 'Finish your first lesson analysis and save it to see it here. Your formatted lesson plans will be stored and ready to download anytime.'}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={() => { setFilterGrade(''); setFilterType(''); }}
              className="btn-secondary inline-flex items-center gap-2"
            >
              Clear Filters
            </button>
          ) : (
            <Link to="/wizard" className="btn-primary inline-flex items-center gap-2">
              ✨ Analyze a Lesson
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} t={t} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-8 flex-wrap">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => fetchLessons(p)}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors min-h-[44px]
                ${p === pagination.page
                  ? 'bg-primary-600 text-white'
                  : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LessonCard({ lesson, t }) {
  const standards = Array.isArray(lesson.standards_covered) ? lesson.standards_covered : [];
  const dateStr = new Date(lesson.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
  const gradeLabel = lesson.grade_level
    ? t(`grades.${lesson.grade_level}`, { defaultValue: `Grade ${lesson.grade_level}` })
    : null;

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{lesson.title || 'Untitled Lesson'}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {[lesson.class_nickname, gradeLabel, lesson.subject].filter(Boolean).join(' · ')}
            {' · '}{dateStr}
          </p>
          {/* Standards chips */}
          {standards.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {standards.slice(0, 5).map((s, i) => (
                <span
                  key={i}
                  className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full font-mono"
                >
                  {typeof s === 'string' ? s : s.code}
                </span>
              ))}
              {standards.length > 5 && (
                <span className="text-xs text-gray-400 self-center">+{standards.length - 5} more</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400">{dateStr}</span>
          {lesson.pdf_url && (
            <a
              href={lesson.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 min-h-[44px] px-2 py-1 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
            >
              ⬇️ Download PDF
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
