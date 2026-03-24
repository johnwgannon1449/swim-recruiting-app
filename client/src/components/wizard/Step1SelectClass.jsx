import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWizard } from '../../contexts/WizardContext';
import api from '../../utils/api';
import ClassForm from '../ClassForm';
import Modal from '../Modal';
import { ClassCardSkeleton } from '../Skeleton';

export default function Step1SelectClass() {
  const { t } = useTranslation();
  const { state, dispatch } = useWizard();

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    api.get('/classes')
      .then((res) => setClasses(res.data.classes))
      .catch(() => setError(t('errors.generic')))
      .finally(() => setLoading(false));
  }, []);

  function handleSelectClass(cls) {
    dispatch({ type: 'SELECT_CLASS', payload: cls });
    // Reset downstream state when class changes
    dispatch({ type: 'SET_STANDARDS', payload: [] });
    dispatch({ type: 'NEXT_STEP' });
  }

  async function handleAddClass(values) {
    const res = await api.post('/classes', values);
    const newClass = res.data.class;
    setClasses((prev) => [...prev, newClass]);
    setShowAddModal(false);
    handleSelectClass(newClass);
  }

  const STANDARDS_COLOR = {
    'ccss-ela': 'text-blue-700 bg-blue-50',
    'ccss-math': 'text-purple-700 bg-purple-50',
    ngss: 'text-green-700 bg-green-50',
    hss: 'text-yellow-700 bg-yellow-50',
    vapa: 'text-pink-700 bg-pink-50',
    pe: 'text-orange-700 bg-orange-50',
    cte: 'text-teal-700 bg-teal-50',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('wizard.step1.title')}</h1>
      <p className="text-gray-500 mb-6">{t('wizard.step1.subtitle')}</p>

      {error && (
        <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <ClassCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {classes.map((cls) => {
            const isSelected = state.selectedClass?.id === cls.id;
            const badgeClass = STANDARDS_COLOR[cls.standards_type] || 'text-gray-600 bg-gray-50';
            const gradeLabel = t(`grades.${cls.grade_level}`, { defaultValue: `Grade ${cls.grade_level}` });
            const stdLabel = t(`classes.standards_types.${cls.standards_type}`, { defaultValue: cls.standards_type });

            return (
              <button
                key={cls.id}
                onClick={() => handleSelectClass(cls)}
                className={`text-left p-5 rounded-xl border-2 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500
                  ${isSelected
                    ? 'border-primary-500 bg-primary-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-primary-300'
                  }`}
              >
                <div className="font-semibold text-gray-900 text-base mb-1">{cls.nickname}</div>
                <div className="text-sm text-gray-500 mb-3">{gradeLabel} · {cls.subject}</div>
                <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>
                  {stdLabel}
                </span>
                {isSelected && (
                  <span className="ml-2 text-primary-600 text-xs font-medium">✓ Selected</span>
                )}
              </button>
            );
          })}

          {/* Add new class card */}
          {classes.length < 8 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-colors flex flex-col items-center justify-center gap-2 min-h-[120px]"
            >
              <span className="text-3xl leading-none">+</span>
              <span className="text-sm font-medium">{t('wizard.step1.add_new')}</span>
            </button>
          )}
        </div>
      )}

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)}>
        <ClassForm
          onSave={handleAddClass}
          onCancel={() => setShowAddModal(false)}
          isEdit={false}
        />
      </Modal>
    </div>
  );
}
