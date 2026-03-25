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

// ── Template configurations ───────────────────────────────────────────────────
const TEMPLATE_CONFIGS = {
  classic: {
    brand: '#1e3a5f',
    brandLight: '#d6e0ee',
    heading: '#1e293b',
    body: '#374151',
    muted: '#9ca3af',
    rule: '#e5e7eb',
    pageBg: '#ffffff',
    headerHeight: 8,
  },
  modern: {
    brand: '#d97706',
    brandLight: '#fef3c7',
    heading: '#1e293b',
    body: '#374151',
    muted: '#92400e',
    rule: '#fde68a',
    pageBg: '#ffffff',
    headerHeight: 10,
  },
  structured: {
    brand: '#3b82f6',
    brandLight: '#eff6ff',
    heading: '#0f172a',
    body: '#334155',
    muted: '#94a3b8',
    rule: '#e2e8f0',
    pageBg: '#f8fafc',
    headerHeight: 8,
  },
  chalkboard: {
    brand: '#a3e635',
    brandLight: '#44403c',
    heading: '#fef9c3',
    body: '#e7e5e4',
    muted: '#a8a29e',
    rule: '#57534e',
    pageBg: '#292524',
    headerHeight: 8,
  },
  bright: {
    brand: '#7c3aed',
    brandLight: '#f3e8ff',
    heading: '#1e1b4b',
    body: '#374151',
    muted: '#9ca3af',
    rule: '#e9d5ff',
    pageBg: '#ffffff',
    headerHeight: 10,
  },
  storybook: {
    brand: '#d97706',
    brandLight: '#fde68a',
    heading: '#44403c',
    body: '#57534e',
    muted: '#a8a29e',
    rule: '#fde68a',
    pageBg: '#fffbeb',
    headerHeight: 8,
  },
};

// ── Colour palette (resolved per template) ────────────────────────────────────
// Default to classic
const BRAND = '#1e3a5f';
const BRAND_LIGHT = '#d6e0ee';
const HEADING = '#1e293b';
const BODY = '#374151';
const MUTED = '#9ca3af';
const RULE = '#e5e7eb';

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

function renderLines(lines, dyn = styles) {
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();

    if (line.startsWith('# ')) {
      elements.push(
        <Text key={i} style={dyn.h1}>{line.slice(2)}</Text>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <Text key={i} style={dyn.h2}>{line.slice(3)}</Text>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <Text key={i} style={dyn.h3}>{line.slice(4)}</Text>
      );
    } else if (line.startsWith('- **') || line.startsWith('* **')) {
      // Bold label line: "- **Teacher:** John Smith"
      const content = line.replace(/^[-*]\s*/, '');
      const boldMatch = content.match(/^\*\*(.+?)\*\*:?\s*(.*)/);
      if (boldMatch) {
        elements.push(
          <View key={i} style={styles.bulletRow}>
            <Text style={dyn.bulletDot}>•</Text>
            <Text style={dyn.bulletText}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{boldMatch[1]}: </Text>
              {boldMatch[2]}
            </Text>
          </View>
        );
      } else {
        elements.push(
          <View key={i} style={styles.bulletRow}>
            <Text style={dyn.bulletDot}>•</Text>
            <InlineText text={content} baseStyle={dyn.bulletText} />
          </View>
        );
      }
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <View key={i} style={styles.bulletRow}>
          <Text style={dyn.bulletDot}>•</Text>
          <InlineText text={line.slice(2)} baseStyle={dyn.bulletText} />
        </View>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const numMatch = line.match(/^(\d+)\.\s+(.*)/);
      elements.push(
        <View key={i} style={styles.numberedRow}>
          <Text style={dyn.numberedLabel}>{numMatch[1]}.</Text>
          <InlineText text={numMatch[2]} baseStyle={dyn.bulletText} />
        </View>
      );
    } else if (line === '---') {
      elements.push(<View key={i} style={dyn.hrule} />);
    } else if (line === '') {
      elements.push(<View key={i} style={styles.spacer} />);
    } else {
      elements.push(
        <InlineText key={i} text={line} baseStyle={dyn.bodyText} />
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

// ── Build dynamic styles for a template config ────────────────────────────────

function buildDynamicStyles(cfg) {
  return {
    page: { ...styles.page, backgroundColor: cfg.pageBg },
    pageHeader: { ...styles.pageHeader, height: cfg.headerHeight, backgroundColor: cfg.brand },
    docTitle: { ...styles.docTitle, color: cfg.brand },
    titleRule: { borderBottomWidth: 2, borderBottomColor: cfg.brand, marginBottom: 18 },
    metaRow: { ...styles.metaRow, backgroundColor: cfg.brandLight },
    metaLabel: { ...styles.metaLabel, color: cfg.brand },
    metaValue: { ...styles.metaValue, color: cfg.heading },
    standardChip: { ...styles.standardChip, backgroundColor: cfg.brandLight },
    standardChipText: { ...styles.standardChipText, color: cfg.brand },
    h1: { ...styles.h1, color: cfg.brand },
    h2: { ...styles.h2, color: cfg.heading, borderBottomColor: cfg.rule },
    h3: { ...styles.h3, color: cfg.heading },
    bodyText: { ...styles.bodyText, color: cfg.body },
    bulletDot: { ...styles.bulletDot, color: cfg.brand },
    bulletText: { ...styles.bulletText, color: cfg.body },
    numberedLabel: { ...styles.numberedLabel, color: cfg.brand },
    hrule: { borderBottomWidth: 1, borderBottomColor: cfg.rule, marginVertical: 10 },
    footerText: { ...styles.footerText, color: cfg.muted },
  };
}

// ── PDF Document component ───────────────────────────────────────────────────

function LessonPDF({ formattedText, teacherInfo, template = 'classic' }) {
  const cfg = TEMPLATE_CONFIGS[template] || TEMPLATE_CONFIGS.classic;
  const dyn = buildDynamicStyles(cfg);
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
      creator="Room4AI"
    >
      <Page size="LETTER" style={dyn.page} wrap>
        {/* Top brand bar */}
        <View style={dyn.pageHeader} fixed />

        {/* Document title */}
        <Text style={dyn.docTitle}>{docTitle}</Text>
        <Text style={styles.docSubtitle}>Room4AI · Lesson planning, elevated.</Text>
        <View style={dyn.titleRule} />

        {/* Metadata block */}
        {(meta.teacher || meta.class || meta.grade || meta.subject || meta.date) && (
          <View style={dyn.metaRow}>
            {meta.teacher && (
              <View style={styles.metaItem}>
                <Text style={dyn.metaLabel}>Teacher</Text>
                <Text style={dyn.metaValue}>{meta.teacher}</Text>
              </View>
            )}
            {meta.class && (
              <View style={styles.metaItem}>
                <Text style={dyn.metaLabel}>Class</Text>
                <Text style={dyn.metaValue}>{meta.class}</Text>
              </View>
            )}
            {meta.grade && (
              <View style={styles.metaItem}>
                <Text style={dyn.metaLabel}>Grade</Text>
                <Text style={dyn.metaValue}>{meta.grade}</Text>
              </View>
            )}
            {meta.subject && (
              <View style={styles.metaItem}>
                <Text style={dyn.metaLabel}>Subject</Text>
                <Text style={dyn.metaValue}>{meta.subject}</Text>
              </View>
            )}
            {meta.date && (
              <View style={styles.metaItem}>
                <Text style={dyn.metaLabel}>Date</Text>
                <Text style={dyn.metaValue}>{meta.date}</Text>
              </View>
            )}
          </View>
        )}

        {/* Standards chips */}
        {standardCodes.length > 0 && (
          <View style={styles.standardsRow}>
            {standardCodes.map((code, i) => (
              <View key={i} style={dyn.standardChip}>
                <Text style={dyn.standardChipText}>{code}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Body content */}
        {renderLines(filteredLines, dyn)}

        {/* Footer on every page */}
        <View style={styles.footer} fixed>
          <Text style={dyn.footerText}>{footerLeft}</Text>
          <Text style={dyn.footerText} render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          } />
          <Text style={dyn.footerText}>{footerRight}</Text>
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
 * @param {string} template      - Template name (classic|modern|structured|chalkboard|bright|storybook)
 */
export async function exportLessonPDF(formattedText, filename = 'lesson-plan.pdf', teacherInfo = {}, template = 'classic') {
  const blob = await pdf(
    <LessonPDF formattedText={formattedText} teacherInfo={teacherInfo} template={template} />
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
