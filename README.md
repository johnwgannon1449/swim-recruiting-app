# Lesson Plan Analyzer

An AI-powered tool for California K-12 teachers to check how well their lesson plans cover state standards, get smart activity suggestions, and export beautiful print-ready PDF lesson plans.

---

## Features

- **Gap Analysis** — Paste, upload, or dictate a lesson plan. Claude analyzes coverage against any CA K-12 standard.
- **Recommendations** — AI suggests grade-appropriate activities for partially-covered or missing standards.
- **7-Step Wizard** — Guided flow from class selection → standards → lesson input → analysis → recommendations → review → save.
- **Beautiful PDF Export** — `@react-pdf/renderer` generates typographically clean, print-ready PDFs.
- **Cloud Archive** — Finished lessons saved to PostgreSQL + optionally uploaded to S3/R2.
- **Multilingual** — Full English and Spanish UI via i18next.

---

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | React 18, Vite, Tailwind CSS, @react-pdf/renderer |
| Backend    | Node.js, Express                                |
| Database   | PostgreSQL                                      |
| AI         | Anthropic Claude (analysis), OpenAI Whisper (voice) |
| Storage    | AWS S3 or Cloudflare R2 (optional)              |
| Auth       | JWT (7-day expiry)                              |

---

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally (or a remote connection string)
- Anthropic API key (required)
- OpenAI API key (required for voice transcription)

### 1. Clone and install

```bash
git clone <repo-url>
cd lesson-plan-analyzer
npm run install:all   # installs both server/ and client/ deps
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
```

Open `server/.env` and fill in at minimum:
- `DATABASE_URL`
- `JWT_SECRET` (generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`

### 3. Run database migrations

```bash
npm run migrate
```

This creates all tables, indexes, and triggers. Safe to run multiple times.

### 4. Start development servers

```bash
# In two separate terminals:
npm run dev:server   # Express on :3001
npm run dev:client   # Vite on :5173
```

Open [http://localhost:5173](http://localhost:5173).

---

## Environment Variables

See `server/.env.example` for the full list with comments. Key variables:

| Variable               | Required | Description                                    |
|------------------------|----------|------------------------------------------------|
| `DATABASE_URL`         | Yes      | PostgreSQL connection string                   |
| `JWT_SECRET`           | Yes      | Random secret for signing tokens               |
| `ANTHROPIC_API_KEY`    | Yes      | Claude API key                                 |
| `OPENAI_API_KEY`       | Yes      | Whisper transcription key                      |
| `STORAGE_BUCKET`       | No       | S3/R2 bucket for PDF storage                   |
| `STORAGE_REGION`       | No       | e.g. `us-east-1` or `auto` (R2)               |
| `STORAGE_KEY_ID`       | No       | Storage access key ID                          |
| `STORAGE_SECRET_KEY`   | No       | Storage secret access key                      |
| `STORAGE_ENDPOINT`     | No       | Custom endpoint for R2/MinIO (omit for AWS)    |
| `MONTHLY_LESSON_LIMIT` | No       | Freemium cap — defaults to `999` (no limit)    |
| `CLAUDE_MODEL`         | No       | Claude model ID — defaults to `claude-sonnet-4-6` |

---

## Database Migrations

Migrations are idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).

```bash
npm run migrate            # run from repo root
# or
cd server && node db/migrate.js
```

To seed a test user for development:

```bash
node -e "
const bcrypt = require('bcryptjs');
const pool = require('./server/db/pool');
bcrypt.hash('password123', 12).then(hash => {
  pool.query(
    'INSERT INTO users (name, email, password_hash) VALUES (\$1, \$2, \$3) ON CONFLICT DO NOTHING',
    ['Test Teacher', 'test@school.edu', hash]
  ).then(() => { console.log('Test user created'); pool.end(); });
});
"
```

---

## Production Build

```bash
npm run build   # builds client to client/dist/
```

The Express server serves the built React app in production mode when `NODE_ENV=production`. Static files are served from `client/dist/`.

Start in production:
```bash
NODE_ENV=production node server/index.js
```

Or with pm2:
```bash
pm2 start server/index.js --name lesson-plan-analyzer --env production
```

---

## API Reference

### Health
| Method | Path         | Auth | Description                        |
|--------|-------------|------|------------------------------------|
| GET    | /api/health  | No   | DB connectivity + version check    |

### Auth
| Method | Path               | Auth | Description       |
|--------|--------------------|------|-------------------|
| POST   | /api/auth/signup   | No   | Register teacher  |
| POST   | /api/auth/login    | No   | Login, get JWT    |
| GET    | /api/auth/me       | Yes  | Current user      |

### Classes
| Method | Path              | Auth | Description                  |
|--------|-------------------|------|------------------------------|
| GET    | /api/classes      | Yes  | List teacher's classes       |
| POST   | /api/classes      | Yes  | Create class (max 8)         |
| PUT    | /api/classes/:id  | Yes  | Update class (owner only)    |
| DELETE | /api/classes/:id  | Yes  | Delete class (owner only)    |

### Analysis
| Method | Path                          | Auth | Rate Limit   |
|--------|-------------------------------|------|--------------|
| POST   | /api/analysis/gaps            | Yes  | 30/hr/user   |
| POST   | /api/analysis/recommendations | Yes  | 30/hr/user   |
| POST   | /api/analysis/format          | Yes  | 30/hr/user   |
| POST   | /api/analysis/coverage-check  | Yes  | 30/hr/user   |

### Lessons
| Method | Path           | Auth | Description                         |
|--------|----------------|------|-------------------------------------|
| POST   | /api/lessons   | Yes  | Save lesson, generate + upload PDF  |
| GET    | /api/lessons   | Yes  | List lessons (paginated, filterable)|
| GET    | /api/lessons/:id | Yes | Get single lesson (owner only)    |

### Usage
| Method | Path        | Auth | Description                    |
|--------|-------------|------|--------------------------------|
| GET    | /api/usage  | Yes  | Current month analysis count   |

---

## Security Notes

- All `/api/lessons` and `/api/classes` routes filter by `user_id` — teachers cannot access each other's data.
- Lesson text is sanitized before being sent to Claude to strip prompt injection attempts.
- JWT tokens expire after 7 days; the client redirects to `/login?expired=1` on 401.
- Claude-calling routes are rate-limited to 30 requests/hour per user to prevent runaway API costs.
- Passwords are hashed with bcrypt (12 rounds).
