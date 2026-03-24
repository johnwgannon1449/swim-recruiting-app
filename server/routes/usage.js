const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

const MONTHLY_LESSON_LIMIT = parseInt(process.env.MONTHLY_LESSON_LIMIT || '999', 10);

// GET /api/usage — current month's analysis count for the logged-in teacher
router.get('/', auth, async (req, res) => {
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  try {
    const result = await pool.query(
      `SELECT analyses_count FROM user_usage WHERE user_id = $1 AND month = $2`,
      [req.user.id, month]
    );
    const count = result.rows[0]?.analyses_count || 0;
    res.json({
      month,
      count,
      limit: MONTHLY_LESSON_LIMIT,
      remaining: Math.max(0, MONTHLY_LESSON_LIMIT - count),
    });
  } catch (err) {
    console.error('Get usage error:', err);
    res.status(500).json({ error: 'Could not load usage data.' });
  }
});

module.exports = router;
