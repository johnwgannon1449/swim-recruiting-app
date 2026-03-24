import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';

const SAVE_DEBOUNCE_MS = 1500;

/**
 * Auto-save hook for the lesson wizard.
 *
 * Lifecycle:
 *  1. When step advances to 2 (class selected), create a draft record.
 *  2. On subsequent state changes, debounce-save via PATCH /:id/draft.
 *  3. On step change, save immediately (no debounce).
 *  4. When savedLessonId is set (finalization complete), delete the draft.
 */
export function useAutoSave(state, dispatch) {
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle'|'saving'|'saved'|'error'
  const isSaving = useRef(false);
  const debounceTimer = useRef(null);
  const retryTimer = useRef(null);
  const { draftLessonId, currentStep, savedLessonId } = state;

  // Extract only serialisable wizard state (no internal UI ephemeral fields)
  function getStepData() {
    const {
      selectedClass, selectedStandards, lessonText, lessonInputMethod,
      gapAnalysis, recommendations, customAdditions, finalizedText, formattedText,
    } = state;
    return {
      selectedClass, selectedStandards, lessonText, lessonInputMethod,
      gapAnalysis, recommendations, customAdditions, finalizedText, formattedText,
    };
  }

  // ── Create draft when Step 1 completes ──────────────────────────────────
  useEffect(() => {
    if (currentStep !== 2 || draftLessonId || !state.selectedClass) return;
    (async () => {
      try {
        const { selectedClass } = state;
        const res = await api.post('/lessons/draft', {
          class_id: selectedClass?.id,
          grade_level: selectedClass?.grade_level,
          subject: selectedClass?.subject,
          standards_type: selectedClass?.standards_type,
          step_data: getStepData(),
          current_step: 2,
        });
        dispatch({ type: 'SET_DRAFT_LESSON_ID', payload: res.data.lesson.id });
        showSaved();
      } catch {
        // Non-blocking — draft creation failure shouldn't interrupt the flow
      }
    })();
  }, [currentStep, draftLessonId]);

  // ── Delete draft when lesson is finalized ────────────────────────────────
  useEffect(() => {
    if (!savedLessonId || !draftLessonId) return;
    api.delete(`/lessons/${draftLessonId}`).catch(() => {});
  }, [savedLessonId]);

  // ── Core save function ───────────────────────────────────────────────────
  const save = useCallback(async (lessonId, step) => {
    if (!lessonId || isSaving.current) return;
    isSaving.current = true;
    setSaveStatus('saving');
    const stepData = getStepData();
    try {
      await api.patch(`/lessons/${lessonId}/draft`, {
        step_data: stepData,
        current_step: step,
      });
      clearTimeout(retryTimer.current);
      showSaved();
    } catch {
      setSaveStatus('error');
      // Retry once after 3 seconds
      retryTimer.current = setTimeout(async () => {
        try {
          await api.patch(`/lessons/${lessonId}/draft`, { step_data: stepData, current_step: step });
          showSaved();
        } catch {
          setSaveStatus('idle');
        }
      }, 3000);
    } finally {
      isSaving.current = false;
    }
  }, [state]);

  function showSaved() {
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  }

  // ── Immediate save on step change ────────────────────────────────────────
  const prevStep = useRef(currentStep);
  useEffect(() => {
    if (!draftLessonId || currentStep < 2) { prevStep.current = currentStep; return; }
    if (currentStep !== prevStep.current) {
      prevStep.current = currentStep;
      clearTimeout(debounceTimer.current);
      save(draftLessonId, currentStep);
    }
  }, [currentStep, draftLessonId]);

  // ── Debounced save on content changes ────────────────────────────────────
  useEffect(() => {
    if (!draftLessonId) return;
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      save(draftLessonId, currentStep);
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(debounceTimer.current);
  }, [
    state.lessonText,
    state.selectedStandards,
    state.gapAnalysis,
    state.recommendations,
    state.customAdditions,
    state.finalizedText,
    state.formattedText,
    draftLessonId,
  ]);

  // Cleanup timers on unmount
  useEffect(() => () => {
    clearTimeout(debounceTimer.current);
    clearTimeout(retryTimer.current);
  }, []);

  return { saveStatus };
}
