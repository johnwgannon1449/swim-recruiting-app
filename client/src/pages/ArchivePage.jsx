import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { LessonCardSkeleton } from '../components/Skeleton';
import Modal from '../components/Modal';

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

  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/lessons/${deleteId}`);
      setLessons((prev) => prev.filter((l) => l.id !== deleteId));
      setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
    } catch {
      setError('Could not delete lesson. Please try again.');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  const hasActiveFilters = filterGrade || filterType;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E293B' }}>{t('nav.archive')}</h1>
          <p className="mt-0.5" style={{ color: '#64748B' }}>
            {pagination.total > 0
              ? `${pagination.total} saved lesson${pagination.total !== 1 ? 's' : ''}`
              : 'Your saved lesson plans'}
          </p>
        </div>
        <Link to="/wizard" className="btn-primary text-sm min-h-[44px] flex items-center">
          ✨ New Lesson
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6">
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
          <p className="font-semibold text-lg" style={{ color: '#1E293B' }}>
            {hasActiveFilters ? 'No lessons match these filters' : 'Your archive is empty'}
          </p>
          <p className="text-sm mt-2 mb-6 max-w-sm mx-auto" style={{ color: '#64748B' }}>
            {hasActiveFilters
              ? 'Try adjusting your filters or clear them to see all lessons.'
              : 'Finish your first lesson analysis and save it to see it here.'}
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
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              t={t}
              onDelete={() => setDeleteId(lesson.id)}
            />
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

      {/* Delete confirm modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)}>
        <h2 className="text-lg font-semibold mb-2" style={{ color: '#1E293B' }}>Delete this lesson?</h2>
        <p className="text-sm mb-5" style={{ color: '#64748B', lineHeight: 1.6 }}>
          This can't be undone. The lesson and any associated data will be permanently removed.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setDeleteId(null)} className="btn-secondary" disabled={deleting}>
            Cancel
          </button>
          <button onClick={handleDelete} className="btn-danger" disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function LessonCard({ lesson, t, onDelete }) {
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
          <h3 className="font-semibold truncate" style={{ color: '#1E293B' }}>
            {lesson.title || 'Untitled Lesson'}
          </h3>
          <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
            {[lesson.class_nickname, gradeLabel, lesson.subject].filter(Boolean).join(' · ')}
            {' · '}{dateStr}
          </p>
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
          <button
            onClick={onDelete}
            className="text-xs px-2 py-1 rounded border border-danger-200 text-danger-600 hover:bg-danger-50 transition-colors min-h-[36px]"
          >
            🗑 Delete
          </button>
        </div>
      </div>
    </div>
  );
}
