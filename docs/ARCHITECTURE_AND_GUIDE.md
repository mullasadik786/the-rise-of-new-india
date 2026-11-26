# The Rise of New India — Architecture, Deployment & Testing Guide

## 1. Architecture Overview
- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 (light/dark themes, `Plus Jakarta Sans` + `DM Sans` + `JetBrains Mono`, WCAG 2.2 AA focus and reduced-motion support).
- **Backend**: Express REST API (`server.ts`, `src/routes/api.ts`) with Zod schema validation, Helmet security headers, and tiered rate limiting.
- **Database**: PostgreSQL via Cloud SQL (`src/db/schema.ts`, `src/db/index.ts`) using Drizzle ORM with connection pooling and parameterized queries.
- **Authentication & RBAC**: Firebase Auth Google Sign-In (`src/lib/firebase.ts`) verified server-side (`src/middleware/auth.ts`) across 10 RBAC roles (`super_admin`, `regional_admin`, `dept_officer`, `farmer`, `citizen`, `msme_owner`, `student_seeker`, `employer`, `training_institution`, `public_visitor`).
- **AI Layer**: Server-side `@google/genai` (`src/lib/gemini.ts`) with prompt injection filtering, multilingual support (English, Hindi, Telugu), image screening, and explicit human-confirmation warnings.
- **India-First Expansion**: Configurable `regions` table starting with Indore (`mp-indore`), Bhopal, Ujjain, Pune, and Hyderabad; admins can onboard new Indian districts dynamically.

## 2. API Documentation
OpenAPI 3.1 specification is served live at `/api/openapi.json`.

## 3. Security & DPDP Act 2023 Safeguards
- No API keys or database credentials in client bundles.
- Public civic complaint views strip citizen identifiers (`userId`, email).
- Explicit DPDP Act 2023 consent tracking, profile correction (`PATCH /api/auth/me`), and account erasure (`DELETE /api/auth/me`).
- Sensitive actions (role assignments, workflow status advances, district onboarding) are recorded in `audit_logs`.

## 4. Installation & Running
1. Configure runtime environment variables (`GEMINI_API_KEY`, `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DB_NAME`).
2. Install dependencies: `npm install`.
3. Run tests: `npm test`.
4. Type-check and build: `npm run lint && npm run build`.
5. Start server: `npm start` (port 3000).
