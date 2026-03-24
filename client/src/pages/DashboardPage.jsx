import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import ClassForm from '../components/ClassForm';
import Modal from '../components/Modal';
import { ClassCardSkeleton } from '../components/Skeleton';
import OnboardingWelcome from '../components/OnboardingWelcome';

const ONBOARDING_KEY = 'onboardingDismissed_v1';

const MAX_CLASSES = 8;

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [classError, setClassError] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    api.get('/classes')
      .then((res) => {
        setClasses(res.data.classes);
        // Show onboarding only for users with no classes who haven't dismissed it
        const dismissed = localStorage.getItem(ONBOARDING_KEY);
        if (!dismissed && res.data.classes.length === 0) {
          setShowOnboarding(true);
        }
      })
      .catch(() => setClassError(t('errors.generic')))
      .finally(() => setLoadingClasses(false));

    // Load usage count (non-blocking — ignore errors)
    api.get('/usage').then((res) => setUsage(res.data)).catch(() => {});
  }, []);

  async function handleAddClass(values) {
    const res = await api.post('/classes', values);
    setClasses((prev) => [...prev, res.data.class]);
    setShowAddModal(false);
  }

  async function handleEditClass(values) {
    const res = await api.put(`/classes/${editingClass.id}`, values);
    setClasses((prev) =>
      prev.map((c) => (c.id === editingClass.id ? res.data.class : c))
    );
    setEditingClass(null);
  }

  async function handleDeleteClass(classId) {
    if (!window.confirm(t('classes.delete_confirm'))) return;
    setDeletingId(classId);
    try {
      await api.delete(`/classes/${classId}`);
      setClasses((prev) => prev.filter((c) => c.id !== classId));
    } catch {
      setClassError(t('errors.generic'));
    } finally {
      setDeletingId(null);
    }
  }

  function handleOnboardingDismiss() {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setShowOnboarding(false);
  }

  function handleOnboardingGetStarted() {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setShowOnboarding(false);
    setShowAddModal(true);
  }

  return (
    <div>
      {showOnboarding && (
        <OnboardingWelcome
          onGetStarted={handleOnboardingGetStarted}
          onSkip={handleOnboardingDismiss}
        />
      )}

      {/* Welcome header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('dashboard.welcome', { name: user?.name?.split(' ')[0] })}
          </h1>
          <p className="text-gray-500 mt-1">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {usage && usage.count > 0 && (
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {usage.count} lesson{usage.count !== 1 ? 's' : ''} analyzed this month
            </span>
          )}
          <Link to="/wizard" className="btn-primary text-base py-2.5 px-5 min-h-[44px] flex items-center">
            ✨ {t('dashboard.start_lesson')}
          </Link>
        </div>
      </div>

      {/* Classes section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.my_classes')}</h2>
          {classes.length < MAX_CLASSES && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary text-sm"
            >
              + {t('dashboard.add_class')}
            </button>
          )}
        </div>

        {classError && (
          <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">
            {classError}
          </div>
        )}

        {loadingClasses ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <ClassCardSkeleton key={i} />)}
          </div>
        ) : classes.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">🏫</div>
            <p className="font-medium text-gray-700">{t('dashboard.no_classes')}</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">{t('dashboard.no_classes_sub')}</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              + {t('dashboard.add_class')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <ClassCard
                key={cls.id}
                cls={cls}
                onEdit={() => setEditingClass(cls)}
                onDelete={() => handleDeleteClass(cls.id)}
                deleting={deletingId === cls.id}
                t={t}
              />
            ))}

            {classes.length < MAX_CLASSES && (
              <button
                onClick={() => setShowAddModal(true)}
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-colors flex flex-col items-center justify-center gap-2 min-h-[140px]"
              >
                <span className="text-2xl">+</span>
                <span className="text-sm font-medium">{t('dashboard.add_class')}</span>
              </button>
            )}
          </div>
        )}

        {classes.length >= MAX_CLASSES && (
          <p className="text-sm text-gray-500 mt-3">{t('dashboard.class_limit')}</p>
        )}
      </div>

      {/* Add class modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)}>
        <ClassForm
          onSave={handleAddClass}
          onCancel={() => setShowAddModal(false)}
          isEdit={false}
        />
      </Modal>

      {/* Edit class modal */}
      <Modal open={!!editingClass} onClose={() => setEditingClass(null)}>
        {editingClass && (
          <ClassForm
            initialValues={editingClass}
            onSave={handleEditClass}
            onCancel={() => setEditingClass(null)}
            isEdit
          />
        )}
      </Modal>
    </div>
  );
}

function ClassCard({ cls, onEdit, onDelete, deleting, t }) {
  const standardsLabel = t(`classes.standards_types.${cls.standards_type}`, {
    defaultValue: cls.standards_type,
  });

  const gradeLabel = t(`grades.${cls.grade_level}`, {
    defaultValue: t('dashboard.grade', { grade: cls.grade_level }),
  });

  const subjectColors = {
    'ccss-ela': 'bg-blue-100 text-blue-700',
    'ccss-math': 'bg-purple-100 text-purple-700',
    ngss: 'bg-green-100 text-green-700',
    hss: 'bg-yellow-100 text-yellow-700',
    vapa: 'bg-pink-100 text-pink-700',
    pe: 'bg-orange-100 text-orange-700',
    cte: 'bg-teal-100 text-teal-700',
  };

  const badgeClass = subjectColors[cls.standards_type] || 'bg-gray-100 text-gray-700';

  return (
    <div className="card hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-base leading-snug">{cls.nickname}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{gradeLabel} &middot; {cls.subject}</p>
        </div>
      </div>

      <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${badgeClass}`}>
        {standardsLabel}
      </span>

      <div className="mt-4 flex gap-2">
        <button
          onClick={onEdit}
          className="btn-secondary text-xs flex-1"
        >
          ✏️ {t('dashboard.edit_class')}
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="btn text-xs text-danger-600 border border-danger-200 hover:bg-danger-50 focus:ring-danger-500 flex-1"
        >
          {deleting ? '...' : `🗑 ${t('dashboard.delete_class')}`}
        </button>
      </div>
    </div>
  );
}
