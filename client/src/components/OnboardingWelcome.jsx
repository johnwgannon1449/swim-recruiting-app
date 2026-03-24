import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Full-screen welcome overlay shown to first-time users (zero classes).
 * Dismissed when the teacher clicks "Let's get started" or "Skip".
 * Tracks dismissal in localStorage so it never shows again.
 */
export default function OnboardingWelcome({ onGetStarted, onSkip }) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 text-center">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-blue-50 pointer-events-none" />

      <div className="relative max-w-md w-full">
        {/* Logo / icon */}
        <div className="text-6xl mb-6">🎓</div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">
          Welcome to Lesson Plan Analyzer
        </h1>
        <p className="text-gray-500 text-base leading-relaxed mb-8">
          Instantly check how well any lesson plan covers California K-12 standards —
          then get smart, grade-appropriate activity suggestions to fill the gaps.
          All in minutes.
        </p>

        {/* Feature highlights */}
        <div className="text-left space-y-3 mb-8">
          {[
            { icon: '📊', text: 'Gap analysis across all CA standards in seconds' },
            { icon: '💡', text: 'AI-generated activity recommendations' },
            { icon: '📄', text: 'Beautiful print-ready PDF export' },
            { icon: '📂', text: 'Archive and revisit every lesson you analyze' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              <span className="text-sm text-gray-600 leading-relaxed">{item.text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onGetStarted}
          className="btn-primary w-full py-3.5 text-base mb-3 min-h-[44px]"
        >
          Let's get started →
        </button>
        <button
          onClick={onSkip}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Skip introduction
        </button>
      </div>
    </div>
  );
}
