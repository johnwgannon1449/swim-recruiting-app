const express = require('express');
const { body, query, validationResult } = require('express-validator');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const storage = require('../utils/storageClient');
const { generateLessonPDF } = require('../utils/pdfGenerator');

const router = express.Router();

// ── Draft endpoints ──────────────────────────────────────────────────────────

// GET /api/lessons/drafts — list user's in-progress drafts (must come before /:id)
router.get('/drafts', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, grade_level, subject, standards_type, current_step, updated_at
       FROM lessons
       WHERE user_id = $1 AND is_draft = TRUE
       ORDER BY updated_at DESC
       LIMIT 10`,
      [req.user.id]
    );
    res.json({ drafts: result.rows });
  } catch (err) {
    console.error('Get drafts error:', err);
    res.status(500).json({ error: 'Could not load drafts.' });
  }
});

// POST /api/lessons/draft — create initial draft when Step 1 completes
router.post(
  '/draft',
  auth,
  [
    body('class_id').optional().isInt(),
    body('grade_level').optional().trim(),
    body('subject').optional().trim(),
    body('standards_type').optional().trim(),
    body('current_step').optional().isInt({ min: 1, max: 7 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { class_id, grade_level, subject, standards_type, step_data = {}, current_step = 1 } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO lessons (user_id, class_id, title, grade_level, subject, standards_type, step_data, current_step, is_draft)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
         RETURNING id, title, current_step, is_draft, created_at`,
        [
          req.user.id,
          class_id || null,
          'Draft Lesson',
          grade_level || null,
          subject || null,
          standards_type || null,
          JSON.stringify(step_data),
          current_step,
        ]
      );
      res.status(201).json({ lesson: result.rows[0] });
    } catch (err) {
      console.error('Create draft error:', err);
      res.status(500).json({ error: 'Could not create draft.' });
    }
  }
);

// PATCH /api/lessons/:id/draft — auto-save step state
router.patch('/:id/draft', auth, async (req, res) => {
  const { step_data, current_step } = req.body;
  try {
    await pool.query(
      `UPDATE lessons
       SET step_data = $1, current_step = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4 AND is_draft = TRUE`,
      [JSON.stringify(step_data || {}), current_step || 1, req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Auto-save error:', err);
    res.status(500).json({ error: 'Could not save.' });
  }
});

// DELETE /api/lessons/:id — delete any lesson owned by this user
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM lessons WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Lesson not found.' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete lesson error:', err);
    res.status(500).json({ error: 'Could not delete lesson.' });
  }
});

// ── Finalized lesson endpoints ───────────────────────────────────────────────

// POST /api/lessons — save a finalized lesson, generate PDF, upload to S3
router.post(
  '/',
  auth,
  [
    body('class_id').optional().isInt(),
    body('draft_id').optional().isInt(),
    body('title').optional().trim().isLength({ max: 500 }),
    body('grade_level').optional().notEmpty(),
    body('subject').optional().trim(),
    body('standards_type').optional().trim(),
    body('standards_covered').optional().isArray(),
    body('original_text').optional().trim(),
    body('finalized_text').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
      draft_id,
      class_id,
      title,
      grade_level,
      subject,
      standards_type,
      standards_covered = [],
      original_text,
      finalized_text,
      metadata = {},
    } = req.body;

    // ── 1. Generate PDF and upload to S3 if configured ───────────────────
    let pdf_url = null;
    if (finalized_text && storage.isConfigured()) {
      try {
        const pdfBuffer = await generateLessonPDF(finalized_text);
        const key = `pdfs/user-${req.user.id}/lesson-${Date.now()}.pdf`;
        await storage.upload(pdfBuffer, key, 'application/pdf');
        pdf_url = await storage.getPresignedUrl(key, 60 * 60 * 24 * 7);
      } catch (pdfErr) {
        console.error('PDF generation/upload failed:', pdfErr.message);
      }
    }

    try {
      let savedLesson;

      if (draft_id) {
        // ── 2a. Promote existing draft to finalized ──────────────────────
        const result = await pool.query(
          `UPDATE lessons
           SET title=$1, grade_level=$2, subject=$3, standards_type=$4,
               standards_covered=$5, original_text=$6, finalized_text=$7,
               pdf_url=$8, metadata=$9, is_draft=FALSE, current_step=7,
               updated_at=NOW()
           WHERE id=$10 AND user_id=$11
           RETURNING id, title, grade_level, subject, standards_type, standards_covered, pdf_url, created_at`,
          [
            title || 'Untitled Lesson',
            grade_level,
            subject,
            standards_type,
            JSON.stringify(standards_covered),
            original_text,
            finalized_text,
            pdf_url,
            JSON.stringify(metadata),
            draft_id,
            req.user.id,
          ]
        );
        savedLesson = result.rows[0];
        if (!savedLesson) return res.status(404).json({ error: 'Draft not found.' });
      } else {
        // ── 2b. Insert new finalized lesson ──────────────────────────────
        const result = await pool.query(
          `INSERT INTO lessons
            (user_id, class_id, title, grade_level, subject, standards_type,
             standards_covered, original_text, finalized_text, pdf_url, metadata, is_draft)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,FALSE)
           RETURNING id, title, grade_level, subject, standards_type, standards_covered, pdf_url, created_at`,
          [
            req.user.id,
            class_id || null,
            title || 'Untitled Lesson',
            grade_level,
            subject,
            standards_type,
            JSON.stringify(standards_covered),
            original_text,
            finalized_text,
            pdf_url,
            JSON.stringify(metadata),
          ]
        );
        savedLesson = result.rows[0];
      }

      // ── 3. Increment usage counter ───────────────────────────────────────
      const month = new Date().toISOString().slice(0, 7);
      await pool.query(
        `INSERT INTO user_usage (user_id, month, analyses_count)
         VALUES ($1, $2, 1)
         ON CONFLICT (user_id, month)
         DO UPDATE SET analyses_count = user_usage.analyses_count + 1`,
        [req.user.id, month]
      );

      res.status(201).json({ lesson: savedLesson });
    } catch (err) {
      console.error('Save lesson error:', err);
      res.status(500).json({ error: 'Could not save lesson. Please try again.' });
    }
  }
);

// GET /api/lessons — list teacher's finalized lessons (paginated, filterable)
router.get(
  '/',
  auth,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('class_id').optional().isInt().toInt(),
    query('grade_level').optional().trim(),
    query('subject').optional().trim(),
    query('standards_type').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = ['l.user_id = $1', 'l.is_draft = FALSE'];
    const params = [req.user.id];
    let idx = 2;

    if (req.query.class_id) {
      conditions.push(`l.class_id = $${idx++}`);
      params.push(req.query.class_id);
    }
    if (req.query.grade_level) {
      conditions.push(`l.grade_level = $${idx++}`);
      params.push(req.query.grade_level);
    }
    if (req.query.subject) {
      conditions.push(`l.subject ILIKE $${idx++}`);
      params.push(`%${req.query.subject}%`);
    }
    if (req.query.standards_type) {
      conditions.push(`l.standards_type = $${idx++}`);
      params.push(req.query.standards_type);
    }

    const where = conditions.join(' AND ');

    try {
      const countRes = await pool.query(
        `SELECT COUNT(*) FROM lessons l WHERE ${where}`,
        params
      );
      const total = parseInt(countRes.rows[0].count);

      const lessonsRes = await pool.query(
        `SELECT l.id, l.title, l.grade_level, l.subject, l.standards_type,
                l.standards_covered, l.class_id, c.nickname as class_nickname,
                l.pdf_url, l.created_at
         FROM lessons l
         LEFT JOIN classes c ON c.id = l.class_id
         WHERE ${where}
         ORDER BY l.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      );

      const lessons = lessonsRes.rows;
      if (storage.isConfigured()) {
        await Promise.all(
          lessons
            .filter((l) => l.pdf_url)
            .map(async (lesson) => {
              try {
                const urlObj = new URL(lesson.pdf_url);
                const key = urlObj.pathname.replace(/^\/[^/]+\//, '');
                lesson.pdf_url = await storage.getPresignedUrl(key, 3600);
              } catch {
                // Keep the existing URL if refresh fails
              }
            })
        );
      }

      res.json({
        lessons,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      console.error('Get lessons error:', err);
      res.status(500).json({ error: 'Could not load lessons.' });
    }
  }
);

// GET /api/lessons/:id — get a single lesson (owner-gated)
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, c.nickname as class_nickname
       FROM lessons l
       LEFT JOIN classes c ON c.id = l.class_id
       WHERE l.id = $1 AND l.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Lesson not found.' });

    const lesson = result.rows[0];
    if (lesson.pdf_url && storage.isConfigured()) {
      try {
        const urlObj = new URL(lesson.pdf_url);
        const key = urlObj.pathname.replace(/^\/[^/]+\//, '');
        lesson.pdf_url = await storage.getPresignedUrl(key, 3600);
      } catch {}
    }

    res.json({ lesson });
  } catch (err) {
    console.error('Get lesson error:', err);
    res.status(500).json({ error: 'Could not load lesson.' });
  }
});

module.exports = router;
