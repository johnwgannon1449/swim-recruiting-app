import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWizard } from '../../contexts/WizardContext';
import api from '../../utils/api';

// ── File parsing helpers ───────────────────────────────────────────────────

async function parseDocx(file) {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function parsePdf(file) {
  const pdfjs = await import('pdfjs-dist');
  const PdfWorker = await import('pdfjs-dist/build/pdf.worker?url');
  pdfjs.GlobalWorkerOptions.workerSrc = PdfWorker.default;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(' ') + '\n';
  }
  return text.trim();
}

// ── Waveform animation ─────────────────────────────────────────────────────

function Waveform({ active }) {
  return (
    <div className="flex items-end justify-center gap-1 h-10">
      {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-full transition-all bg-primary-500 ${active ? 'animate-waveform' : 'opacity-30'}`}
          style={{
            height: active ? `${h * 8}px` : '6px',
            animationDelay: `${i * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function Step3LessonInput() {
  const { t } = useTranslation();
  const { state, dispatch } = useWizard();

  const [activeTab, setActiveTab] = useState(state.lessonInputMethod || 'type');
  const [typedText, setTypedText] = useState(
    state.lessonInputMethod === 'type' ? state.lessonText : ''
  );

  // Upload state
  const [parsedText, setParsedText] = useState(
    state.lessonInputMethod === 'upload' ? state.lessonText : ''
  );
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();

  // Voice state
  const [transcript, setTranscript] = useState(
    state.lessonInputMethod === 'speak' ? state.lessonText : ''
  );
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceError, setVoiceError] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  function switchTab(tab) {
    setActiveTab(tab);
    dispatch({ type: 'SET_INPUT_METHOD', payload: tab });
  }

  // ── Active text per tab ──
  function getActiveText() {
    if (activeTab === 'type') return typedText;
    if (activeTab === 'upload') return parsedText;
    return transcript;
  }

  function handleContinue() {
    const text = getActiveText().trim();
    if (!text) return;
    dispatch({ type: 'SET_LESSON_TEXT', payload: text });
    dispatch({ type: 'SET_INPUT_METHOD', payload: activeTab });
    // Clear cached analysis when lesson text changes
    dispatch({ type: 'SET_GAP_ANALYSIS', payload: null });
    dispatch({ type: 'SET_RECOMMENDATIONS', payload: [] });
    dispatch({ type: 'NEXT_STEP' });
  }

  // ── File upload ──────────────────────────────────────────────────────────

  async function handleFile(file) {
    if (!file) return;
    setParseError('');

    // File type check
    const isDocx = file.name.endsWith('.docx') || file.type.includes('word');
    const isPdf = file.name.endsWith('.pdf') || file.type === 'application/pdf';
    if (!isDocx && !isPdf) {
      setParseError('Unsupported file type. Please upload a .docx or .pdf file.');
      return;
    }

    // File size check (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      setParseError('File is too large. Please upload a file under 20MB.');
      return;
    }

    setParsing(true);
    try {
      let text = '';
      if (isDocx) {
        text = await parseDocx(file);
      } else {
        text = await parsePdf(file);
      }
      setParsedText(text || '');
      if (!text) setParseError('No readable text found in this file. It may be scanned or image-based. Try copying and pasting instead.');
    } catch (err) {
      setParseError('Could not parse this file. Make sure it is not password-protected or corrupted, and try again. You can also copy and paste your lesson instead.');
    } finally {
      setParsing(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }

  // ── Voice recording ──────────────────────────────────────────────────────

  async function startRecording() {
    setVoiceError('');

    // Browser support check
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setVoiceError('Voice recording is not supported in your browser. Please use Chrome, Firefox, or Safari, or type your lesson instead.');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      setVoiceError('Voice recording is not supported in this browser. Please try Chrome or Firefox, or type your lesson instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timerRef.current);
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(blob);
      };

      mediaRecorder.start(250);
      setRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setVoiceError('Microphone access was denied. Please click the microphone icon in your browser address bar to allow access, then try again.');
      } else if (err.name === 'NotFoundError') {
        setVoiceError('No microphone found. Please connect a microphone and try again, or type your lesson instead.');
      } else {
        setVoiceError('Could not start recording. Please check your microphone and try again, or type your lesson instead.');
      }
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
      setTranscribing(true);
    }
  }

  async function transcribeAudio(blob) {
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');
    try {
      const res = await api.post('/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setTranscript(res.data.transcript);
    } catch (err) {
      setVoiceError(err.userMessage || 'Transcription failed. Please try typing your lesson.');
    } finally {
      setTranscribing(false);
    }
  }

  const activeText = getActiveText();

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('wizard.step3.title')}</h1>
      <p className="text-gray-500 mb-6">{t('wizard.step3.subtitle')}</p>

      {/* Tabs — full-width on mobile, min 44px tap target */}
      <div className="flex border-b border-gray-200 mb-6">
        {[
          { key: 'type', label: t('wizard.step3.tab_type'), icon: '✏️' },
          { key: 'upload', label: t('wizard.step3.tab_upload'), icon: '📎' },
          { key: 'speak', label: t('wizard.step3.tab_speak'), icon: '🎤' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 min-h-[44px] px-2 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === tab.key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.key === 'type' ? 'Type' : tab.key === 'upload' ? 'Upload' : 'Voice'}</span>
          </button>
        ))}
      </div>

      {/* ── TYPE tab ── */}
      {activeTab === 'type' && (
        <div>
          <textarea
            className="input min-h-64 resize-y text-sm leading-relaxed"
            placeholder={t('wizard.step3.type_placeholder')}
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{typedText.length} characters</p>
        </div>
      )}

      {/* ── UPLOAD tab ── */}
      {activeTab === 'upload' && (
        <div>
          {!parsedText ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
                ${dragOver ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.pdf"
                className="hidden"
                onChange={(e) => handleFile(e.target.files[0])}
              />
              {parsing ? (
                <div className="text-gray-500 text-sm">
                  <div className="text-2xl mb-2">⏳</div>
                  {t('wizard.step3.upload_parsing')}
                </div>
              ) : (
                <>
                  <div className="text-4xl mb-3">📄</div>
                  <p className="font-medium text-gray-700">{t('wizard.step3.upload_drop')}</p>
                  <p className="text-sm text-gray-400 mt-1">{t('wizard.step3.upload_browse')}</p>
                  <p className="text-xs text-gray-400 mt-3">Accepts .docx and .pdf files</p>
                </>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-success-600 mb-2">✅ {t('wizard.step3.upload_success')}</p>
              <textarea
                className="input min-h-64 resize-y text-sm leading-relaxed"
                value={parsedText}
                onChange={(e) => setParsedText(e.target.value)}
              />
              <button
                onClick={() => { setParsedText(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="text-xs text-gray-400 hover:text-gray-600 mt-1"
              >
                Upload a different file
              </button>
            </div>
          )}
          {parseError && (
            <p className="text-sm text-danger-600 mt-2">{parseError}</p>
          )}
        </div>
      )}

      {/* ── SPEAK tab ── */}
      {activeTab === 'speak' && (
        <div className="text-center">
          {!transcript && !transcribing ? (
            <div className="py-8">
              <button
                onClick={recording ? stopRecording : startRecording}
                className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center text-4xl shadow-lg transition-all
                  ${recording
                    ? 'bg-danger-600 hover:bg-danger-700 text-white animate-pulse'
                    : 'bg-primary-600 hover:bg-primary-700 text-white'}`}
              >
                {recording ? '⏹' : '🎤'}
              </button>
              <p className="mt-4 text-sm font-medium text-gray-600">
                {recording
                  ? t('wizard.step3.speak_stop')
                  : t('wizard.step3.speak_start')}
              </p>
              {recording && (
                <div className="mt-4 space-y-3">
                  <Waveform active={recording} />
                  <p className="text-sm text-gray-500 font-mono">
                    {t('wizard.step3.recording_time', { seconds: recordingSeconds })}
                  </p>
                </div>
              )}
            </div>
          ) : transcribing ? (
            <div className="py-12 text-gray-500 text-sm">
              <div className="text-3xl mb-3 animate-spin inline-block">⏳</div>
              <p>{t('wizard.step3.speak_transcribing')}</p>
            </div>
          ) : (
            <div className="text-left">
              <p className="text-sm font-medium text-success-600 mb-2">✅ {t('wizard.step3.speak_review')}</p>
              <textarea
                className="input min-h-48 resize-y text-sm leading-relaxed"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
              />
              <button
                onClick={() => { setTranscript(''); setRecordingSeconds(0); }}
                className="text-xs text-gray-400 hover:text-gray-600 mt-1"
              >
                Record again
              </button>
            </div>
          )}
          {voiceError && (
            <p className="text-sm text-danger-600 mt-3 text-left">{voiceError}</p>
          )}
        </div>
      )}

      {/* Continue */}
      <div className="mt-6">
        <button
          onClick={handleContinue}
          disabled={!activeText.trim()}
          className="btn-primary w-full py-3 text-base"
        >
          {t('wizard.next')} →
        </button>
      </div>
    </div>
  );
}
