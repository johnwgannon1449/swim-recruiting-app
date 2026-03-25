const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');

const router = express.Router();

function issueToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/signup
router.post(
  '/signup',
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;
    try {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const password_hash = await bcrypt.hash(password, 12);
      const result = await pool.query(
        'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, template_choice, created_at',
        [name, email, password_hash]
      );
      const user = result.rows[0];
      const token = issueToken(user);

      res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, template_choice: user.template_choice } });
    } catch (err) {
      console.error('Signup error:', err);
      res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    try {
      const result = await pool.query(
        'SELECT id, name, email, password_hash, template_choice FROM users WHERE email = $1',
        [email]
      );
      const user = result.rows[0];
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = issueToken(user);
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, template_choice: user.template_choice } });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }
);

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, template_choice, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// PATCH /api/auth/template
router.patch('/template', require('../middleware/auth'), async (req, res) => {
  const { template_choice } = req.body;
  const valid = ['classic', 'modern', 'structured', 'chalkboard', 'bright', 'storybook'];
  if (!valid.includes(template_choice)) {
    return res.status(400).json({ error: 'Invalid template choice.' });
  }
  try {
    const result = await pool.query(
      'UPDATE users SET template_choice = $1 WHERE id = $2 RETURNING id, name, email, template_choice',
      [template_choice, req.user.id]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Template update error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

module.exports = router;
