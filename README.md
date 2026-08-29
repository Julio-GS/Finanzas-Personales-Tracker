# Voice Finance MVP

Personal voice-first finance tracker built with Next.js App Router, Google Gemini Flash audio extraction, Neon Serverless Postgres with Drizzle ORM, and single-user environment-backed access protection.

## Quick Path

1. **Clone & Install**:
   ```bash
   git clone <repository-url>
   cd Finanzas-tracker
   npm install
   ```

2. **Configure Environment**:
   Copy `.env.example` to `.env.local` and populate the required variables:
   ```bash
   cp .env.example .env.local
   ```

3. **Generate & Apply Database Migrations**:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
   > **Note on Migrations**: Migrations are managed via Drizzle Kit but are **not yet applied to your database by this repository workflow**. You must run `npm run db:migrate` against your target database using your direct unpooled connection string before starting the application.

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

---

## Environment Variables & Configuration

All environment variables are server-only. Never prefix sensitive variables with `NEXT_PUBLIC_`.

| Variable | Description | Example / Placeholder | Required |
| :--- | :--- | :--- | :--- |
| `AUTH_USERNAME` | Single-user dashboard login username | `admin` | Yes |
| `AUTH_PASSWORD` | Single-user dashboard login password | `SuperSecurePassword123!` | Yes |
| `AUTH_SECRET` | Secret used for HMAC-SHA-256 session cookie signatures (≥ 32 chars) | Generated via CLI (see below) | Yes |
| `AUTH_SESSION_MAX_AGE_SECONDS` | Session cookie validity duration in seconds (default: 7 days) | `604800` | Optional |
| `DATABASE_URL` | Neon pooled connection string for runtime app traffic (PgBouncer) | `postgresql://user:pass@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require` | Yes |
| `DATABASE_URL_UNPOOLED` | Neon direct connection string for migrations & Drizzle Kit | `postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require` | Yes |
| `GEMINI_API_KEY` | Google Gemini API key for audio extraction | `AIzaSy...` | Yes |
| `GEMINI_MODEL` | Google GenAI model identifier (default: `gemini-3.5-flash-lite`) | `gemini-3.5-flash-lite` | Optional |

### Generating a Strong AUTH_SECRET

Generate a high-entropy secret (at least 32 characters) using OpenSSL or Node.js:

```bash
# Using OpenSSL:
openssl rand -base64 32

# Or using Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Neon Postgres & Connection Types

Neon Postgres decouples compute from storage and provides two connection endpoints:

- **Pooled Connection (`DATABASE_URL`)**:
  - Uses PgBouncer with hostname suffix `-pooler`.
  - Used for **all web application queries and serverless API handlers**.
  - Handles concurrent connection spikes efficiently without exhausting Postgres connection limits.
- **Direct / Unpooled Connection (`DATABASE_URL_UNPOOLED`)**:
  - Direct connection to Postgres compute without `-pooler`.
  - Used **strictly for Drizzle Kit schema migrations (`npm run db:migrate`) and Drizzle Studio (`npm run db:studio`)**.
  - Essential because schema DDL migrations require session-level locks and transactional state that connection poolers do not support.

### Drizzle CLI Commands

```bash
# Generate SQL migration files from schema definition:
npm run db:generate

# Execute pending migrations on the target database (uses DATABASE_URL_UNPOOLED):
npm run db:migrate

# Open Drizzle Studio database browser:
npm run db:studio
```

---

## Deployment Setup (Vercel + Neon)

1. **Neon Setup**:
   - Create a project on [Neon](https://neon.tech).
   - In the Neon dashboard, obtain both the **Pooled connection string** (with `-pooler`) and the **Direct connection string** (without `-pooler`).
   - Run `npm run db:migrate` locally with `DATABASE_URL_UNPOOLED` set to apply the `transactions` schema.

2. **Google AI Studio Setup**:
   - Create an API key in [Google AI Studio](https://aistudio.google.com/).

3. **Vercel Setup**:
   - Import the repository in [Vercel](https://vercel.com).
   - Under **Project Settings > Environment Variables**, add:
     - `AUTH_USERNAME`
     - `AUTH_PASSWORD`
     - `AUTH_SECRET`
     - `DATABASE_URL` (pooled Neon connection string)
     - `DATABASE_URL_UNPOOLED` (direct Neon connection string)
     - `GEMINI_API_KEY`
     - `GEMINI_MODEL` (e.g. `gemini-3.5-flash-lite`)
   - Deploy the project.

---

## Verification & Smoke-Test Checklist

After deployment or local setup, run through this verification checklist:

- [ ] **Access Guard**: Visiting `/` while unauthenticated redirects to `/login`.
- [ ] **API Security**: Calling `GET /api/transactions` without a session cookie returns `401 Unauthorized` JSON.
- [ ] **Login**: Submitting valid credentials redirects to `/` and sets the `finance_session` cookie (`HttpOnly`, `SameSite=Strict`).
- [ ] **Manual Entry**: Submitting a manual transaction updates KPIs, breakdowns, and appears in the month list.
- [ ] **Voice Recording**: Recording a voice transaction (e.g., "Gasté 4500 pesos en supermercado con Mercado Pago") transcribes, extracts structured fields via Gemini Flash, and persists the record.
- [ ] **Month Navigation**: Navigating with ◀ / ▶ switches months and displays month-partitioned metrics; "Mes actual" quick-jumps to the current calendar month.
- [ ] **Budget Calculator**: Adjusting split sliders recalculates distribution instantly in-browser with zero database queries.
- [ ] **Historical Trend**: Displays 6-month aggregate financial evolution.
- [ ] **Delete Transaction**: Clicking the delete button removes the entry and immediately updates all month KPIs and breakdowns.
- [ ] **Logout**: Clicking logout clears the session cookie and redirects to `/login`.

---

## Quality & Security Checks

Run the full automated test suite, linter, typecheck, and secret-boundary validation:

```bash
# Run Vitest test suite
npm test

# Run ESLint validation
npm run lint

# Run TypeScript typechecker
npm run typecheck

# Run automated secret-boundary scanner (ensures zero secrets leak to client code)
npm run check:secrets

# Build Next.js production bundle
npm run build
```

---

## Rollback Procedures

If you need to roll back or reset the application:

1. **Database Reset**:
   Drop the `transactions` table and the `movement_type` Postgres enum from your database:
   ```sql
   DROP TABLE IF EXISTS "transactions" CASCADE;
   DROP TYPE IF EXISTS "movement_type" CASCADE;
   ```
2. **Session Revocation**:
   Change `AUTH_SECRET` in your environment variables and restart/redeploy the app. All existing session cookies will immediately fail signature validation.
3. **Environment Cleanup**:
   Remove `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `GEMINI_API_KEY`, `AUTH_USERNAME`, `AUTH_PASSWORD`, and `AUTH_SECRET` from `.env.local` or hosting provider settings.
