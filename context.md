# CP-Dojo — Master Context File
> Drop this at the repo root. Paste its contents at the top of any new Claude chat.
> Update this file after every major decision, feature completion, or design change.

---

## Project Identity
- **What:** Full-stack CP training tracker for Codeforces users, inspired by ThemeCP training method
- **Replaces:** [C0ldSmi1e/Training-Tracker](https://github.com/C0ldSmi1e/Training-Tracker) which used localStorage — cp-dojo uses Supabase for cross-device persistence
- **GitHub:** hchadha28/cp-dojo
- **Local path:** /Users/harkiratchadha/cp-dojo
- **Deploy target:** Vercel

---

## Stack
| Layer | Tech |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript (strict, no `any`) |
| Package manager | Bun |
| Styling | Tailwind CSS + inline styles (Japanese theme = inline styles primarily) |
| UI components | shadcn/ui — Radix, Nova preset. Installed: button, card, input, separator, table, avatar, dropdown-menu, sheet, scroll-area, badge |
| Data fetching | SWR |
| Database | Supabase (Postgres), `@supabase/ssr` `createBrowserClient` |
| Auth | Custom cookie-based, NO Supabase Auth |
| Icons | Lucide React |
| Utils | clsx, tailwind-merge |
| External API | Codeforces public API (no auth) |

---

## Architecture
```
app (pages/routing)
  → components (UI only, call hooks only)
    → hooks ("use client", React state, calls services + utils)
      → services (async functions, no React, calls lib or CF API)
        → lib (client initializers only)
utils = pure functions, zero side effects, zero React
types = TypeScript shapes only, no logic
```
**Rules:**
- Components never call services directly
- Hooks never call CF API directly (go through services)
- `"use client"` required on any file using useState, useEffect, useSWR, document, cookies
- `createClient()` always called fresh per request (never module-level singleton — prevents server session leaking)

---

## Design System (Japanese Dusk Theme)
- Background: `#f5f0eb` cream
- Panel: `#faf7f4`
- Dark text / buttons: `#2c2420`
- Red accent: `#c0392b`
- Muted: `#8c7b6b`
- Borders: `#c8b8a2` / `#e8ddd0`
- Font: Georgia serif throughout
- Labels: bilingual pattern `日本語 · ENGLISH` (e.g. `修行 · TRAINING`)
- Home page: Full CSS/SVG Japanese scene (sky, Fuji, pagoda, bridge, petals) — renders regardless of login state

---

## Auth Flow (Custom, No OAuth)
1. User enters CF handle → `fetchUserData(handle)` confirms handle exists on CF
2. User shown problem 2150G → submits any code that gives COMPILATION_ERROR
3. `verifyHandle(handle)` → `getSubmissions(handle, 10)` → checks for COMPILATION_ERROR on contestId=2150, index="G"
4. `saveUserSupa(...)` → upserts to `users` table (onConflict: cf_handle), sets `platform_rating: 1500`
5. `setCookie("cpdojo-handle", handle, 30)` → stored in browser for 30 days
6. SWR mutated with saved user object
7. SSR guard: `if (typeof window === "undefined") return null` prevents cookie reads on server

---

## Supabase Schema
```sql
users(
  id uuid PK DEFAULT gen_random_uuid(),
  cf_handle text UNIQUE,
  cf_rating int,
  avatar_url text,
  platform_rating int DEFAULT 1200,  -- NOTE: saveUserSupa inserts 1500, minor inconsistency
  created_at timestamptz
)

sessions(
  id uuid PK,
  user_id uuid REFERENCES users CASCADE,
  started_at bigint NULLABLE,        -- NULL = training set (not started); set = contest running
  ended_at bigint,
  duration_minutes int,
  problem_count int,
  performance int,
  is_completed bool DEFAULT false,
  tags text[],
  created_at timestamptz
)

session_problems(
  id uuid PK,
  session_id uuid REFERENCES sessions CASCADE,  -- cascade delete
  contest_id int,
  index text,
  name text,
  rating int,
  tags text[],
  url text,
  solved_time bigint,
  status text DEFAULT 'none',         -- ADDED via ALTER TABLE
  bookmarked bool DEFAULT false,
  upsolved bool DEFAULT false
)

bookmarks(
  user_id uuid REFERENCES users CASCADE,
  contest_id int,
  index text,
  name text,
  rating int,
  tags text[],
  url text,
  created_at timestamptz,
  PRIMARY KEY(user_id, contest_id, index)  -- composite PK, no UUID
)

rating_history(
  id uuid PK,
  user_id uuid REFERENCES users CASCADE,
  platform_rating int,
  recorded_at timestamptz
)
```
**Table relationships:**
```
users (1) ──< sessions (many)
sessions (1) ──< session_problems (many)  [cascade delete]
users (1) ──< bookmarks (many)            [composite PK]
users (1) ──< rating_history (many)
```
**RLS:** Disabled. Must be enabled before going public.

---

## Key Types
```typescript
// types/SessionProblem.ts
status: "none" | "solved" | "wrong" | "testing"

// types/Response.ts
type Response<T> = SuccessResponse<T> | ErrorResponse
```

---

## SWR Cache Keys
- `cpdojo-user`
- `cpdojo-all-problems`
- `cpdojo-solved-${handle}`

---

## Routing & Middleware
- Routes: `/`, `/training`, `/contest`, `/upsolve`, `/statistics`
- `middleware.ts` at root: protects `/training /contest /upsolve /statistics`, redirects to `/` if no `cpdojo-handle` cookie

---

## What's Built and Working
| Feature | Status |
|---|---|
| Home page + Japanese scene | ✅ |
| CF handle verification (COMPILATION_ERROR trick) | ✅ |
| Training page — generate by rating/tags, persist to Supabase, bookmark, check solved | ✅ |
| Contest page — fresh unseen problems, duration + count picker, timer from `started_at`, refresh, finish | ✅ |
| Shared NavBar | ✅ |
| Middleware (route protection) | ✅ |
| `types/SessionProblem.ts` — includes `status` field | ✅ |
| `utils/checkSolvedStatus.ts` — computes status from CF verdict (OK→solved, TESTING/missing→testing, else→wrong), solved is permanent | ✅ |
| `ALTER TABLE session_problems ADD COLUMN status text DEFAULT 'none'` | ✅ run |
| Upsolve page | ❌ placeholder (NavBar only) |
| Statistics page | ❌ placeholder (NavBar only) |
| `getPerformance.ts` | ❌ `export {}` placeholder only |
| `useUpsolve.ts` | ❌ empty |
| `useStatistics.ts` | ❌ empty |
| `useBookmarks.ts` | ❌ empty |
| `bookmark.service.ts` | ❌ empty |
| `upsolve.service.ts` | ❌ empty |

---

## Current Task (next to complete)
**Switch row colors from `solved_time` → `status` in both pages.**

In `app/training/page.tsx` and `app/contest/page.tsx`, replace:
```tsx
background: problem.solved_time ? "rgba(45, 173, 84, 0.18)" : "transparent"
```
with:
```tsx
background:
  problem.status === "solved"  ? "rgba(45, 173, 84, 0.18)"  :
  problem.status === "wrong"   ? "rgba(192, 57, 43, 0.18)"  :
  problem.status === "testing" ? "rgba(212, 160, 23, 0.20)" :
  "transparent",
```

Also update DB writes to include `status`:
- `useTraining.ts` `checkDone` → add `status: p.status` to the supabase `.update()`
- `useContest.ts` refresh → same

**Blocker:** Supabase is paused (free tier, inactive 1+ month). Restore at supabase.com before testing DB features. UI color change can be made without Supabase.

---

## Pending TODOs (Priority Order)
1. ✳️ **Status colors** (current task — UI + DB write update, described above)
2. `useUpsolve.ts` — query `session_problems` WHERE `solved_time IS NULL AND upsolved = false` and session `is_completed = true` for this user
3. `app/upsolve/page.tsx` — list of missed problems, bookmark + mark upsolved buttons
4. `useStatistics.ts` — `getSessions` (completed) + `rating_history` for chart
5. `app/statistics/page.tsx` — rating chart + past contests table with A/B/C/D colored rectangles (green=solved, empty=unsolved)
6. `getPerformance.ts` rewrite — compute performance from problem ratings + solve times, no Level system. Used in `useContest.ts` finish (currently `solved.length * 100`)
7. Platform rating update — on contest finish: compute delta, update `users.platform_rating`, insert into `rating_history`
8. `bookmark.service.ts` — `addBookmark`, `removeBookmark`, `getBookmarks`
9. `useBookmarks.ts` hook
10. Bookmarks display — sheet/modal from navbar or per-page
11. `app/api/problems/route.ts` — server-side Next.js cache for `getAllProblems` (`export const revalidate = 3600`)
12. RLS on all tables before going public
13. Rate limiting on verify (Upstash)

---

## Key Decisions (preserve these)
| Decision | Why |
|---|---|
| No Supabase Auth | CF COMPILATION_ERROR trick is the entire auth system. No password/OAuth needed. |
| Status written to DB on every refresh (not memory-only) | WA submissions fall out of CF's recent 500-submission window; DB ensures status survives indefinitely |
| Solved is permanent | Once `status === "solved"`, never downgraded by a later WA on the same problem |
| `getSolvedProblems` has no count limit | Original `count=500` caused already-solved problems to appear in generated sets |
| One `sessions` table for both training sets and contests | `started_at NULL` = training set, set = contest running, `is_completed = true` = history. Avoids duplicate tables. |
| Timer computed from `started_at`, never stored | `timeLeft = duration*60000 - (Date.now() - started_at)`. Accurate after tab close. No drift. |
| Delete + reinsert for regenerate (not update in place) | Problem count can change (3→4), and all fields change anyway — update is equivalent but more fragile |
| Update in place for status/bookmarks/upsolved | Only one field changes, problem identity stays the same |
| Cascade delete on `session_problems` | `session_id REFERENCES sessions(id) ON DELETE CASCADE` |
| Upsolve is derived from `session_problems`, no separate table | Single source of truth, no sync bugs |
| Composite PK on `bookmarks` | `(user_id, contest_id, index)` — no UUID needed, delete by known fields |
| UUID as user PK (not CF handle) | Handle changes don't orphan rows. Handle change = new UUID = fresh start (accepted tradeoff). |
| Verification problem is 2150G | Hard enough that accidental COMPILATION_ERROR are extremely unlikely |
| macOS casing bug | NavBar.tsx was saved as Navbar.tsx (macOS case-insensitive FS). Use `git mv` for renames. |

---

## Technical Debt
- All page UI is inline in `page.tsx` files — should be extracted to `components/home/`, `components/training/` etc.
- `useTraining.ts` and `useContest.ts` both fetch `allProblems` and `solvedProblems` independently — should be a shared `useProblems` hook (SWR deduplication saves it for now)
- Status DB write is N separate updates per refresh — should be a single batch upsert
- `app/api/problems/route.ts` not built — every user's browser hits CF API independently
- No RLS — any client with anon key can read all data
- `platform_rating` default: schema says 1200, `saveUserSupa` inserts 1500 — minor inconsistency to fix when rating system is built

---

## Known Bugs
- Row backgrounds still use `solved_time` not `status` (current task)
- Supabase project paused — restore at supabase.com
- `getPerformance.ts` is `export {}` placeholder — contest finish uses `solved.length * 100`
- `platform_rating` default mismatch (schema: 1200, code: 1500)

---

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=        # https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # starts with "oli..."
```
Both `NEXT_PUBLIC_` — safe client-side. RLS (when enabled) enforces row-level access.

---

## Codeforces API Notes
- Base: `lib/codeforces.ts` → `cfFetch(endpoint)` → `https://codeforces.com/api/{endpoint}`
- Checks `data.status === "OK"`, throws on error, returns `data.result`
- Endpoints used: `user.info`, `user.status`, `problemset.problems`
- `user.status` returns recent submissions — CF caps this; no reliable total count
- Verification problem: contestId=2150, index="G"

---

## File Map (key files)
```
lib/codeforces.ts           — universal CF API fetcher
lib/supabase.ts             — createClient() (fresh per request)
services/user.service.ts    — verification, CF profile fetch, Supabase upsert
services/problem.service.ts — getAllProblems, getSubmissions, getSolvedProblems (no count limit)
services/session.service.ts — CRUD for sessions + session_problems
utils/getRandomProblems.ts  — pure: filter by rating/tags/solved, shuffle, return SessionProblem[]
utils/checkSolvedStatus.ts  — pure: compare submissions to session problems, return with status field
utils/getPerformance.ts     — PLACEHOLDER (export {} only)
hooks/useUser.ts            — full auth flow + cookie management
hooks/useTraining.ts        — training page state (SWR allProblems + solvedProblems)
hooks/useContest.ts         — timer (from startedAt), auto-finish, refresh
middleware.ts               — route protection via cookie check
types/SessionProblem.ts     — includes status: "none" | "solved" | "wrong" | "testing"
public/data/tag.json        — all CF problem tags
```