import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WizardProvider, useWizard } from '../contexts/WizardContext';
import { useAuth } from '../contexts/AuthContext';
import { useAutoSave } from '../hooks/useAutoSave';
import WizardProgress from '../components/wizard/WizardProgress';
import Step1SelectClass from '../components/wizard/Step1SelectClass';
import Step2SelectStandards from '../components/wizard/Step2SelectStandards';
import Step3LessonInput from '../components/wizard/Step3LessonInput';
import Step4GapAnalysis from '../components/wizard/Step4GapAnalysis';
import Step5Recommendations from '../components/wizard/Step5Recommendations';
import Step6Review from '../components/wizard/Step6Review';
import Step7Archive from '../components/wizard/Step7Archive';
import TemplatePicker from '../components/TemplatePicker';
import Modal from '../components/Modal';
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

function WizardInner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { state, dispatch, TOTAL_STEPS } = useWizard();
  const navigate = useNavigate();
  const { currentStep } = state;
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const { saveStatus } = useAutoSave(state, dispatch);

  // Show template picker the first time user advances past step 1
  useEffect(() => {
    if (currentStep === 2 && user && !user.template_choice) {
      setShowTemplatePicker(true);
    }
  }, [currentStep]);

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
      <Modal open={showTemplatePicker} onClose={() => setShowTemplatePicker(false)}>
        <TemplatePicker onDone={() => setShowTemplatePicker(false)} />
      </Modal>

      <WizardProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />

      {/* Back button */}
      {currentStep < 7 && (
        <button
          onClick={handleBack}
          className="btn-secondary text-sm mb-6 flex items-center gap-1.5"
        >
          ← {t('wizard.back')}
        </button>
      )}

      {/* Active step */}
      <StepComponent />
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
