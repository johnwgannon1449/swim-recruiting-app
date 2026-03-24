import React, { createContext, useContext, useReducer, useEffect } from 'react';

const STORAGE_KEY = 'wizardState_v1';
const TOTAL_STEPS = 7;

const initialState = {
  currentStep: 1,
  selectedClass: null,
  selectedStandards: [],      // [{code, description, domain, grade, ...}]
  lessonText: '',
  lessonInputMethod: 'type',  // 'type' | 'upload' | 'speak'
  gapAnalysis: null,          // [{standard_code, coverage_status, explanation, confidence_score}]
  recommendations: [],        // [{...rec, _status: 'pending'|'accepted'|'edited'|'dismissed', _editedText}]
  customAdditions: '',
  finalizedText: '',
  formattedText: '',
  savedLessonId: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'NEXT_STEP':
      return { ...state, currentStep: Math.min(state.currentStep + 1, TOTAL_STEPS) };
    case 'PREV_STEP':
      return { ...state, currentStep: Math.max(state.currentStep - 1, 1) };
    case 'SELECT_CLASS':
      return { ...state, selectedClass: action.payload };
    case 'SET_STANDARDS':
      return { ...state, selectedStandards: action.payload };
    case 'SET_LESSON_TEXT':
      return { ...state, lessonText: action.payload };
    case 'SET_INPUT_METHOD':
      return { ...state, lessonInputMethod: action.payload };
    case 'SET_GAP_ANALYSIS':
      return { ...state, gapAnalysis: action.payload };
    case 'SET_RECOMMENDATIONS':
      return { ...state, recommendations: action.payload };
    case 'UPDATE_RECOMMENDATION': {
      const updated = state.recommendations.map((r, i) =>
        i === action.index ? { ...r, ...action.payload } : r
      );
      return { ...state, recommendations: updated };
    }
    case 'SET_CUSTOM_ADDITIONS':
      return { ...state, customAdditions: action.payload };
    case 'SET_FINALIZED_TEXT':
      return { ...state, finalizedText: action.payload };
    case 'SET_FORMATTED_TEXT':
      return { ...state, formattedText: action.payload };
    case 'SET_SAVED_LESSON_ID':
      return { ...state, savedLessonId: action.payload };
    case 'RESET':
      return { ...initialState };
    case 'HYDRATE':
      return { ...initialState, ...action.payload };
    default:
      return state;
  }
}

const WizardContext = createContext(null);

export function WizardProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState, () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Don't restore completed wizards (step 7 finished)
        if (parsed.savedLessonId) return initialState;
        return { ...initialState, ...parsed };
      }
    } catch {}
    return initialState;
  });

  // Persist to localStorage on every state change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  return (
    <WizardContext.Provider value={{ state, dispatch, TOTAL_STEPS }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used within WizardProvider');
  return ctx;
}
