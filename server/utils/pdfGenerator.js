/**
 * Server-side PDF generation using @react-pdf/renderer.
 * Generates a Buffer from formatted lesson plan text.
 */

const React = require('react');
const {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} = require('@react-pdf/renderer');

// ── Palette ─────────────────────────────────────────────────────────────────
const BRAND = '#1d4ed8';
const BRAND_LIGHT = '#dbeafe';
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
  pageHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 8,
    backgroundColor: BRAND,
  },
  footer: {
    position: 'absolute',
    bottom: 18, left: 54, right: 54,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: { fontSize: 7.5, color: MUTED },
  docTitle: {
    fontSize: 22, fontFamily: 'Helvetica-Bold',
    color: BRAND, marginBottom: 4, letterSpacing: 0.3,
  },
  docSubtitle: { fontSize: 10, color: MUTED, marginBottom: 12 },
  titleRule: { borderBottomWidth: 2, borderBottomColor: BRAND, marginBottom: 18 },
  metaRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    marginBottom: 18, backgroundColor: BRAND_LIGHT,
    borderRadius: 6, padding: 10,
  },
  metaItem: { flexDirection: 'row', gap: 4, marginRight: 14 },
  metaLabel: {
    fontSize: 8.5, fontFamily: 'Helvetica-Bold',
    color: BRAND, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  metaValue: { fontSize: 8.5, color: HEADING },
  standardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 18 },
  standardChip: {
    backgroundColor: BRAND_LIGHT, borderRadius: 4,
    paddingVertical: 2, paddingHorizontal: 6,
  },
  standardChipText: {
    fontSize: 7.5, fontFamily: 'Helvetica-Bold',
    color: BRAND, letterSpacing: 0.3,
  },
  h1: {
    fontSize: 18, fontFamily: 'Helvetica-Bold',
    color: BRAND, marginTop: 8, marginBottom: 4, letterSpacing: 0.2,
  },
  h2: {
    fontSize: 13, fontFamily: 'Helvetica-Bold',
    color: HEADING, marginTop: 14, marginBottom: 4,
    paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: RULE,
  },
  h3: {
    fontSize: 10.5, fontFamily: 'Helvetica-Bold',
    color: HEADING, marginTop: 9, marginBottom: 2,
  },
  bodyText: { fontSize: 9.5, color: BODY, lineHeight: 1.55, marginBottom: 2 },
  bulletRow: { flexDirection: 'row', marginBottom: 2, paddingLeft: 8 },
  bulletDot: { fontSize: 9.5, color: BRAND, marginRight: 5, marginTop: 1 },
  bulletText: { fontSize: 9.5, color: BODY, lineHeight: 1.5, flex: 1 },
  numberedRow: { flexDirection: 'row', marginBottom: 2, paddingLeft: 8 },
  numberedLabel: {
    fontSize: 9.5, fontFamily: 'Helvetica-Bold',
    color: BRAND, marginRight: 5, minWidth: 16,
  },
  hrule: { borderBottomWidth: 1, borderBottomColor: RULE, marginVertical: 10 },
  spacer: { marginBottom: 4 },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractMeta(text) {
  const meta = { teacher: '', class: '', grade: '', subject: '', date: '' };
  for (const line of text.split('\n')) {
    const m = line.match(/^-\s+\*\*(.+?)\*\*:?\s*(.*)/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    if (key === 'teacher') meta.teacher = m[2];
    else if (key === 'class') meta.class = m[2];
    else if (key === 'grade') meta.grade = m[2];
    else if (key === 'subject') meta.subject = m[2];
    else if (key === 'date') meta.date = m[2];
  }
  return meta;
}

function extractStandardCodes(text) {
  const codes = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^-\s+([\w.-]+\.[\w.]+):/);
    if (m) codes.push(m[1]);
  }
  return codes;
}

function renderLines(lines) {
  return lines.map((raw, i) => {
    const line = raw.trimEnd();
    if (line.startsWith('# ')) {
      return React.createElement(Text, { key: i, style: styles.h1 }, line.slice(2));
    } else if (line.startsWith('## ')) {
      return React.createElement(Text, { key: i, style: styles.h2 }, line.slice(3));
    } else if (line.startsWith('### ')) {
      return React.createElement(Text, { key: i, style: styles.h3 }, line.slice(4));
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.slice(2);
      const boldMatch = content.match(/^\*\*(.+?)\*\*:?\s*(.*)/);
      if (boldMatch) {
        return React.createElement(View, { key: i, style: styles.bulletRow },
          React.createElement(Text, { style: styles.bulletDot }, '•'),
          React.createElement(Text, { style: styles.bulletText },
            React.createElement(Text, { style: { fontFamily: 'Helvetica-Bold' } }, boldMatch[1] + ': '),
            boldMatch[2]
          )
        );
      }
      return React.createElement(View, { key: i, style: styles.bulletRow },
        React.createElement(Text, { style: styles.bulletDot }, '•'),
        React.createElement(Text, { style: styles.bulletText }, content.replace(/\*\*(.+?)\*\*/g, '$1'))
      );
    } else if (/^\d+\.\s/.test(line)) {
      const m = line.match(/^(\d+)\.\s+(.*)/);
      return React.createElement(View, { key: i, style: styles.numberedRow },
        React.createElement(Text, { style: styles.numberedLabel }, m[1] + '.'),
        React.createElement(Text, { style: styles.bulletText }, m[2])
      );
    } else if (line === '---') {
      return React.createElement(View, { key: i, style: styles.hrule });
    } else if (line === '') {
      return React.createElement(View, { key: i, style: styles.spacer });
    } else {
      return React.createElement(Text, { key: i, style: styles.bodyText },
        line.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
      );
    }
  });
}

// ── Main generator ───────────────────────────────────────────────────────────

/**
 * Generate a PDF Buffer from formatted lesson plan text.
 *
 * @param {string} formattedText - Markdown-formatted lesson text
 * @returns {Promise<Buffer>}
 */
async function generateLessonPDF(formattedText) {
  const lines = formattedText.split('\n');
  const titleLine = lines.find((l) => l.startsWith('# '));
  const docTitle = titleLine ? titleLine.slice(2).trim() : 'Lesson Plan';
  const meta = extractMeta(formattedText);
  const standardCodes = extractStandardCodes(formattedText);

  const footerLeft = [meta.teacher, meta.class].filter(Boolean).join(' · ');
  const footerRight = meta.date || new Date().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  // Skip title line and header section in body
  let inHeader = false;
  const bodyLines = [];
  let skippedTitle = false;
  for (const line of lines) {
    if (line.startsWith('# ') && !skippedTitle) { skippedTitle = true; continue; }
    if (line === '## Lesson Header') { inHeader = true; continue; }
    if (inHeader && line.startsWith('## ')) inHeader = false;
    if (inHeader) continue;
    bodyLines.push(line);
  }

  const doc = React.createElement(Document,
    { title: docTitle, author: meta.teacher || 'Teacher', subject: 'Lesson Plan', creator: 'Lesson Plan Analyzer' },
    React.createElement(Page, { size: 'LETTER', style: styles.page, wrap: true },
      // Brand bar
      React.createElement(View, { style: styles.pageHeader, fixed: true }),

      // Title
      React.createElement(Text, { style: styles.docTitle }, docTitle),
      React.createElement(Text, { style: styles.docSubtitle }, 'Lesson Plan · Lesson Plan Analyzer'),
      React.createElement(View, { style: styles.titleRule }),

      // Metadata
      (meta.teacher || meta.class || meta.grade || meta.subject || meta.date)
        ? React.createElement(View, { style: styles.metaRow },
            ...[
              meta.teacher && React.createElement(View, { style: styles.metaItem, key: 't' },
                React.createElement(Text, { style: styles.metaLabel }, 'Teacher'),
                React.createElement(Text, { style: styles.metaValue }, meta.teacher)
              ),
              meta.class && React.createElement(View, { style: styles.metaItem, key: 'c' },
                React.createElement(Text, { style: styles.metaLabel }, 'Class'),
                React.createElement(Text, { style: styles.metaValue }, meta.class)
              ),
              meta.grade && React.createElement(View, { style: styles.metaItem, key: 'g' },
                React.createElement(Text, { style: styles.metaLabel }, 'Grade'),
                React.createElement(Text, { style: styles.metaValue }, meta.grade)
              ),
              meta.subject && React.createElement(View, { style: styles.metaItem, key: 's' },
                React.createElement(Text, { style: styles.metaLabel }, 'Subject'),
                React.createElement(Text, { style: styles.metaValue }, meta.subject)
              ),
              meta.date && React.createElement(View, { style: styles.metaItem, key: 'd' },
                React.createElement(Text, { style: styles.metaLabel }, 'Date'),
                React.createElement(Text, { style: styles.metaValue }, meta.date)
              ),
            ].filter(Boolean)
          )
        : null,

      // Standard chips
      standardCodes.length > 0
        ? React.createElement(View, { style: styles.standardsRow },
            ...standardCodes.map((code, i) =>
              React.createElement(View, { key: i, style: styles.standardChip },
                React.createElement(Text, { style: styles.standardChipText }, code)
              )
            )
          )
        : null,

      // Body
      ...renderLines(bodyLines),

      // Footer
      React.createElement(View, { style: styles.footer, fixed: true },
        React.createElement(Text, { style: styles.footerText }, footerLeft),
        React.createElement(Text, {
          style: styles.footerText,
          render: ({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`,
        }),
        React.createElement(Text, { style: styles.footerText }, footerRight)
      )
    )
  );

  return renderToBuffer(doc);
}

module.exports = { generateLessonPDF };
