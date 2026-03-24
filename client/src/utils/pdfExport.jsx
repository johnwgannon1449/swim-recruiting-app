/**
 * Generate and download a beautiful PDF from formatted lesson text.
 * Uses @react-pdf/renderer for rich layout control and crisp typography.
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
} from '@react-pdf/renderer';

// ── Colour palette ──────────────────────────────────────────────────────────
const BRAND = '#1d4ed8';    // blue-700
const BRAND_LIGHT = '#dbeafe'; // blue-100
const HEADING = '#1e293b';  // slate-800
const BODY = '#374151';     // gray-700
const MUTED = '#9ca3af';    // gray-400
const RULE = '#e5e7eb';     // gray-200
const SUCCESS_BG = '#f0fdf4';
const WARNING_BG = '#fffbeb';
const DANGER_BG = '#fef2f2';

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    paddingTop: 50,
    paddingBottom: 50,
    paddingLeft: 54,
    paddingRight: 54,
    backgroundColor: '#ffffff',
  },

  // Header bar at the top of each page
  pageHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: BRAND,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 54,
    right: 54,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7.5,
    color: MUTED,
  },

  // Document title
  docTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  docSubtitle: {
    fontSize: 10,
    color: MUTED,
    marginBottom: 12,
  },
  titleRule: {
    borderBottomWidth: 2,
    borderBottomColor: BRAND,
    marginBottom: 18,
  },

  // Metadata row (teacher, class, date)
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
    backgroundColor: BRAND_LIGHT,
    borderRadius: 6,
    padding: 10,
  },
  metaItem: {
    flexDirection: 'row',
    gap: 4,
    marginRight: 14,
  },
  metaLabel: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 8.5,
    color: HEADING,
  },

  // Standards chips row
  standardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 18,
  },
  standardChip: {
    backgroundColor: BRAND_LIGHT,
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  standardChipText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    letterSpacing: 0.3,
  },

  // Sections
  h1: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  h2: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: HEADING,
    marginTop: 14,
    marginBottom: 4,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  h3: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: HEADING,
    marginTop: 9,
    marginBottom: 2,
  },

  // Body text
  bodyText: {
    fontSize: 9.5,
    color: BODY,
    lineHeight: 1.55,
    marginBottom: 2,
  },
  bodyTextBold: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: HEADING,
  },

  // Bullet points
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 2,
    paddingLeft: 8,
  },
  bulletDot: {
    fontSize: 9.5,
    color: BRAND,
    marginRight: 5,
    marginTop: 1,
  },
  bulletText: {
    fontSize: 9.5,
    color: BODY,
    lineHeight: 1.5,
    flex: 1,
  },

  // Numbered items
  numberedRow: {
    flexDirection: 'row',
    marginBottom: 2,
    paddingLeft: 8,
  },
  numberedLabel: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    marginRight: 5,
    minWidth: 16,
  },

  // Horizontal rule
  hrule: {
    borderBottomWidth: 1,
    borderBottomColor: RULE,
    marginVertical: 10,
  },

  // Spacer
  spacer: {
    marginBottom: 4,
  },
});

// ── Parse a single line of markdown-ish text ─────────────────────────────────

/**
 * Split text with **bold** markers into segments for rendering.
 */
function parseBoldSegments(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return { bold: true, text: part.slice(2, -2) };
    }
    return { bold: false, text: part.replace(/\*([^*]+)\*/g, '$1') };
  });
}

function InlineText({ text, baseStyle }) {
  const segments = parseBoldSegments(text);
  if (segments.every((s) => !s.bold)) {
    return <Text style={baseStyle}>{text.replace(/\*([^*]+)\*/g, '$1')}</Text>;
  }
  return (
    <Text style={baseStyle}>
      {segments.map((seg, i) =>
        seg.bold ? (
          <Text key={i} style={{ fontFamily: 'Helvetica-Bold' }}>{seg.text}</Text>
        ) : (
          seg.text
        )
      )}
    </Text>
  );
}

// ── Parse formatted text into React-PDF elements ────────────────────────────

function renderLines(lines) {
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();

    if (line.startsWith('# ')) {
      elements.push(
        <Text key={i} style={styles.h1}>{line.slice(2)}</Text>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <Text key={i} style={styles.h2}>{line.slice(3)}</Text>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <Text key={i} style={styles.h3}>{line.slice(4)}</Text>
      );
    } else if (line.startsWith('- **') || line.startsWith('* **')) {
      // Bold label line: "- **Teacher:** John Smith"
      const content = line.replace(/^[-*]\s*/, '');
      const boldMatch = content.match(/^\*\*(.+?)\*\*:?\s*(.*)/);
      if (boldMatch) {
        elements.push(
          <View key={i} style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{boldMatch[1]}: </Text>
              {boldMatch[2]}
            </Text>
          </View>
        );
      } else {
        elements.push(
          <View key={i} style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <InlineText text={content} baseStyle={styles.bulletText} />
          </View>
        );
      }
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <View key={i} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>•</Text>
          <InlineText text={line.slice(2)} baseStyle={styles.bulletText} />
        </View>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const numMatch = line.match(/^(\d+)\.\s+(.*)/);
      elements.push(
        <View key={i} style={styles.numberedRow}>
          <Text style={styles.numberedLabel}>{numMatch[1]}.</Text>
          <InlineText text={numMatch[2]} baseStyle={styles.bulletText} />
        </View>
      );
    } else if (line === '---') {
      elements.push(<View key={i} style={styles.hrule} />);
    } else if (line === '') {
      elements.push(<View key={i} style={styles.spacer} />);
    } else {
      elements.push(
        <InlineText key={i} text={line} baseStyle={styles.bodyText} />
      );
    }

    i++;
  }

  return elements;
}

// ── Extract metadata from the formatted text ─────────────────────────────────

function extractMeta(text) {
  const meta = { teacher: '', class: '', grade: '', subject: '', date: '', standards: [] };
  for (const line of text.split('\n')) {
    const m = line.match(/^-\s+\*\*(.+?)\*\*:?\s*(.*)/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    if (key === 'teacher') meta.teacher = m[2];
    else if (key === 'class') meta.class = m[2];
    else if (key === 'grade') meta.grade = m[2];
    else if (key === 'subject') meta.subject = m[2];
    else if (key === 'date') meta.date = m[2];
    else if (key === 'standards' || key.includes('standard')) {
      // Standards line like "- **Standards:** ELA.5.1, ELA.5.2"
      meta.standards = m[2].split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return meta;
}

function extractStandardCodes(text) {
  // Find any lines like "- ELA.5.1: description" or "- CCSS.ELA-LITERACY..."
  const codes = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^-\s+([\w.-]+\.[\w.]+):/);
    if (m) codes.push(m[1]);
  }
  return codes;
}

// ── PDF Document component ───────────────────────────────────────────────────

function LessonPDF({ formattedText, teacherInfo }) {
  const lines = formattedText.split('\n');

  // Extract document title from first # line
  const titleLine = lines.find((l) => l.startsWith('# '));
  const docTitle = titleLine ? titleLine.slice(2).trim() : 'Lesson Plan';

  // Extract metadata
  const meta = extractMeta(formattedText);
  const standardCodes = extractStandardCodes(formattedText);

  // Build footer info
  const footerLeft = [meta.teacher, meta.class].filter(Boolean).join(' · ');
  const footerRight = meta.date || new Date().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  // Remove the first # title line — it becomes our styled docTitle
  const bodyLines = lines.filter((l, i) => {
    if (l.startsWith('# ') && lines.indexOf(l) === lines.findIndex((x) => x.startsWith('# '))) return false;
    return true;
  });

  // Remove the meta block (## Lesson Header section) since we render it separately
  let inHeader = false;
  const filteredLines = [];
  for (const line of bodyLines) {
    if (line === '## Lesson Header') { inHeader = true; continue; }
    if (inHeader && line.startsWith('## ')) inHeader = false;
    if (inHeader) continue; // skip the header meta lines
    filteredLines.push(line);
  }

  return (
    <Document
      title={docTitle}
      author={meta.teacher || 'Teacher'}
      subject="Lesson Plan"
      creator="Lesson Plan Analyzer"
    >
      <Page size="LETTER" style={styles.page} wrap>
        {/* Top brand bar */}
        <View style={styles.pageHeader} fixed />

        {/* Document title */}
        <Text style={styles.docTitle}>{docTitle}</Text>
        <Text style={styles.docSubtitle}>Lesson Plan · Lesson Plan Analyzer</Text>
        <View style={styles.titleRule} />

        {/* Metadata block */}
        {(meta.teacher || meta.class || meta.grade || meta.subject || meta.date) && (
          <View style={styles.metaRow}>
            {meta.teacher && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Teacher</Text>
                <Text style={styles.metaValue}>{meta.teacher}</Text>
              </View>
            )}
            {meta.class && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Class</Text>
                <Text style={styles.metaValue}>{meta.class}</Text>
              </View>
            )}
            {meta.grade && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Grade</Text>
                <Text style={styles.metaValue}>{meta.grade}</Text>
              </View>
            )}
            {meta.subject && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Subject</Text>
                <Text style={styles.metaValue}>{meta.subject}</Text>
              </View>
            )}
            {meta.date && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Date</Text>
                <Text style={styles.metaValue}>{meta.date}</Text>
              </View>
            )}
          </View>
        )}

        {/* Standards chips */}
        {standardCodes.length > 0 && (
          <View style={styles.standardsRow}>
            {standardCodes.map((code, i) => (
              <View key={i} style={styles.standardChip}>
                <Text style={styles.standardChipText}>{code}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Body content */}
        {renderLines(filteredLines)}

        {/* Footer on every page */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{footerLeft}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          } />
          <Text style={styles.footerText}>{footerRight}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ── Public export function ───────────────────────────────────────────────────

/**
 * Generate and download a PDF from formatted lesson text.
 *
 * @param {string} formattedText - Markdown-formatted lesson plan text
 * @param {string} filename      - Download filename
 * @param {object} teacherInfo   - Optional { name, className, date }
 */
export async function exportLessonPDF(formattedText, filename = 'lesson-plan.pdf', teacherInfo = {}) {
  const blob = await pdf(
    <LessonPDF formattedText={formattedText} teacherInfo={teacherInfo} />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
