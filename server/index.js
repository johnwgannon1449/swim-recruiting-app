require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const pool = require('./db/pool');

const authRoutes = require('./routes/auth');
const classRoutes = require('./routes/classes');
const standardsRoutes = require('./routes/standards');
const analysisRoutes = require('./routes/analysis');
const transcribeRoutes = require('./routes/transcribe');
const lessonsRoutes = require('./routes/lessons');
const usageRoutes = require('./routes/usage');

const app = express();

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));

// General rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again shortly.' },
});
app.use('/api/', limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});
app.use('/api/auth/', authLimiter);

// Claude analysis rate limiting — 30 requests/hour per IP
// In production this should be keyed per user (user id from JWT), but
// IP-based limiting here protects against anonymous abuse.
const analysisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  keyGenerator: (req) => {
    // Prefer user id from JWT (set by auth middleware) over IP
    return req.user?.id || req.ip;
  },
  message: { error: 'Analysis limit reached. You can run up to 30 analyses per hour. Please try again later.' },
  skip: () => process.env.NODE_ENV === 'test',
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/standards', standardsRoutes);
app.use('/api/analysis', analysisLimiter, analysisRoutes);
app.use('/api/transcribe', transcribeRoutes);
app.use('/api/lessons', lessonsRoutes);
app.use('/api/usage', usageRoutes);

// Health check — includes DB connectivity
app.get('/api/health', async (req, res) => {
  let dbStatus = 'ok';
  try {
    await pool.query('SELECT 1');
  } catch {
    dbStatus = 'error';
  }

  const status = dbStatus === 'ok' ? 'ok' : 'degraded';
  res.status(status === 'ok' ? 200 : 503).json({
    status,
    version: process.env.npm_package_version || '1.0.0',
    db: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = app;
