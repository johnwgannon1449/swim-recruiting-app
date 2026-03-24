const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { callClaudeJSON, callClaudeText } = require('../utils/claudeClient');
const { sanitizePromptInput } = require('../utils/sanitize');

const router = express.Router();

// ── POST /api/analysis/gaps ────────────────────────────────────────────────
router.post(
  '/gaps',
  auth,
  [
    body('lesson_text').trim().notEmpty().withMessage('Lesson text is required.'),
    body('standards').isArray({ min: 1 }).withMessage('At least one standard is required.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { lesson_text, standards } = req.body;
    const safeText = sanitizePromptInput(lesson_text);

    const standardsList = standards
      .map((s) => `- ${s.code}: ${s.description}`)
      .join('\n');

    const prompt = `You are an experienced California K-12 curriculum specialist reviewing a teacher's lesson plan for standards alignment.

Evaluate the following lesson plan against each California standard listed below. For each standard, determine whether it is:
- "covered": The lesson clearly and substantially addresses this standard
- "partial": The lesson touches on aspects of this standard but doesn't fully address it
- "missing": The standard is not meaningfully addressed in the lesson

Return a JSON array with exactly one object per standard. Each object must have these exact fields:
{
  "standard_code": "the exact code provided",
  "coverage_status": "covered" | "partial" | "missing",
  "explanation": "A 1-3 sentence explanation in warm, collegial educator-to-educator language. For covered: note what works well. For partial/missing: explain specifically what's absent and why it matters for student learning.",
  "confidence_score": 0.0-1.0
}

STANDARDS TO EVALUATE:
${standardsList}

LESSON PLAN:
${safeText}

Respond with ONLY a valid JSON array. No other text before or after.`;

    try {
      const results = await callClaudeJSON(prompt);
      if (!Array.isArray(results)) throw new Error('Invalid response format.');
      res.json({ results });
    } catch (err) {
      console.error('Gap analysis error:', err);
      res.status(500).json({ error: err.message || 'Gap analysis failed. Please try again.' });
    }
  }
);

// ── POST /api/analysis/recommendations ────────────────────────────────────
router.post(
  '/recommendations',
  auth,
  [
    body('lesson_text').trim().notEmpty(),
    body('grade').notEmpty(),
    body('subject').notEmpty(),
    body('gap_results').isArray({ min: 1 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { lesson_text, grade, subject, gap_results } = req.body;
    const safeText = sanitizePromptInput(lesson_text);

    // Only generate recommendations for partial/missing standards
    const needsWork = gap_results.filter(
      (r) => r.coverage_status === 'partial' || r.coverage_status === 'missing'
    );
    if (needsWork.length === 0) {
      return res.json({ recommendations: [] });
    }

    const standardsList = needsWork
      .map((r) => `- ${r.standard_code} (${r.coverage_status}): ${r.explanation}`)
      .join('\n');

    const prompt = `You are an experienced California K-12 curriculum specialist helping a teacher strengthen their lesson plan with practical, actionable ideas.

For each standard below that needs improvement, generate exactly 2-3 specific, grade-appropriate activity recommendations. Write in a warm, collegial educator-to-educator tone. Activities should be practical, engaging, and realistic to implement in a real classroom.

Grade: ${grade === 'K' ? 'Kindergarten' : `Grade ${grade}`}
Subject: ${subject}

STANDARDS NEEDING IMPROVEMENT:
${standardsList}

CURRENT LESSON (for context):
${safeText.slice(0, 2000)}${safeText.length > 2000 ? '...' : ''}

Return a JSON array. Each object must have:
{
  "standard_code": "exact code",
  "activity_title": "Clear, engaging title (5-10 words)",
  "description": "2-3 sentence description of what students do and how it addresses the standard",
  "time_estimate": "e.g. '15-20 minutes' or 'One class period'",
  "materials": ["list", "of", "materials"]
}

Respond with ONLY a valid JSON array. No other text.`;

    try {
      const recommendations = await callClaudeJSON(prompt);
      if (!Array.isArray(recommendations)) throw new Error('Invalid response format.');
      res.json({ recommendations });
    } catch (err) {
      console.error('Recommendations error:', err);
      res.status(500).json({ error: err.message || 'Could not generate recommendations. Please try again.' });
    }
  }
);

// ── POST /api/analysis/format ──────────────────────────────────────────────
router.post(
  '/format',
  auth,
  [
    body('finalized_text').trim().notEmpty(),
    body('class_info').isObject(),
    body('teacher_name').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { finalized_text, class_info, teacher_name, standards = [] } = req.body;
    const safeFinalized = sanitizePromptInput(finalized_text);
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const standardsList = standards
      .map((s) => `- ${s.code}: ${s.description}`)
      .join('\n') || '(No specific standards selected)';

    const prompt = `You are formatting a teacher's lesson plan into a clean, professional structure. Reorganize and polish the content into a complete, well-organized California K-12 lesson plan.

Output the lesson using these exact markdown sections in this order:

# Lesson Plan

## Lesson Header
- **Teacher:** ${teacher_name}
- **Class:** ${class_info.nickname || class_info.subject}
- **Grade:** ${class_info.grade_level === 'K' ? 'Kindergarten' : `Grade ${class_info.grade_level}`}
- **Subject:** ${class_info.subject}
- **Date:** ${today}

## Standards Addressed
${standardsList}

## Learning Objective
[Write 1-2 clear, measurable learning objectives based on the lesson content]

## Materials Needed
[Bulleted list of all materials mentioned or implied by the lesson]

## Lesson Outline

### Introduction / Hook (5-10 min)
[Opening activity that engages students and connects to prior knowledge]

### Main Instruction (15-25 min)
[Core teaching content and activities]

### Student Practice (10-20 min)
[How students practice or apply the learning]

### Closure (5-10 min)
[How the lesson wraps up and learning is consolidated]

## Assessment
[How student understanding will be checked — formative and/or summative]

## Teacher Notes
[Any additional notes, differentiation ideas, or extensions from the teacher's original plan]

---

ORIGINAL LESSON CONTENT TO REFORMAT:
${safeFinalized}

Preserve ALL of the teacher's original content and accepted additions. Organize it logically into the sections above. Write in clear, professional educator language. Fill in any obvious structural gaps. Do NOT invent lesson content that wasn't in the original.`;

    try {
      const formatted_text = await callClaudeText(prompt, 6000);
      res.json({ formatted_text });
    } catch (err) {
      console.error('Format error:', err);
      res.status(500).json({ error: err.message || 'Could not format lesson. Please try again.' });
    }
  }
);

// ── POST /api/analysis/coverage-check ─────────────────────────────────────
// Lightweight check used in Step 6 review panel
router.post(
  '/coverage-check',
  auth,
  [
    body('text').trim().notEmpty(),
    body('standards').isArray({ min: 1 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { text, standards } = req.body;
    const safeText = sanitizePromptInput(text);

    const standardsList = standards
      .map((s) => `- ${s.code}: ${s.description}`)
      .join('\n');

    const prompt = `Quickly assess how well this lesson addresses each standard. For each standard, respond with "covered", "partial", or "missing".

STANDARDS:
${standardsList}

LESSON TEXT:
${safeText.slice(0, 3000)}${safeText.length > 3000 ? '...' : ''}

Return ONLY a JSON array: [{"standard_code": "CODE", "status": "covered"|"partial"|"missing"}]`;

    try {
      const coverage = await callClaudeJSON(prompt, 1024);
      res.json({ coverage: Array.isArray(coverage) ? coverage : [] });
    } catch (err) {
      console.error('Coverage check error:', err);
      res.status(500).json({ error: 'Coverage check failed.' });
    }
  }
);

module.exports = router;
