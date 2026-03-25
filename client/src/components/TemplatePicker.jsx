import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Clean and timeless',
    preview: {
      headerBg: '#1e3a5f',
      headerText: '#ffffff',
      accent: '#1e3a5f',
      body: '#374151',
      bg: '#ffffff',
      ruleBg: '#e5e7eb',
    },
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Bold with amber accents',
    preview: {
      headerBg: '#f59e0b',
      headerText: '#1e293b',
      accent: '#f59e0b',
      body: '#374151',
      bg: '#ffffff',
      ruleBg: '#fef3c7',
    },
  },
  {
    id: 'structured',
    name: 'Structured',
    description: 'Grid-forward, data-rich',
    preview: {
      headerBg: '#0f172a',
      headerText: '#f1f5f9',
      accent: '#3b82f6',
      body: '#334155',
      bg: '#f8fafc',
      ruleBg: '#e2e8f0',
    },
  },
  {
    id: 'chalkboard',
    name: 'Chalkboard',
    description: 'Dark, classroom feel',
    preview: {
      headerBg: '#1c1917',
      headerText: '#fef9c3',
      accent: '#a3e635',
      body: '#e7e5e4',
      bg: '#292524',
      ruleBg: '#44403c',
    },
  },
  {
    id: 'bright',
    name: 'Bright',
    description: 'Energetic and colorful',
    preview: {
      headerBg: '#7c3aed',
      headerText: '#ffffff',
      accent: '#ec4899',
      body: '#374151',
      bg: '#ffffff',
      ruleBg: '#f3e8ff',
    },
  },
  {
    id: 'storybook',
    name: 'Storybook',
    description: 'Warm and welcoming',
    preview: {
      headerBg: '#92400e',
      headerText: '#fef3c7',
      accent: '#d97706',
      body: '#44403c',
      bg: '#fffbeb',
      ruleBg: '#fde68a',
    },
  },
];

function TemplatePreview({ p }) {
  return (
    <div
      className="w-full rounded-lg overflow-hidden border"
      style={{ backgroundColor: p.bg, borderColor: p.ruleBg, height: 100 }}
    >
      {/* Header bar */}
      <div
        style={{ backgroundColor: p.headerBg, height: 22, display: 'flex', alignItems: 'center', paddingLeft: 8, gap: 4 }}
      >
        <div style={{ width: 40, height: 5, backgroundColor: p.headerText, opacity: 0.9, borderRadius: 2 }} />
        <div style={{ width: 24, height: 5, backgroundColor: p.headerText, opacity: 0.5, borderRadius: 2 }} />
      </div>
      {/* Body */}
      <div style={{ padding: '7px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ width: '70%', height: 5, backgroundColor: p.accent, borderRadius: 2, opacity: 0.85 }} />
        <div style={{ width: '100%', height: 3, backgroundColor: p.ruleBg, borderRadius: 2 }} />
        <div style={{ width: '90%', height: 3, backgroundColor: p.body, borderRadius: 2, opacity: 0.4 }} />
        <div style={{ width: '80%', height: 3, backgroundColor: p.body, borderRadius: 2, opacity: 0.3 }} />
        <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
          <div style={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: p.accent, opacity: 0.8 }} />
          <div style={{ width: '60%', height: 3, backgroundColor: p.body, borderRadius: 2, opacity: 0.3 }} />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <div style={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: p.accent, opacity: 0.8 }} />
          <div style={{ width: '50%', height: 3, backgroundColor: p.body, borderRadius: 2, opacity: 0.3 }} />
        </div>
      </div>
    </div>
  );
}

export default function TemplatePicker({ onDone }) {
  const { user, updateTemplate } = useAuth();
  const [selected, setSelected] = useState(user?.template_choice || 'classic');
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    try {
      await updateTemplate(selected);
      onDone?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: '#1E293B' }}>Choose your lesson template</h2>
      <p className="text-sm mb-6" style={{ color: '#64748B' }}>
        This sets the visual style of your exported PDF. You can change it anytime from your dashboard.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {TEMPLATES.map((tmpl) => {
          const isSelected = selected === tmpl.id;
          return (
            <button
              key={tmpl.id}
              onClick={() => setSelected(tmpl.id)}
              className="text-left rounded-xl p-3 transition-all"
              style={{
                border: isSelected ? '2px solid #F59E0B' : '2px solid #E8EEF5',
                backgroundColor: isSelected ? '#fffbeb' : '#ffffff',
                boxShadow: isSelected ? '0 0 0 1px #F59E0B22' : 'none',
              }}
            >
              <TemplatePreview p={tmpl.preview} />
              <div className="mt-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#1E293B' }}>{tmpl.name}</p>
                  <p className="text-xs" style={{ color: '#94a3b8' }}>{tmpl.description}</p>
                </div>
                {isSelected && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#F59E0B' }}
                  >
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleConfirm}
        disabled={saving}
        className="btn-primary w-full py-3 text-base"
      >
        {saving ? 'Saving…' : 'Use This Template'}
      </button>
    </div>
  );
}
