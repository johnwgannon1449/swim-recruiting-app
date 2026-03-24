import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WizardProvider, useWizard } from '../contexts/WizardContext';
import { useAutoSave } from '../hooks/useAutoSave';
import WizardProgress from '../components/wizard/WizardProgress';
import Step1SelectClass from '../components/wizard/Step1SelectClass';
import Step2SelectStandards from '../components/wizard/Step2SelectStandards';
import Step3LessonInput from '../components/wizard/Step3LessonInput';
import Step4GapAnalysis from '../components/wizard/Step4GapAnalysis';
import Step5Recommendations from '../components/wizard/Step5Recommendations';
import Step6Review from '../components/wizard/Step6Review';
import Step7Archive from '../components/wizard/Step7Archive';
import api from '../utils/api';

const STEP_COMPONENTS = {
  1: Step1SelectClass,
  2: Step2SelectStandards,
  3: Step3LessonInput,
  4: Step4GapAnalysis,
  5: Step5Recommendations,
  6: Step6Review,
  7: Step7Archive,
};

function SaveIndicator({ status }) {
  if (status === 'idle') return null;
  return (
    <span
      className="text-xs flex items-center gap-1 transition-opacity"
      style={{ color: status === 'error' ? '#d97706' : '#94a3b8' }}
    >
      {status === 'saving' && (
        <>
          <span
            className="w-2.5 h-2.5 rounded-full animate-spin"
            style={{ border: '1.5px solid #d6e0ee', borderTopColor: '#1e3a5f' }}
          />
          Saving…
        </>
      )}
      {status === 'saved' && '✓ Saved'}
      {status === 'error' && "Couldn't save — retrying…"}
    </span>
  );
}

function WizardInner() {
  const { t } = useTranslation();
  const { state, dispatch, TOTAL_STEPS } = useWizard();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentStep } = state;

  const { saveStatus } = useAutoSave(state, dispatch);

  // Resume a draft lesson from dashboard
  useEffect(() => {
    const resumeId = searchParams.get('resume');
    if (!resumeId || state.draftLessonId) return;
    api.get(`/lessons/${resumeId}`).then((res) => {
      const lesson = res.data.lesson;
      if (lesson?.step_data) {
        dispatch({
          type: 'HYDRATE',
          payload: {
            ...lesson.step_data,
            currentStep: lesson.current_step || 1,
            draftLessonId: lesson.id,
          },
        });
      }
    }).catch(() => {});
  }, []);

  const StepComponent = STEP_COMPONENTS[currentStep];

  function handleBack() {
    if (currentStep === 1) {
      navigate('/dashboard');
    } else {
      dispatch({ type: 'PREV_STEP' });
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <WizardProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />

      {/* Back button + auto-save indicator */}
      <div className="flex items-center justify-between mb-6">
        {currentStep < 7 ? (
          <button
            onClick={handleBack}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            ← {t('wizard.back')}
          </button>
        ) : (
          <div />
        )}
        <SaveIndicator status={saveStatus} />
      </div>

      {/* Active step */}
      <StepComponent />

      {/* Room4 watermark */}
      <div className="mt-12 mb-2 text-center">
        <span className="text-xs font-medium tracking-widest" style={{ color: '#CBD5E1' }}>
          Room<span style={{ color: '#FCD34D', opacity: 0.6 }}>4</span>
        </span>
      </div>
    </div>
  );
}

export default function WizardPage() {
  return (
    <WizardProvider>
      <WizardInner />
    </WizardProvider>
  );
}
