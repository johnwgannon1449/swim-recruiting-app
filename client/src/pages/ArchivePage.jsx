import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';

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
        <Link to="/wizard" className="btn-primary text-sm">
          ✨ New Lesson
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          className="input w-auto text-sm"
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
        >
          <option value="">All Grades</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>{t(`grades.${g}`)}</option>
          ))}
        </select>
        <select
          className="input w-auto text-sm"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">All Standards</option>
          {STANDARDS_TYPES.map((s) => (
            <option key={s} value={s}>{t(`classes.standards_types.${s}`)}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">{t('loading.default')}</div>
      ) : lessons.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-4xl mb-3">📂</div>
          <p className="font-medium text-gray-700">No lessons archived yet.</p>
          <p className="text-sm text-gray-500 mt-1 mb-5">
            Complete your first lesson analysis to see it here.
          </p>
          <Link to="/wizard" className="btn-primary">
            ✨ Analyze a Lesson
          </Link>
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
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => fetchLessons(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors
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
      <div className="flex items-start justify-between gap-4">
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
                <span className="text-xs text-gray-400">+{standards.length - 5} more</span>
              )}
            </div>
          )}
        </div>
        <div className="text-xs text-gray-400 flex-shrink-0 mt-1">{dateStr}</div>
      </div>
    </div>
  );
}
