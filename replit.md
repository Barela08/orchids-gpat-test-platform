# GPAT Exam Portal

An online practice portal for the Graduate Pharmacy Aptitude Test (GPAT) — students can log in, take timed exams by year, and review results; admins can upload questions, manage students, and view all results.

## Run & Operate

- Frontend dev: `pnpm --filter @workspace/gpat-portal run dev`
- API dev: `pnpm --filter @workspace/api-server run dev`
- Build API: `pnpm --filter @workspace/api-server run build`

Required env vars / secrets:
- `MONGODB_URI` — MongoDB connection string (Atlas or self-hosted)
- `JWT_SECRET` — Optional; defaults to hardcoded fallback (set for production)

## Stack

- **Frontend**: React 19 + Vite + Tailwind v4 + shadcn/ui + wouter (routing)
- **Backend**: Express 5 + Mongoose (MongoDB ODM) + bcryptjs + jsonwebtoken
- **Runtime**: Node 24, pnpm workspace monorepo

## Where things live

- `artifacts/gpat-portal/src/` — React frontend
  - `pages/` — home, dashboard, test, result, admin
  - `lib/auth-context.tsx` — JWT auth context (localStorage-based)
  - `index.css` — Tailwind v4 theme (oklch colors)
- `artifacts/api-server/src/` — Express backend
  - `models/` — Mongoose models: User, Question, TestResult
  - `routes/auth/` — login, register, init-admin
  - `routes/questions/` — CRUD + years list
  - `routes/students/` — list, delete
  - `routes/test/` — submit, results

## Architecture decisions

- **MongoDB over Postgres**: Original app uses Mongoose/MongoDB; kept to preserve data compatibility and avoid a full ORM migration.
- **JWT + localStorage auth**: Auth context stores token in localStorage; no session cookies. Simple and stateless.
- **Admin seeded automatically**: `GET /api/auth/init-admin` creates `admin` / `admin1234` on first visit if no admin exists.
- **Lazy MongoDB connection**: `connectDB()` connects at request time, not at server startup, so the server stays up even if MongoDB is temporarily unreachable.
- **Tailwind v4 + oklch**: Uses Tailwind v4 with `@tailwindcss/vite` plugin and oklch color space (no postcss conflict).

## Product

- **Login / Register** — JWT-authenticated; admin role auto-redirects to admin panel
- **Dashboard** — lists available test years with question counts, shows personal test history
- **Test page** — timed multiple-choice exam with question navigator and submit
- **Result page** — score breakdown (correct/wrong/unanswered) with optional answer review
- **Admin panel** — tabs for student results, student management, question bank, and bulk question upload

## User preferences

- Developed by Nilesh Barela
- Admin credentials: email `admin`, password `admin1234`

## Gotchas

- Do NOT run `pnpm dev` at workspace root — apps run via Replit workflows
- `pnpm --filter @workspace/api-server run build` must be run before `start` (esbuild bundles everything)
- The postcss.config.mjs from the original Next.js import conflicts with Tailwind v4 — do not restore it

## Pointers

- Routing skill: `.local/skills/pnpm-workspace/SKILL.md`
- React-Vite patterns: `.local/skills/react-vite/SKILL.md`
