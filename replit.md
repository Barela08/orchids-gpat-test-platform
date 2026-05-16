# GPAT Exam Portal

A mock test platform for GPAT (Graduate Pharmacy Aptitude Test) preparation — students can practice questions by subject/chapter/year, take timed tests, and admins can manage the question bank.

## Run & Operate

- `PORT=8080 pnpm --filter @workspace/api-server run dev` — run the API server
- `PORT=18431 BASE_PATH=/ pnpm --filter @workspace/gpat-portal run dev` — run the frontend
- `pnpm --filter @workspace/gpat-portal run build:vercel` — build frontend for Vercel
- Required env: `MONGODB_URI`, `JWT_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind + Shadcn UI (wouter for routing)
- Backend: Express 5 + MongoDB + Mongoose
- Auth: JWT (bcryptjs for hashing)
- Deployment: Vercel (frontend static + backend as serverless function)

## Where things live

- `artifacts/gpat-portal/` — React frontend
- `artifacts/api-server/` — Express backend
- `api/index.ts` — Vercel serverless function entry (wraps Express app)
- `vercel.json` — Vercel deployment config
- `artifacts/api-server/src/models/` — Mongoose models (User, Question, TestResult)
- `artifacts/api-server/src/routes/` — API routes (auth, questions, students, test)

## Architecture decisions

- MongoDB (Mongoose) used for all data — flexible schema suits question bank use case
- JWT stored in localStorage for simplicity; tokens expire in 7d
- Vercel: frontend is static, backend is one serverless function at `/api`
- Admin account created via `/api/auth/init-admin` (blocks if admin already exists)

## User preferences

- Deploy on Vercel

## Gotchas

- The `/api/auth/init-admin` default password is `admin1234` — change after first login
- `pino-pretty` is excluded from production (only used in dev via NODE_ENV check)
- Vercel serverless function at `api/index.ts` does NOT use pino-http (uses console instead)
