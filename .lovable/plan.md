# Mega-Plan: Real Exam Platform Upgrade

Stack stays Vite + React + TypeScript + Tailwind + shadcn + Supabase (Lovable Cloud). Adding TanStack Query, Zustand, Framer Motion, Recharts. Next.js is not supported in Lovable, so we are not migrating.

Scope is huge, so this plan is split into 5 phases. Each phase ends in a working, shippable state. I will implement them sequentially in follow-up turns after you approve. We do **not** ship everything in one giant code dump — that guarantees breakage.

---

## Phase 1 — Premium false-restriction bug (ship first, same day)

Root cause hypotheses (to verify with logs/DB before fixing):
- Multiple `useEffect`s reading `premium_users` with stale/duplicate queries, no shared cache → race conditions.
- `AccessGuard`, `Verify.tsx`, `BypassBlockGuard`, `Pricing.tsx`, `LinkShortenerGate` each query premium independently with different filters (`user_id` vs `email`, with/without `expiry_date > now()`).
- Token refresh: after `supabase.auth.refreshSession`, premium fetch is not re-run → user sees "Buy Premium" until reload.
- Expired rows: rows with `status='active'` but `expiry_date < now()` are sometimes treated as active.

Fix:
1. Create `src/hooks/usePremiumStatus.ts` — single source of truth, TanStack Query, 30s stale time, invalidates on `onAuthStateChange` (SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED).
2. Create `supabase/functions/check-premium/index.ts` — server-side verification, returns `{ isPremium, expiresAt, plan, source }`. Used as fallback when client query returns nothing.
3. Replace all ad-hoc premium checks (AccessGuard, Verify, Pricing, BypassBlockGuard, Dashboard badge, NavigationHeader) with the hook.
4. Add `premium_users` DB index on `(user_id, status, expiry_date)` and a daily cron that flips expired rows to `status='expired'`.
5. Add a `premium-debug` admin tool: paste a user email → see raw row + edge-function verdict.

Exit criteria: paid user on any route never sees Buy Premium / Verify until `expiry_date` actually passes.

---

## Phase 2 — Real Exam Simulation UI

New route `/exam/:testId` (separate from `/quiz/:testId` so we don't break existing).

Components (`src/components/exam/`):
- `ExamShell` — fullscreen API, distraction-free, dark-mode toggle, keyboard shortcuts (1-4 answer, N next, P prev, M mark-for-review, S save, Esc menu).
- `ExamTimer` — server-authoritative. Start time stored in `exam_attempts.started_at`; client computes remaining from `now() - started_at`. Resists tab close / clock change. Auto-submits at 0.
- `QuestionPalette` — sidebar grid colored by status: not visited / not answered / answered / marked / answered+marked.
- `SectionSwitcher` — tabs per subject, with per-section timers if `sections.duration_minutes` set.
- `QuestionView` — supports MCQ, multi-select, integer, matrix, comprehension. Negative marks per question (uses existing `questions.marks` / `negative_marks`).
- `BookmarkPanel`, `ReviewLaterList`.
- `AutoSaveIndicator` — debounced save every 5s + on every answer change to `exam_attempts.answers` jsonb.
- `ResumeBanner` on Dashboard for incomplete attempts.

DB changes (migration):
- `exam_attempts` (user_id, test_id, started_at, expires_at, submitted_at, answers jsonb, marks_for_review jsonb, current_question int, status: in_progress|submitted|auto_submitted)
- `test_sections` optional table for section-based exams.
- RLS: user can read/write own attempts only; admin read-all.

Mobile: same UI, palette becomes a bottom sheet, fullscreen falls back to scroll-lock on iOS.

---

## Phase 3 — Analytics & Rankings

Edge function `compute-attempt-analytics` runs on submission and writes to `attempt_analytics`:
- per-subject accuracy, time/question, weak chapters (uses `questions.subject`, add `chapter` column).
- percentile (vs all attempts on same test), predicted rank.
- AI insights via Lovable AI Gateway (`google/gemini-2.5-flash`) — "Top 3 weaknesses, 3 actions".

New pages:
- `/analytics` — overhauled with Recharts: line (progress), radar (subject), heatmap (time/Q).
- `/leaderboard/:testId` — per-test ranking; existing global stays.
- Profile: streaks, achievement badges (`badges` table + `user_badges`), progress graphs.

---

## Phase 4 — Generator → Main ingest hardening

Currently shashank-quiz-maker writes to Supabase directly with anon key. That's a security hole (anyone can insert/modify tests).

Replace with:
- `supabase/functions/ingest-quiz` — POST, validates `X-Ingest-Secret` header against new `QUIZ_INGEST_SECRET`.
- Zod schema validates payload (test meta + questions, subject enum, marks bounds, dedup by external_id).
- Idempotency key (`external_id` unique on `tests`) — retries safe.
- Tighten `tests` / `questions` RLS: remove `allow_all_*` policies, INSERT only via service role (edge function).
- Rate limit per secret (50 tests/hour) via simple `ingest_log` table.
- Admin "Ingest Log" panel: recent payloads, errors, retry button.

I'll give you the exact code snippet to paste into shashank-quiz-maker after the endpoint is live.

---

## Phase 5 — UI/UX polish, SEO, performance

UI:
- Adopt Framer Motion page transitions, skeleton loaders, glassmorphism dashboard refresh.
- Replace remaining raw color classes with design tokens.
- shadcn chart components for analytics.

SEO:
- `public/sitemap.xml` generated from tests at build.
- Per-route `<title>` / meta via react-helmet-async; JSON-LD `Course` / `Quiz` schema on test pages.
- OG image per exam category.
- robots.txt already permissive — add `Sitemap:` line.
- Lazy-load admin chunks, route-level `React.lazy`.
- `vite-imagetools` + preload LCP.

Bug sweep:
- Hydration: not applicable (SPA), but fix flicker by gating render on `usePremiumStatus.isLoading`.
- Timer desync: covered in Phase 2.
- Session resilience: global `onAuthStateChange` in a `AuthProvider` + TanStack invalidations.

---

## Technical notes

State: TanStack Query for server state, Zustand only for exam-runtime client state (current question, palette UI, fullscreen). No Redux.

Folder additions:
```text
src/
  hooks/usePremiumStatus.ts, useExamAttempt.ts, useExamTimer.ts
  stores/examStore.ts           (zustand)
  components/exam/*
  components/analytics/*
  lib/queryClient.ts
supabase/functions/
  check-premium/
  ingest-quiz/
  compute-attempt-analytics/
```

New DB tables: `exam_attempts`, `attempt_analytics`, `badges`, `user_badges`, `ingest_log`, optional `test_sections`. All with RLS.

New secrets: `QUIZ_INGEST_SECRET`. `LOVABLE_API_KEY` already present for AI insights.

---

## Out of scope / explicit non-goals

- Not migrating to Next.js (Lovable = Vite only).
- Not rebuilding existing `/quiz` route — new `/exam` route runs alongside until users migrate.
- Not changing Razorpay flow (already fixed in prior turns).
- "Investor-demo quality" polish in Phase 5 is best-effort; perfection across 11 exam types needs iteration with real content.

---

## Execution order after approval

1. Phase 1 (premium bug) — 1 turn.
2. Phase 2 (exam UI) — 2–3 turns due to size.
3. Phase 3 (analytics) — 1–2 turns.
4. Phase 4 (ingest) — 1 turn + you update generator site.
5. Phase 5 (polish/SEO) — 1–2 turns.

You can stop after any phase and the app remains shippable.
