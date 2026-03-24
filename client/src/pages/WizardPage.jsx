import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WizardProvider, useWizard } from '../contexts/WizardContext';
import WizardProgress from '../components/wizard/WizardProgress';
import Step1SelectClass from '../components/wizard/Step1SelectClass';
import Step2SelectStandards from '../components/wizard/Step2SelectStandards';
import Step3LessonInput from '../components/wizard/Step3LessonInput';
import Step4GapAnalysis from '../components/wizard/Step4GapAnalysis';
import Step5Recommendations from '../components/wizard/Step5Recommendations';
import Step6Review from '../components/wizard/Step6Review';
import Step7Archive from '../components/wizard/Step7Archive';

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
  const { state, dispatch, TOTAL_STEPS } = useWizard();
  const navigate = useNavigate();
  const { currentStep } = state;

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
