import React from 'react';
import { useTranslation } from 'react-i18next';

const STEP_KEYS = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6', 'step7'];

export default function WizardProgress({ currentStep, totalSteps }) {
  const { t } = useTranslation();

  return (
    <div className="mb-8">
      {/* Step label */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">
          {t('wizard.step_of', { current: currentStep, total: totalSteps })}
        </span>
        <span className="text-sm font-semibold text-gray-700">
          {t(`wizard.steps.${currentStep}`)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-primary-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step dots — hidden on small screens, shown on md+ */}
      <div className="hidden sm:flex items-center justify-between mt-3">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const isDone = step < currentStep;
          const isCurrent = step === currentStep;
          return (
            <div key={step} className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors
                  ${isDone ? 'bg-primary-600 text-white' : ''}
                  ${isCurrent ? 'bg-primary-600 text-white ring-4 ring-primary-100' : ''}
                  ${!isDone && !isCurrent ? 'bg-gray-200 text-gray-400' : ''}`}
              >
                {isDone ? '✓' : step}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
