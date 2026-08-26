# Product Requirements Document (PRD)

**Project Name:** Personal Voice-First Finance &amp; Investment Tracker

**Target User:** Single-user personal use

**Architecture:** Serverless Full-Stack (Next.js + Neon + Gemini API)

**Cost Baseline:** $0/month (Free Tier: Neon Serverless, Vercel/Cloudflare, Google AI Studio)

---

## 1. Executive Summary &amp; Core Objectives

A private, ultra-fast personal finance web app designed to eliminate tracking friction through native voice recording. Audios are parsed directly into structured JSON using Gemini Flash multimodal models, stored in a serverless PostgreSQL database (Neon), and displayed in a month-partitioned dashboard with historical auditing and a client-side budget distribution planner.

### Core Goals

* **Voice-First Input:** Log a transaction in under 3 seconds via voice with automatic categorization and bank/wallet inference.
* **Granular Traceability:** Track *Amount*, *Category*, *Financial Source* (Santander, Mercado Pago, Cash, etc.), and *Investments/Savings*.
* **Automatic Monthly Reset &amp; History:** Logical monthly cuts starting the 1st of each month with full historical browsing and evolution metrics.
* **Instant Budget Simulator:** Standalone client-side calculator to split income (e.g., 50/30/20) without database overhead.

---

## 2. Tech Stack &amp; System Architecture

```
[ Client (Browser / Mobile PWA) ]
  ├── Web MediaRecorder API (audio/webm Base64)
  └── Client-Side Budget Planner (State-only)
         │
         ▼
[ Next.js App Router (Serverless / Edge Routes) ]
  ├── POST /api/transactions/audio ──► [ Gemini Flash API (Multimodal JSON Schema) ]
  ├── GET  /api/transactions       ──► [ Neon PostgreSQL (@neondatabase/serverless) ]
  └── GET  /api/reports/history    ──► [ Neon PostgreSQL (@neondatabase/serverless) ]

```

* **Framework:** Next.js (App Router), TypeScript, Tailwind CSS, Lucide React Icons.
* **Database:** Neon Serverless PostgreSQL (`@neondatabase/serverless`).
* **AI Model:** Google Gemini 1.5/2.0 Flash (`@google/generative-ai`) with constrained JSON Schema.
* **Deployment:** Vercel or Cloudflare Pages/Workers.

---

## 3. Database Schema (PostgreSQL DDL)

Execute directly in the Neon SQL Console:

```sql
-- 1. Enums
create type movement_type as enum ('income', 'expense', 'investment');

-- 2. Transactions Table
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  date date not null default current_date,
  type movement_type not null,
  amount numeric(12, 2) not null,
  bank_entity text not null,       -- e.g., 'Santander', 'Mercado Pago', 'Efectivo', 'Lemon'
  category text not null,          -- e.g., 'Supermercado', 'Servicios', 'Sueldo', 'CEDEARs', 'Dólar MEP'
  description text,
  raw_audio_prompt text
);

-- 3. Optimization Indexes
create index if not exists idx_transactions_date on transactions(date desc);
create index if not exists idx_transactions_type on transactions(type);
create index if not exists idx_transactions_entity on transactions(bank_entity);

```

---

## 4. Feature Specifications

### 4.1. Voice Transaction Processing (Gemini API)

* **Endpoint:** `POST /api/transactions/audio`
* **Input Payload:** `{ "audio": "&lt;base64_string&gt;", "mimeType": "audio/webm" }`
* **Behavior:** Sends raw audio base64 directly to Gemini Flash. The model outputs structured JSON according to the schema below, which is inserted into Neon in the same request.
* **Gemini JSON Schema Configuration:**
```typescript
const transactionSchema = {
  type: SchemaType.OBJECT,
  properties: {
    type: { 
      type: SchemaType.STRING, 
      enum: ['income', 'expense', 'investment'],
      description: 'income = cobros/ingresos, expense = gastos corrientes, investment = dinero apartado para ahorro/inversión'
    },
    amount: { type: SchemaType.NUMBER, description: 'Monto numérico positivo' },
    bank_entity: { type: SchemaType.STRING, description: 'Banco, billetera virtual o efectivo (ej: Santander, Mercado Pago, Efectivo, Lemon)' },
    category: { type: SchemaType.STRING, description: 'Categoría del movimiento o activo (ej: Supermercado, Alquiler, Salidas, CEDEARs, Dólar)' },
    description: { type: SchemaType.STRING, description: 'Detalle o concepto breve' },
    date: { type: SchemaType.STRING, description: 'Fecha YYYY-MM-DD. Si no se especifica, usar la fecha actual' },
    transcription: { type: SchemaType.STRING, description: 'Transcripción literal de lo que dijo el usuario' }
  },
  required: ['type', 'amount', 'bank_entity', 'category', 'date']
};

```



---

### 4.2. Monthly Dashboard &amp; Historical Navigation

* **Endpoint:** `GET /api/transactions?year=YYYY&amp;month=MM`
* **Logical Monthly Cut:** No manual reset is executed. Queries filter by `EXTRACT(YEAR FROM date) = :year AND EXTRACT(MONTH FROM date) = :month`. The 1st of every month automatically initializes with $0.
* **Month Selector UI:**
* Header with `◀ [Mes Año] ▶` navigation and a "Mes Actual" quick-jump button.
* Changing the month updates all metrics, breakdowns, and transaction feeds.


* **Metrics Cards (KPIs):**
* **Total Ingresos:** $\sum \text{amount}$ where `type = 'income'`.
* **Total Gastos:** $\sum \text{amount}$ where `type = 'expense'`.
* **Total Inversión / Ahorro:** $\sum \text{amount}$ where `type = 'investment'`.
* **Flujo Neto Disponible:** $\text{Ingresos} - (\text{Gastos} + \text{Inversión})$.


* **Breakdowns:**
* **Gastos por Entidad:** Grouped by `bank_entity` ordered by total desc.
* **Gastos por Categoría:** Grouped by `category` ordered by total desc.


* **Historical Trend Endpoint:** `GET /api/reports/history?limit=6`
* Returns aggregated totals (`income`, `expense`, `investment`, `net_flow`) grouped by `TO_CHAR(date, 'YYYY-MM')` for auditing past months.



---

### 4.3. Client-Side Income Distribution Calculator

* **Scope:** 100% Client-side component (`useState`). No database reads or writes.
* **Inputs:**
* `totalIncome` (Numeric input / Currency formatted).
* Sliders / percentage inputs for:
* **Gastos Fijos / Vivir (Needs):** Default 50%.
* **Ahorro / Inversión (Savings):** Default 30%.
* **Ocio / Personal (Wants):** Default 20%.




* **Features:**
* Presets: `[50/30/20]`, `[60/20/20]`, `[40/40/20]`.
* Real-time calculation of monetary values per bucket.
* Warning indicator if the sum of percentages $\neq 100\%$.



---

## 5. Implementation Roadmap for Coding Agent

### Phase 1: Project Setup &amp; Database Connection

1. Initialize Next.js project:
```bash
npx create-next-app@latest finance-tracker --typescript --tailwind --app --eslint
npm install @neondatabase/serverless @google/generative-ai lucide-react clsx tailwind-merge

```


2. Create `.env.local`:
```env
DATABASE_URL=postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
GEMINI_API_KEY=AIzaSy...

```


3. Create `lib/db.ts`:
```typescript
import { neon } from '@neondatabase/serverless';
export const sql = neon(process.env.DATABASE_URL!);

```



### Phase 2: API Route Handlers

1. `app/api/transactions/audio/route.ts`: Handle audio upload, Gemini structured extraction, and database insertion.
2. `app/api/transactions/route.ts`:
* `GET`: Fetch metrics, categorized breakdowns, and transaction list filtered by `year` and `month`.
* `POST`: Manual entry fallback.
* `DELETE`: Remove entry by `id`.


3. `app/api/reports/history/route.ts`: Aggregate the last 6 months for historical evolution.

### Phase 3: Client Components

1. `components/VoiceRecorder.tsx`: Floating mic button with `MediaRecorder`, recording animation, base64 conversion, and optimistic UI updates.
2. `components/MonthPicker.tsx`: Controls for navigating between past and current months.
3. `components/DashboardMetrics.tsx`: KPI cards displaying Income, Expenses, Investments, and Net Balance.
4. `components/BreakdownViews.tsx`: Visual progress bars for expenses grouped by category and bank entity.
5. `components/BudgetCalculator.tsx`: Client-side 50/30/20 salary distributor.
6. `components/TransactionList.tsx`: Chronological feed with color-coded badges (`expense` = red, `income` = green, `investment` = purple) and delete action.

---

## 6. Verification &amp; Edge Cases

* **Silence / Inaudible Audio:** Gemini returns a fallback validation error; the API must return HTTP 422 with a clear toast notification.
* **Unspecified Bank Entity:** Prompt defaults missing financial entities to `"Efectivo"`.
* **Unspecified Date:** Prompt defaults missing dates to `CURRENT_DATE`.
* **Zero-Latency Feel:** UI optimistically renders or displays a lightweight skeleton loader during audio processing (~1.5s).