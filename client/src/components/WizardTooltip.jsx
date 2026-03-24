import React, { useState, useEffect } from 'react';

const TOOLTIPS_KEY = 'dismissedTooltips_v1';

function getDismissed() {
  try {
    return JSON.parse(localStorage.getItem(TOOLTIPS_KEY) || '[]');
  } catch {
    return [];
  }
}

function dismiss(id) {
  const prev = getDismissed();
  if (!prev.includes(id)) {
    localStorage.setItem(TOOLTIPS_KEY, JSON.stringify([...prev, id]));
  }
}

/**
 * A tooltip overlay that appears once per user and can be dismissed forever.
 *
 * Props:
 *   id       — unique identifier stored in localStorage
 *   title    — short heading
 *   body     — descriptive text
 *   position — 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' (default 'bottom-left')
 *   children — the element to anchor the tooltip to
 */
export default function WizardTooltip({ id, title, body, position = 'bottom-left', children }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = getDismissed();
    if (!dismissed.includes(id)) {
      // Small delay so the page renders first
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, [id]);

  function handleDismiss(e) {
    e.stopPropagation();
    dismiss(id);
    setVisible(false);
  }

  const positionClasses = {
    'bottom-left': 'top-full left-0 mt-2',
    'bottom-right': 'top-full right-0 mt-2',
    'top-left': 'bottom-full left-0 mb-2',
    'top-right': 'bottom-full right-0 mb-2',
  };

  return (
    <div className="relative inline-block">
      {children}
      {visible && (
        <div
          className={`absolute z-40 w-64 bg-gray-900 text-white rounded-xl shadow-xl p-3.5 ${positionClasses[position]}`}
          role="tooltip"
        >
          {/* Arrow */}
          <div className={`absolute w-2.5 h-2.5 bg-gray-900 rotate-45
            ${position.startsWith('bottom') ? '-top-1.5 ' : '-bottom-1.5 '}
            ${position.endsWith('left') ? 'left-4' : 'right-4'}
          `} />

          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="text-xs font-bold text-white leading-snug">{title}</span>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-white text-sm flex-shrink-0 -mt-0.5"
              aria-label="Dismiss tip"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">{body}</p>
          <button
            onClick={handleDismiss}
            className="mt-2 text-xs text-primary-400 hover:text-primary-300 font-medium"
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Reset all dismissed tooltips (useful for testing).
 */
export function resetTooltips() {
  localStorage.removeItem(TOOLTIPS_KEY);
}
