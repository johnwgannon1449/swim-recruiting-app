const express = require('express');
const { body, query, validationResult } = require('express-validator');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/lessons — save a finalized lesson
router.post(
  '/',
  auth,
  [
    body('class_id').optional().isInt(),
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

    try {
      const result = await pool.query(
        `INSERT INTO lessons
          (user_id, class_id, title, grade_level, subject, standards_type,
           standards_covered, original_text, finalized_text, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id, title, grade_level, subject, standards_type, standards_covered, created_at`,
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
          JSON.stringify(metadata),
        ]
      );

      // Increment usage counter for freemium tracking
      const month = new Date().toISOString().slice(0, 7); // YYYY-MM
      await pool.query(
        `INSERT INTO user_usage (user_id, month, analyses_count)
         VALUES ($1, $2, 1)
         ON CONFLICT (user_id, month)
         DO UPDATE SET analyses_count = user_usage.analyses_count + 1`,
        [req.user.id, month]
      );

      res.status(201).json({ lesson: result.rows[0] });
    } catch (err) {
      console.error('Save lesson error:', err);
      res.status(500).json({ error: 'Could not save lesson. Please try again.' });
    }
  }
);

// GET /api/lessons — list teacher's archived lessons (paginated, filterable)
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

    const conditions = ['l.user_id = $1'];
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
                l.created_at
         FROM lessons l
         LEFT JOIN classes c ON c.id = l.class_id
         WHERE ${where}
         ORDER BY l.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      );

      res.json({
        lessons: lessonsRes.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      console.error('Get lessons error:', err);
      res.status(500).json({ error: 'Could not load lessons.' });
    }
  }
);

// GET /api/lessons/:id — get a single lesson
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
    res.json({ lesson: result.rows[0] });
  } catch (err) {
    console.error('Get lesson error:', err);
    res.status(500).json({ error: 'Could not load lesson.' });
  }
});

module.exports = router;
