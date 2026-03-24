import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useWizard } from '../../contexts/WizardContext';
import { useAuth } from '../../contexts/AuthContext';
import api, { withRetry } from '../../utils/api';
import { exportLessonPDF } from '../../utils/pdfExport';

function RotatingMessage({ messages }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % messages.length), 2000);
    return () => clearInterval(id);
  }, [messages.length]);
  return <p className="text-gray-500 text-sm min-h-5">{messages[idx]}</p>;
}

// Renders markdown-ish formatted text as styled HTML preview
function LessonPreview({ text }) {
  const lines = text.split('\n');

  return (
    <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) {
          return <h1 key={i} className="text-2xl font-bold text-primary-700 mt-4 mb-2 pb-2 border-b border-gray-200">{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-lg font-bold text-gray-800 mt-5 mb-2">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-base font-semibold text-gray-700 mt-3 mb-1">{line.slice(4)}</h3>;
        }
        if (line === '---') {
          return <hr key={i} className="my-4 border-gray-200" />;
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2 ml-2 my-0.5">
              <span className="text-gray-400 mt-0.5">•</span>
              <span dangerouslySetInnerHTML={{ __html: parseBold(line.slice(2)) }} />
            </div>
          );
        }
        if (line === '') return <div key={i} className="h-2" />;
        return (
          <p key={i} className="my-1"
            dangerouslySetInnerHTML={{ __html: parseBold(line) }} />
        );
      })}
    </div>
  );
}

function parseBold(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

export default function Step7Archive() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { state, dispatch } = useWizard();
  const navigate = useNavigate();

  const {
    finalizedText,
    selectedClass,
    selectedStandards,
    formattedText,
    savedLessonId,
  } = state;

  const [formatting, setFormatting] = useState(!formattedText);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!savedLessonId);
  const [error, setError] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const hasFetched = useRef(false);

  const formattingMessages = [
    t('wizard.step7.msg1'),
    t('wizard.step7.msg2'),
    t('wizard.step7.msg3'),
  ];

  useEffect(() => {
    if (formattedText || hasFetched.current) return;
    hasFetched.current = true;
    formatLesson();
  }, []);

  async function formatLesson() {
    setFormatting(true);
    setError('');
    try {
      const res = await withRetry(() =>
        api.post('/analysis/format', {
          finalized_text: finalizedText,
          class_info: selectedClass || {},
          teacher_name: user?.name || 'Teacher',
          standards: selectedStandards.map((s) => ({ code: s.code, description: s.description })),
        })
      );
      dispatch({ type: 'SET_FORMATTED_TEXT', payload: res.data.formatted_text });
    } catch (err) {
      setError(err.userMessage || t('errors.generic'));
    } finally {
      setFormatting(false);
    }
  }

  async function handleSave() {
    if (saved || saving) return;
    setSaving(true);
    setError('');
    try {
      const title = extractTitle(formattedText || finalizedText);
      const res = await api.post('/lessons', {
        class_id: selectedClass?.id,
        title,
        grade_level: selectedClass?.grade_level,
        subject: selectedClass?.subject,
        standards_type: selectedClass?.standards_type,
        standards_covered: selectedStandards.map((s) => ({
          code: s.code,
          description: s.description,
        })),
        original_text: state.lessonText,
        finalized_text: formattedText || finalizedText,
        metadata: {
          gap_analysis: state.gapAnalysis,
          recommendations_accepted: state.recommendations.filter(
            (r) => r._status === 'accepted' || r._status === 'edited'
          ).length,
        },
      });
      dispatch({ type: 'SET_SAVED_LESSON_ID', payload: res.data.lesson.id });
      setSaved(true);
    } catch (err) {
      setError(err.userMessage || t('errors.generic'));
    } finally {
      setSaving(false);
    }
  }

  async function handleExportPdf() {
    setExportingPdf(true);
    try {
      const text = formattedText || finalizedText;
      const dateStr = new Date().toISOString().slice(0, 10);
      const classSlug = (selectedClass?.nickname || 'lesson').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const filename = `lesson-plan-${classSlug}-${dateStr}.pdf`;
      await exportLessonPDF(text, filename, {
        name: user?.name || 'Teacher',
        className: selectedClass?.nickname,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      });
    } catch (err) {
      setError('PDF export failed. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  }

  function handleNewLesson() {
    dispatch({ type: 'RESET' });
    navigate('/wizard');
  }

  function extractTitle(text) {
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('## ') || line.startsWith('# ')) {
        const candidate = line.replace(/^#+\s*/, '').trim();
        if (candidate && candidate.toLowerCase() !== 'lesson plan' && candidate.toLowerCase() !== 'header') {
          return candidate;
        }
      }
    }
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${selectedClass?.subject || 'Lesson'} — ${dateStr}`;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        {saved ? t('wizard.step7.title_saved') : t('wizard.step7.title')}
      </h1>
      <p className="text-gray-500 mb-6">{t('wizard.step7.subtitle')}</p>

      {/* Formatting loading */}
      {formatting && (
        <div className="flex flex-col items-center justify-center py-20 gap-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-primary-200 rounded-full" />
            <div className="absolute inset-0 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <RotatingMessage messages={formattingMessages} />
        </div>
      )}

      {/* Error */}
      {!formatting && error && (
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl text-sm text-danger-700 mb-4">
          {error}
          <button onClick={formatLesson} className="block mt-2 text-xs underline">Try again</button>
        </div>
      )}

      {/* Lesson preview */}
      {!formatting && formattedText && (
        <>
          {/* Action bar */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="btn-secondary flex items-center justify-center gap-2 min-h-[44px]"
            >
              {exportingPdf ? '⏳' : '⬇️'} {t('wizard.step7.export_pdf')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className={`flex items-center justify-center gap-2 min-h-[44px] ${saved ? 'btn-secondary opacity-75' : 'btn-primary'}`}
            >
              {saving ? '⏳' : saved ? '✅' : '💾'}
              {saving ? t('wizard.step7.saving') : saved ? t('wizard.step7.saved') : t('wizard.step7.save_archive')}
            </button>
          </div>

          {/* Preview — scrollable on small screens */}
          <div className="card border-gray-200 mb-6 print:shadow-none overflow-x-auto">
            <div className="min-w-0">
              <LessonPreview text={formattedText} />
            </div>
          </div>

          {/* Success / next steps */}
          {saved && (
            <div className="bg-success-50 border border-success-200 rounded-xl p-5 mb-6">
              <p className="font-semibold text-success-800 mb-3">🎉 {t('wizard.step7.saved')}</p>
              <div className="flex flex-wrap gap-3">
                <button onClick={handleNewLesson} className="btn-primary text-sm">
                  ✚ {t('wizard.step7.new_lesson')}
                </button>
                <button
                  onClick={() => navigate('/archive')}
                  className="btn-secondary text-sm"
                >
                  📂 {t('wizard.step7.go_archive')}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Fallback if format failed but we still have finalized text */}
      {!formatting && !formattedText && !error && finalizedText && (
        <>
          <div className="card mb-6">
            <pre className="text-sm whitespace-pre-wrap text-gray-700 leading-relaxed">{finalizedText}</pre>
          </div>
          <button onClick={formatLesson} className="btn-primary">
            Format with AI
          </button>
        </>
      )}
    </div>
  );
}
