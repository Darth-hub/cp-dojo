# CP-Dojo — Master Context File
> Drop this at the repo root. Paste its contents at the top of any new Claude chat.
> Update this file after every major decision, feature completion, or design change.
>
> **Scope note:** this workspace contains two separate projects:
> - **CP-Dojo** (this file) — a platform to practice and get better in CP (competitive programming).
> - **Leet-Retention** — a browser extension made specifically for LeetCode users, which helps them review solved problems after some duration based on a personalised algorithm.
>
> The two are unrelated. This file covers CP-Dojo only — don't mix contexts between them.

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
| Contest page — duration/count picker, rating range, generate, start, live timer, refresh, finish | ✅ rebuilt from scratch this session (see note below) |
| Shared NavBar | ✅ |
| Middleware (route protection) | ✅ |
| `types/SessionProblem.ts` — includes `status` field | ✅ |
| `utils/checkSolvedStatus.ts` — computes status from CF verdict (OK→solved, TESTING/missing→testing, else→wrong), solved is permanent | ✅ |
| `ALTER TABLE session_problems ADD COLUMN status text DEFAULT 'none'` | ✅ run |
| Row colors by `status` (training + contest) | ✅ |
| DB writes include `status` (useTraining `checkDone`, useContest `refresh`) | ✅ |
| Refresh/check button loading state + last-updated timestamp (training + contest) | ✅ |
| Upsolve page — missed problems list, bookmark, mark upsolved | ✅ |
| `services/upsolve.service.ts` | ✅ |
| `hooks/useUpsolve.ts` | ✅ |
| Statistics page — split into Contest section (rating chart, past-contests table w/ A/B/C/D squares) and Training section (solved/attempted, by-tag, by-rating breakdowns) | ✅ |
| `services/statistics.service.ts` — `getRatingHistory`, `getTrainingStats` | ✅ |
| `hooks/useStatistics.ts` | ✅ |
| Training sessions retained as history (no longer deleted on regenerate) | ✅ |
| Weak tag detection + suggestion banner on training page | ✅ |
| `getWeakTags` in `services/statistics.service.ts` | ✅ |
| AI post-contest analysis (Gemini API) — blocking flow, analysis panel, continue button | ✅ |
| `app/api/analyze/route.ts` — server-side Gemini call | ✅ |
| `utils/getPerformance.ts` — real Elo-style performance rating via binary search | ✅ |
| `services/rating.service.ts` — `updatePlatformRating` with decaying K-factor | ✅ |
| Platform rating updates on contest finish | ✅ built, not yet tested against live data |
| `useBookmarks.ts` | ❌ empty |
| `bookmark.service.ts` | ❌ empty (note: bookmarking itself works via inline calls in `useTraining.ts`/`useUpsolve.ts` — this is about the dedicated service + list view) |

> ⚠️ **Correction to prior handoff doc:** the previous context doc said "contest page: built, working" — this was inaccurate. On resuming, `app/contest/page.tsx` was found to be an 18-line placeholder (NavBar only). The `useContest.ts` hook itself *was* fully built. The page has now been rebuilt from scratch against the real hook. Lesson: verify file state on disk before trusting a handoff doc's status claims.

---

## Session Log — What Was Just Fixed
**Task: switch problem-row background color logic from `solved_time` (boolean-ish) to `status` (enum), and persist `status` to DB on every refresh/check.**

1. `types/SessionProblem.ts` — `status` field was missing from the type despite the doc claiming it existed. Added: `status: "none" | "solved" | "wrong" | "testing"`.
2. `app/training/page.tsx` — row `background` now branches on `problem.status` (solved/wrong/testing/none) instead of `problem.solved_time`.
3. `app/contest/page.tsx` — was a placeholder, not a working page. Rebuilt fully: duration picker (60/90/120), problem-count picker (2/3/4), rating range inputs, generate/regenerate, "???" masking pre-start, live countdown timer, refresh + finish buttons, row coloring by `status`. Problem-name link is rendered via `React.createElement` (not literal JSX `<a>`) because of a recurring paste bug that was silently stripping the `<a` tag on every copy — this made the anchor invisible in multiple round trips before being traced to the clipboard/editor pipeline rather than the code itself. **Flagged but unresolved**: check for a clipboard manager or VS Code extension intercepting `<a` on paste.
4. `hooks/useContest.ts` — found and fixed a real pre-existing bug unrelated to the color task: `finish` was declared as a plain `const` *after* the timer `useEffect` that calls it, causing a temporal-dead-zone runtime error (`Cannot access 'finish' before initialization`). Fixed by converting `finish` to `useCallback` and moving its declaration above the timer effect. Also updated `refresh` to write `status` alongside `solved_time` on every problem, unconditionally (previously only wrote `solved_time` and only when it was still null).
5. `hooks/useTraining.ts` — same fix applied to `checkDone`: now writes `status` alongside `solved_time` for every problem on every check, unconditionally.

**Result:** row colors now correctly show green (solved), red (wrong), yellow (testing), or none — and that state survives page reloads / CF submission-window expiry because it's persisted to Supabase on every check, not just inferred live.

---

## Current Task
None in progress. This session's work (rating algorithm cap, home page redesign, custom JWT auth + RLS) is complete and verified.

---

## Session Log #8 — Backend TODO Cleanup (finishSession fix, Bookmarks, getSolvedProblems fix, Problems Cache)
Four smaller items knocked out in one pass, all from the pending TODO list at the time.

**1. Fixed `finishSession`'s missing `status` write.** Same bug class as the earlier `checkSolvedStatus.ts` issue — on contest finish, only `solved_time` was being written to `session_problems`, never `status`. Fixed: the update now writes `status: "solved"` alongside `solved_time`, and the `.is("solved_time", null)` guard was removed (unnecessary — only genuinely-solved problems are ever in the array being written).

**2. Fixed `getSolvedProblems`'s stale count limit.** The decision log had claimed this was already fixed ("remove `&from=1&count=500` to get full submission history"), but the actual code still had `count=500` — same "documented as done, not actually done" pattern hit twice earlier this session. Fixed for real this time: removed the `from`/`count` params entirely so CF's `user.status` endpoint returns full history.

**3. Bookmarks — built properly, using the actual dedicated `bookmarks` table as source of truth** (not the `session_problems.bookmarked` boolean flag, which was the "quick" option considered and explicitly rejected in favor of the schema-faithful approach — user's call: "quality should always be priority, go with option b").
   - `services/bookmark.service.ts` (new) — `addBookmark`, `removeBookmark`, `getBookmarks`, all keyed on the composite `(user_id, contest_id, index)`.
   - `hooks/useTraining.ts` / `hooks/useUpsolve.ts` — `toggleBookmark` now writes to the `bookmarks` table via the service, **and** keeps `session_problems.bookmarked` in sync as a denormalized flag purely so the ★/☆ icons can render fast per-row without cross-referencing the bookmarks table on every render. Deliberate two-write tradeoff, flagged as intentional.
   - `hooks/useBookmarks.ts` (new) — fetch + remove for the dedicated bookmarks page. **Known accepted edge case, documented in-code:** unbookmarking from this dedicated view can't reach back and un-star every `session_problems` row referencing the same CF problem (no session context in a bookmark record) — a stale ★ could theoretically show on an old training/upsolve view after unbookmarking elsewhere. Rare path, not fixed.
   - `app/bookmarks/page.tsx` (new) — list view, same visual pattern as upsolve/statistics.
   - `components/shared/NavBar.tsx` + `middleware.ts` — added the nav link and route protection (`config.matcher` needed the actual gate, not just the `PROTECTED_ROUTES` array — matcher determines which routes the middleware even runs on).

**4. Server-side problems cache** — `app/api/problems/route.ts` (new), `export const revalidate = 3600`. `useTraining.ts` and `useContest.ts` both switched from calling `getAllProblems()` directly (browser-side, every visitor hits CF independently) to `fetch("/api/problems")` (server-side, cached for an hour across all users). Testing this locally hit the same college-network-blocks-outbound-fetch issue as the Gemini route — confirmed fixed by switching networks (hotspot), not a code bug.

---

## Session Log #9 — Home Page Redesign
User wanted the atmospheric Japanese dusk background restored/rebuilt on the home page (it had been stripped to a placeholder comment at some point before this session — same "doc says built, reality says placeholder" pattern as earlier findings).

**Multiple iterations, most failed — logged honestly since the failure pattern itself is the useful lesson:**
1. First attempt: one large SVG with a single shared `viewBox`, containing a detailed pagoda, torii gate, and cherry blossom branches, using `preserveAspectRatio="xMidYMax slice"`. Broke badly — "slice" mode scales to *cover* the viewport like `background-size: cover`, which blew the scene up and pushed elements (branches, spire) off-screen on wide screens.
2. Second attempt: switched to `"xMidYMid meet"` (fit without cropping) and rebuilt each element smaller. Still fragile — one shared coordinate system meant every element's proportions depended on every other element's, and hand-guessing SVG coordinates without visual iteration is inherently unreliable for representational objects (pagodas, gates) that need to actually look like the real thing.
3. Third attempt: refactored to **independently-positioned elements** — each scene piece (Fuji+moon, pagoda, torii, blossom branches) as its own small SVG with a tight `viewBox` matching only its own content, placed via CSS `position: fixed` + `clamp()` sizing, not a shared coordinate space. Structurally more sound (nothing could push anything else off-screen), but the *illustrated objects themselves* (pagoda, torii, pine trees, birds) still looked wrong/unrecognizable when rendered, because hand-coding recognizable real-world objects in blind SVG without visual feedback doesn't reliably produce correct proportions — confirmed as a genuine limitation, not a one-off mistake, after it happened multiple times.
4. Tried Claude Design (a separate Anthropic product for visual iteration) to offload the object-illustration work — user reported it also didn't produce good results for this task.
5. Tried a more literal recreation of a torii-gate/Mt-Fuji reference photo (asymmetric composition, torii to the side rather than centered) — same problem, hand-coded representational objects (torii, pine trees, birds) didn't read correctly as those objects.

**What actually worked and was kept:** an **abstract, non-representational design** — no illustrated buildings or objects at all. Final version uses: a deep pink-to-black gradient sky, one soft glowing circle (moon, pure CSS radial-gradient), one ink-brush-style mountain silhouette (a single SVG path, deliberately soft/imprecise so slight stretching doesn't look "wrong" the way a literal building would), two square "hanko" stamp marks in the top corners reading 道 and 場 (together meaning "dojo" — a deliberate detail, not arbitrary decoration) in a dark ink color (`#3a1420`, fixed after an earlier contrast bug where the stamps were nearly invisible pink-on-pink), a seigaiha wave pattern strip along the bottom edge (classic Japanese motif, drawn as a simple repeating SVG `<pattern>`), and sparse falling cherry blossom petals via CSS `@keyframes`.

**Lesson for future work on this app:** abstract/geometric Japanese motifs (gradients, waves, stamps, soft silhouettes) render reliably in hand-coded SVG. Specific representational objects (pagodas, torii gates, pine trees, birds) do not, and repeated attempts confirmed this — don't retry the same approach for those; either use a real illustration/image asset instead of coding shapes from scratch, or accept the abstract style as the actual design direction (which is what happened here).

**Bugs fixed along the way:**
- A header text overlap bug — the "CP · 道場 · DOJO" label in the top-left didn't have enough left padding to clear the fixed-position 道 stamp box sitting on top of it. Fixed by giving the header the same `clamp()`-based left padding as the stamp box's own sizing, so they scale together and never overlap regardless of screen width.

**User explicitly decided not to extend this dusk theme to the other pages** (Training/Contest/Upsolve/Statistics/Bookmarks) — those keep their existing light cream/red palette. Reasoning discussed: the existing inner-page palette is already clean and readable; the real gap there is component *consistency* (buttons, cards, spacing), not color scheme — but user chose to defer that consistency pass and prioritize backend TODOs instead.

---

## Session Log #10 — Row Level Security via Custom JWT Auth
**The problem:** RLS was on the TODO list from the very first handoff doc, but standard Supabase RLS policies (`auth.uid() = user_id`) don't work in this app, because the app has no Supabase Auth at all — identity is a custom cookie plus a `users.id` UUID with zero connection to Supabase's own auth system. `auth.uid()` would simply always return null.

**Solution implemented: mint a custom signed JWT server-side after CF verification succeeds, shaped to match what Supabase Auth itself issues** (`sub` = user's UUID, `role: authenticated`, `aud: authenticated`), so Postgres's `auth.uid()` resolves correctly without adopting a full Supabase Auth flow. Confirmed via research this is a supported, common pattern — Supabase explicitly honors a JWT passed as a Bearer token in the `Authorization` header for RLS purposes, even when it wasn't issued by Supabase Auth itself, as long as it's signed with the project's own JWT secret.

**A real chicken-and-egg problem surfaced and was solved:** to mint a JWT for a user, their `users.id` UUID has to already exist — but it doesn't exist until after the row is inserted. So user creation can't be a normal RLS-protected "authenticated" write (there's no valid JWT yet at that moment). Solved by moving user creation server-side into a new route, using the privileged `service_role` key (which bypasses RLS entirely) to do the upsert, then minting the JWT for the resulting user and handing it back to the client — the standard secure pattern for this exact situation.

**Terminology note (came up mid-session, worth preserving):** the auth system is accurately described as **"passwordless,"** not "tokenless" — CF handle verification via COMPILATION_ERROR is still the actual identity-proving step and is completely unchanged by this work. The JWT is a session/authorization artifact for database-level access control, not a login credential the user ever sees or manages, same as how any "passwordless" system (magic links, OAuth) still ends up setting a session token after the auth event.

**Changes made:**
- **Two new secrets** added to `.env`: `SUPABASE_JWT_SECRET` (from Supabase's "Legacy JWT Secret" tab — confirmed still active and used to verify tokens even though the project's *default* signing method has moved to newer asymmetric ECC keys) and `SUPABASE_SERVICE_ROLE_KEY` (from the "Legacy anon, service_role API keys" tab). Both server-only.
- **`npm install jsonwebtoken` + `@types/jsonwebtoken`** added as a dependency.
- **`lib/supabase.ts`** — `createClient()` now automatically reads a `cpdojo-session` cookie (if present) and attaches it as an `Authorization: Bearer` header on every Supabase call, so every existing hook/service that already calls `createClient()` needed zero changes. Added a new `createServiceClient()` for server-only privileged operations (uses `@supabase/supabase-js`'s base client, not `@supabase/ssr`, since no cookie/session syncing dance is needed for a one-off privileged client).
- **`lib/jwt.ts`** (new) — `signSessionToken(userId)`, server-only, signs an HS256 JWT with `sub`, `role: authenticated`, `aud: authenticated`, 30-day expiry (matching the existing handle cookie's duration).
- **`app/api/verify/route.ts`** (new) — this was already a planned-but-empty slot in the original folder tree from the very first handoff doc; nice that it lined up. Moves CF verification finalization + user upsert server-side: calls the existing `fetchUserData`/`verifyHandle` (unchanged, still just reads public CF data), upserts the user via `createServiceClient()`, mints the JWT, returns `{ user, token }`.
- **`hooks/useUser.ts`** — `login()` now calls `/api/verify` instead of doing the Supabase upsert client-side; stores the returned JWT in a new `cpdojo-session` cookie alongside the existing `cpdojo-handle` cookie. `logout()` clears both cookies. The existing SWR restore-on-page-load logic needed **no changes** — it still queries Supabase directly via `createClient()`, which now transparently attaches the JWT.
- **`services/user.service.ts`** — removed `saveUserSupa` (dead code now, superseded by the inline upsert in the new route).
- **RLS policies written and enabled on all 5 tables** (`users`, `sessions`, `session_problems`, `bookmarks`, `rating_history`), scoped via `auth.uid()`. `session_problems` has no direct `user_id` column, so its policies check ownership via an `EXISTS` subquery against the parent `sessions` row. Added btree indexes on `sessions.user_id` and `session_problems.session_id` at the same time, since RLS now runs that `EXISTS` check on every request — this was already a flagged-but-deferred performance TODO from the original schema notes, now more urgent since it's on the hot path of every policy check.
- **Testing discipline followed carefully:** the full login flow was tested and confirmed working (both cookies present, JWT correctly shaped, existing data still readable) *before* running the RLS SQL script — deliberately, since enabling RLS with a broken JWT flow would lock the user out of their own data with no easy recovery path. Confirmed working end-to-end after the SQL ran: login, training generation, weak-tag suggestions, and existing session data all verified live in the browser.

**Known related risk, not a bug:** `app/api/verify/route.ts` makes server-side `fetch` calls to `codeforces.com`, the same class of request that was blocked by the college network/proxy earlier this session (for both the Gemini analysis route and the problems cache route). If verification breaks after deployment or on a different network, check this first — same root cause, same fix (different network, e.g. hotspot).

---

## Session Log #7 — Weak Tag Detection + AI Post-Contest Analysis
Two related but separate features, both aimed at giving the user smarter, personalized guidance rather than pure raw stats.

### Part 1 — Weak tag detection (pure SQL/aggregation, no AI needed)
- `services/statistics.service.ts` — added `getWeakTags(userId, minAttempts = 3)`. Queries `session_problems` joined through `sessions` for this user across **all** sessions (training + contest, not filtered by `is_completed` — training sessions still never get marked completed, so filtering on that would silently exclude all training data). Groups by tag, computes solve rate per tag, filters to tags with at least `minAttempts` attempts (so one unlucky problem doesn't falsely flag a tag as "weak"), returns the 5 lowest solve-rate tags.
- `hooks/useTraining.ts` — fetches weak tags on mount via a separate `useEffect` (kept independent from the existing session-restore effect — unrelated concerns). Added `applySuggestedTags(tags)` which just calls the existing `setSelectedTags`.
- `app/training/page.tsx` — added a suggestion banner above the tag selector: "Based on your history, you struggle with: [tags]" with a "use suggested tags →" action that pre-selects the matched weak tags. Only shows when the user has enough history (≥3 attempts per tag) to produce a real signal — silent for brand-new accounts.

### Part 2 — AI post-contest performance analysis
**Decision: chose Google Gemini over Anthropic's Claude API for this feature**, specifically because Gemini has a genuine permanent free tier (1,500 requests/day, no credit card, doesn't expire) versus Anthropic's pay-per-token model with only small starter credits. For a feature that fires once per contest finish with a short prompt, cost was negligible either way, but free was preferred. Tradeoff accepted: on Gemini's free tier, Google may use prompt content to improve their models (not the case on their paid tier) — judged acceptable since the data sent (problem ratings, solve times, weak tags) is low-stakes, not sensitive personal information.

- `app/api/analyze/route.ts` (new) — server-only route (API key never reaches the browser). Builds a prompt from the finished contest's problems, solved/total count, and the user's weak tags; calls Gemini's `gemini-2.5-flash` model via `generativelanguage.googleapis.com`; returns a brief 3-point analysis (current level, topics to focus on, one concrete next step).
- **Design decision confirmed with user: the flow blocks on the AI response** rather than navigating to `/statistics` immediately. `finish()` in `useContest.ts` was restructured: it still saves the session, updates the rating, etc., then fetches the analysis and stops — the contest's final problem list stays visible on screen (not cleared) so the user can see what they solved while reading the analysis. A new `dismissAnalysis()` function handles clearing state and navigating to `/statistics`, triggered by a "続ける・continue" button.
- `hooks/useContest.ts` — added `analysis`, `isAnalyzing` state; `finish()` now calls `/api/analyze` with the finished problems + weak tags (reusing `getWeakTags` from Part 1) after saving the session and rating; `dismissAnalysis()` added to the returned object.
- `app/contest/page.tsx` — added the analysis panel (loading state "考え中…" while waiting, then the analysis text + continue button once resolved). Gated the pre-finish config panel, problem list, and start button to all hide while the analysis panel is showing (`!isAnalyzing && !analysis` added to their existing conditions), so the UI doesn't show stale contest controls underneath the analysis.

### Debugging journey (all resolved)
This took several rounds to get working — logged in detail since the root causes are useful to remember:
1. **`.env` vs `.env.local` confusion** — user added `GEMINI_API_KEY` to `.env` (couldn't find `.env.local`). This is fine — Next.js loads `.env` too — so it wasn't actually the bug, but worth knowing both exist in this codebase now; `.env.local` was the original convention per the handoff doc for Supabase keys, `.env` now also holds `GEMINI_API_KEY`. No functional problem, just an inconsistency worth being aware of.
2. **Key format false alarm** — initial theory was that the copied key was truncated/mangled (looked suspiciously like it matched the truncated preview text shown in the AI Studio UI table). Turned out to be correct and complete — Google is mid-rollout of a new key format (`AQ.Ab...` "Auth key") replacing the old `AIza...` "Standard key" format, industry-wide change as of ~June 2026, nothing wrong with how the user copied it.
3. **Real fix #1: switched from query-param auth to header auth.** Changed `fetch(`${GEMINI_URL}?key=${apiKey}`)` to `fetch(GEMINI_URL, { headers: { "x-goog-api-key": apiKey } })` — more robust/current-recommended way to pass the new key format to Gemini's native endpoint.
4. **Real fix #2, the actual root cause: the college network/proxy was blocking outbound HTTPS to `generativelanguage.googleapis.com`.** Diagnosed via added `console.error`/`console.log` instrumentation in the route, which surfaced `ConnectTimeoutError` — a network-level failure, not an application bug. Confirmed once the user was on a different network. Not fixable in code; environmental.
5. **Cosmetic fix: stripped markdown from Gemini's response.** Gemini was returning `**bold**` markdown syntax that rendered as literal asterisks in the plain `<p>` tag. Fixed two ways: (a) added an explicit "no markdown formatting" instruction to the prompt, and (b) defensively `.replace(/\*\*/g, "")` on the response server-side as a safety net regardless of whether the model complies.

**Verified fully working end-to-end** after all fixes: finish contest → session saved → rating updated → weak tags fetched → Gemini analysis returned and displayed cleanly (no markdown artifacts) → continue button navigates to `/statistics`.

---

## Session Log #6 — Platform Rating Algorithm (Elo-Style Performance Rating)
Built `getPerformance.ts` (real implementation, replacing the `solved.length * 100` placeholder) and a new `services/rating.service.ts`, then wired both into `useContest.ts`'s `finish()`.

### The algorithm, in depth

**Problem:** given a contest with problems of varying CF difficulty and a count of how many the user solved, produce a single "performance rating" number for that contest — then blend it into the user's ongoing `platform_rating` in a way that's responsive early on but stable once established.

**Stage 1 — Performance rating via Elo expected-score + binary search**

Borrowed from the standard Elo expected-score formula (same math underlying chess ratings, and conceptually similar to what Codeforces itself uses to derive rating deltas from a contest):

```
E(R, problemRating) = 1 / (1 + 10^((problemRating - R) / 400))
```

This gives the probability that a player of skill `R` would solve a problem of the given CF `rating`. A harder problem relative to `R` → lower probability; an easier one → higher probability.

Summed across every problem in the contest, this becomes a function of one variable, `R`:

```
f(R) = Σ E(R, problem.rating)   for every problem in the contest's problem set
```

`f(R)` is strictly increasing in `R` — assuming a higher skill level always predicts solving more problems, never fewer. So there is exactly one value `R*` where `f(R*)` equals the number of problems the user *actually* solved. That `R*` is the contest's "performance rating": the skill level that would have made this exact outcome the expected one.

**Why binary search:** with more than one problem of differing difficulty, there's no closed-form algebraic inverse for `f(R) = actualSolved` — this is the same reason real performance-rating calculators (chess tournament performance ratings, etc.) use iterative/numeric methods instead of a formula. Since `f` is monotonic, binary search converges reliably: search `R` over a bounded range (0 to 4000, generously covering all CF ratings), narrow the interval each iteration based on whether the current midpoint's expected solve count is above or below the actual count, and after enough iterations (100, chosen for more than sufficient precision — the interval halves each time so this massively overshoots what's needed) the interval converges to `R*`.

Implementation (`utils/getPerformance.ts`):
```typescript
const expectedScore = (R: number, problemRating: number): number =>
  1 / (1 + Math.pow(10, (problemRating - R) / 400))

const getPerformance = (problems: ProblemResult[]): number => {
  if (problems.length === 0) return 1200
  const actualSolved = problems.filter((p) => p.solved).length
  let lo = 0, hi = 4000
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    const expected = problems.reduce((sum, p) => sum + expectedScore(mid, p.rating), 0)
    if (expected < actualSolved) lo = mid
    else hi = mid
  }
  return Math.round((lo + hi) / 2)
}
```

**Stage 2 — Blending performance rating into platform_rating with a decaying K-factor**

A single contest's performance rating is noisy — one lucky or unlucky problem set shouldn't swing someone's overall rating wildly. Standard approach (mirrors Elo/Glicko's treatment of "provisional" vs. "established" players): blend the new performance rating into the running rating with a weight `K` that starts high (fast convergence to true skill for new users, who have no prior signal to protect) and decays toward a floor as more rated contests accumulate (stability once a rating is well-established, so it doesn't thrash on every single result):

```
newRating = currentRating + K * (performanceRating - currentRating)
```

K-factor decay function (`services/rating.service.ts`):
```typescript
const getKFactor = (contestsPlayed: number): number => {
  const floor = 0.15    // minimum weight once established — rating still moves, just slowly
  const start = 0.8     // weight for a brand-new user's first contest
  const decay = Math.exp(-contestsPlayed / 5)
  return floor + (start - floor) * decay
}
```

This is exponential decay: at `contestsPlayed = 0`, K ≈ 0.8 (first contest almost entirely determines starting rating). By ~5 contests, K has decayed roughly two-thirds of the way from `start` toward `floor`. By ~15-20 contests, K is essentially at the floor (0.15) — a well-established user's rating changes slowly and smoothly, one contest at a time, rather than swinging on a single bad day.

`contestsPlayed` is derived by counting existing rows in `rating_history` for the user before this update — i.e., "how many times has this user's rating already been updated."

**Design call made this session:** problems with `status === "testing"` (in-queue/ambiguous CF verdict) at the moment of contest finish count as **unsolved** for both the `solved` list saved to `session_problems` and the performance-rating calculation. No last-second re-poll to try to resolve them — the contest is over, and testing-state at finish time should be rare in practice. Explicit user decision, not a default assumption.

**Wiring into `useContest.ts`'s `finish()`:**
- `solved` filter switched from `p.solved_time !== null` to `p.status === "solved"` — more direct, consistent with the permanence rule everywhere else in the codebase, and correctly excludes `"testing"` per the decision above.
- `performance` now comes from `getPerformance(...)` instead of `solved.length * 100`.
- After `finishSession` succeeds, `updatePlatformRating(user.id, user.platform_rating, performance)` is called — updates `users.platform_rating` and inserts a new row into `rating_history`.

**Known non-blocking gap:** `useUser`'s cached `user` object does not auto-refresh after a rating update — the home page's displayed rating and any other UI reading `user.platform_rating` will show the old value until the user refreshes or revisits. Explicitly accepted as fine for now (user's call) rather than wiring up SWR revalidation or local state sync immediately. Revisit if it becomes annoying in practice.

**Not yet tested against live data** — code is written and reasoned through but hasn't been run end-to-end (finish a contest → check `users.platform_rating` and `rating_history` in Supabase → confirm `/statistics` rating chart populates). That verification is the next concrete step whenever picked back up.

---

## Session Log #4 — Upsolve Feature
Built out the fully-planned-but-empty upsolve feature end to end:
- **`services/upsolve.service.ts`** (new) — `getUpsolveProblems(userId)` queries `session_problems` via an inner join on `sessions` (`sessions!inner(user_id, is_completed)`), filtering `is_completed = true`, `solved_time IS NULL`, `upsolved = false`. `setUpsolved(problemId, value)` toggles the flag, same pattern as bookmark toggling elsewhere.
- **`hooks/useUpsolve.ts`** (new) — plain state + `useCallback`/`useEffect` fetch (SWR wasn't a good fit here — no natural cache-sharing need, manual invalidation on mutation is simpler). Exposes `toggleBookmark` (inline Supabase call, mirrors `useTraining.ts`'s pattern) and `markUpsolved` (optimistically removes the problem from local state once marked).
- **`app/upsolve/page.tsx`** — replaced placeholder. List of missed problems: name (link), rating, bookmark toggle (★/☆), "復習済み・done" button. Problem-name links use `createElement("a", ...)` instead of literal JSX `<a>` — same clipboard-paste workaround as the contest page, since the `<a` tag kept getting silently stripped on paste into this file too.
- Verified end-to-end: finished a contest with unsolved problems, confirmed they appeared in `/upsolve`, bookmark toggle and "done" button both worked and persisted to Supabase correctly.

**Known gap surfaced during this work (not yet fixed):** `finishSession` in `session.service.ts` only writes `solved_time` when marking a contest finished, never `status` — same category of bug as the old `checkSolvedStatus.ts` issue. A problem solved right at the moment of contest-finish could end up with `solved_time` set but `status` still `"none"`. Flagged, not fixed — out of scope for upsolve, revisit alongside item on the TODO list.

---

## Session Log #5 — Statistics Feature + Training History Decision
**Design decision made this session: statistics page is split into two independent sections — Contest and Training — rather than one combined view.** Reasoning: contest performance (timed, rating-relevant, A/B/C/D-per-problem) and training progress (untimed, volume/tag/rating-coverage-based) are different enough metrics that combining them would be confusing. This is a new decision, not from the original handoff doc — add it to the permanent decisions list.

**Blocking problem discovered and resolved:** training sessions were never retained as history. `useTraining.ts`'s `generate()` called `deleteActiveSession(user.id)` before creating every new training set — meaning every regenerate **permanently deleted** the previous training session and its `session_problems` (cascade delete). There was no "finish training" action anywhere, so training sessions never accumulated into anything a stats page could aggregate.

Two fix options were discussed:
1. Add an explicit "finish training" concept (mark `is_completed: true` on some user action) — closer to how contests work, but requires a lifecycle change.
2. Stop deleting on regenerate; treat all training sessions (`started_at IS NULL`) as permanent history regardless of completion status; aggregate stats directly from `session_problems` across all of them.

**Chose option 2** (simpler, no schema/lifecycle change, aligns better with training being casual/repeated practice rather than discrete graded events). **Option 1 was noted as a valid alternative for future reconsideration** if a more explicit "training session history" view (like contests get) is ever wanted instead of pure aggregate stats.

**Changes made:**
- `hooks/useTraining.ts` — removed the `await deleteActiveSession(user.id)` call from `generate()`. Training sessions now persist forever once created; only the *most recent* one is treated as "active" (via `getActiveSession`'s existing `order by created_at desc limit 1` behavior). Old sessions become naturally inactive, not deleted.
- `services/statistics.service.ts` (new) — two functions:
  - `getRatingHistory(userId)` — straight read of `rating_history`, ordered by `recorded_at` ascending, for the rating chart.
  - `getTrainingStats(userId)` — queries all sessions where `started_at IS NULL` (all training sets, any completion state) with their `session_problems`, then aggregates client-side in JS: total attempted/solved, breakdown by tag, breakdown by rating. No `is_completed` filter, since training sessions still never get marked complete — only their existence matters now.
- `hooks/useStatistics.ts` (new) — pulls `getSessions` (existing, contests only in practice), `getRatingHistory`, and `getTrainingStats` in parallel via `Promise.all`. Filters `getSessions` results defensively to `started_at !== null` in case a training row ever ends up `is_completed: true` by accident in the future.
- `app/statistics/page.tsx` — replaced placeholder. Contest section: current rating, contest count, hand-drawn inline SVG line chart for rating history (no charting library added — kept dependency-free, matching the rest of the stack), past-contests table with A/B/C/D shown as small colored squares (green=solved, red=wrong, yellow=testing, gray=none), titled on hover with the problem name. Training section: total solved/attempted + solve rate, two side-by-side breakdown panels (by tag, by rating) as simple CSS progress bars, top-8-by-attempts cap on the tag list to avoid unbounded growth.

**Real bug found and fixed mid-build:** `session.service.ts`'s `getSessions` function selected `.select("*, session_problems(*)")` from Supabase, but its return type claimed the joined data would be under the key `problems` (`Session & { problems: SessionProblem[] }`). Supabase returns joined relations under their literal table name unless explicitly aliased — so `session.problems` was `undefined` at runtime, crashing the statistics page's `.map()` call the moment it tried to render contest rows. This bug existed since `session.service.ts` was originally written; the statistics page was just the first consumer to actually read `.problems`.
  - **Fix:** changed the select to `.select("*, problems:session_problems(*)")`, aliasing the relation to match what the type already claimed. One-line fix at the source; no downstream changes needed.

**Verified working:** contest table renders correctly with colored squares and performance numbers; rating chart correctly shows "not enough data yet" (since `rating_history` is still empty — see below).

**Known gap surfaced, not yet fixed:** the rating chart and "Rating: 1200" display are functionally correct but static — `rating_history` has zero rows because nothing has ever inserted into it. This is exactly TODO item #1 below (platform rating update on contest finish was never built). It's now more visible than before, since the statistics page makes the gap obvious on screen instead of just being an abstract missing feature.

---

## Session Log #3 — Refresh/Check Button UI Feedback
User flagged that the 確認·refresh (contest) and 確認·check (training) buttons gave no visual feedback on click, causing repeated clicking out of uncertainty.

**`hooks/useContest.ts`:** added `isRefreshing` / `lastRefreshed` state, wired through `refresh()`.
**`hooks/useTraining.ts`:** added `isChecking` / `lastChecked` state, wired through `checkDone()`.
**`app/contest/page.tsx`:** refresh button now shows "確認中…" while in flight and disables itself; a "更新済み · updated [time]" label appears above the button row after a successful refresh. (Also fixed a missing closing `</div>` bug introduced while wiring this up — the outer timer-bar container was left unclosed.)
**`app/training/page.tsx`:** same pattern — check button shows "確認中…" while in flight; "更新済み · [time]" label appears next to the problem count.

Both verified working via screenshots — button disables during the call, timestamp appears afterward, row colors update correctly alongside it.

---

## Pending TODOs (Priority Order)
1. Rate limiting on verify (Upstash) — `app/api/verify/route.ts` now exists as a real server route, making this easier to add than when verification was client-side
2. Fix `finishSession`'s missing `status` write (writes `solved_time` only, same bug class as the old `checkSolvedStatus.ts` issue — found during upsolve work, not yet fixed)
3. Extract inline UI into components (`app/contest/page.tsx`, `app/training/page.tsx`, `app/upsolve/page.tsx`, `app/statistics/page.tsx` all still fully inline)
4. Investigate the `<a` tag clipboard-stripping bug (recurring — hit on contest page and upsolve page both; current workaround is `React.createElement` instead of literal JSX `<a>` wherever a problem link is rendered)
5. **(Optional, low priority)** Consolidate env vars into one file — Supabase keys live in `.env.local`, `GEMINI_API_KEY`/`SUPABASE_JWT_SECRET`/`SUPABASE_SERVICE_ROLE_KEY` ended up in plain `.env`. Both work (Next.js loads both), purely a tidiness item.
6. **(Optional, revisit later)** Consider option 1 from the training-history decision — explicit "finish training" action + `is_completed` tracking for training sessions, if a session-level training history view (vs. pure aggregate stats) is ever wanted
7. **(Optional, low priority)** `user` object from `useUser` doesn't auto-refresh after a platform rating update — accepted as fine for now (page refresh shows correct value), revisit if it becomes annoying in practice
8. **(Optional, deferred by user this session)** Component-level design consistency pass on inner pages (Training/Contest/Upsolve/Statistics/Bookmarks) — buttons, cards, spacing currently ad-hoc per page. Explicitly deprioritized below backend work this session; palette itself is fine as-is (light cream/red), no plan to extend the home page's dusk theme to these pages.

---

## Key Decisions (preserve these)
| Decision | Why |
|---|---|
| No Supabase Auth, but a custom-minted JWT for RLS (added this session) | CF COMPILATION_ERROR trick remains the entire *identity verification* system — unchanged. Separately, a server-minted JWT (`sub` = user UUID, `role: authenticated`) is issued after verification purely so Postgres's `auth.uid()` can enforce real Row Level Security. Accurately described as "passwordless," not "tokenless" — the JWT is a session/authorization artifact, not a login credential. |
| User creation happens server-side via `service_role`, not client-side via `anon` key (added this session) | Chicken-and-egg: a JWT can't be minted for a user until their UUID exists, so the creating INSERT can't itself be RLS-protected via that same JWT. Solved by moving the upsert into `app/api/verify/route.ts` using the privileged `service_role` key (bypasses RLS), then minting the JWT for the resulting row. |
| Home page background is abstract/geometric, not representational illustration (added this session) | Multiple attempts at hand-coded SVG pagodas, torii gates, pine trees, and birds all failed to look correct — confirmed as a real limitation of blind-coded representational shapes, not a one-off mistake, after repeated tries (including via Claude Design). Final version uses only gradients, one soft mountain silhouette, a glowing circle, geometric hanko stamps, and a seigaiha wave pattern — all of which rendered reliably on the first or second attempt. |
| Home page's dusk theme is NOT extended to inner pages | User's explicit call — inner pages (Training/Contest/Upsolve/Statistics/Bookmarks) keep the existing light cream/red palette, which is already clean; component consistency (not color) is the real gap there, deferred behind backend TODOs. |
| Status written to DB on every refresh (not memory-only) | WA submissions fall out of CF's recent 500-submission window; DB ensures status survives indefinitely |
| Solved is permanent | Once `status === "solved"`, never downgraded by a later WA on the same problem |
| `getSolvedProblems` has no count limit | Original `count=500` caused already-solved problems to appear in generated sets |
| One `sessions` table for both training sets and contests | `started_at NULL` = training set, set = contest running, `is_completed = true` = history. Avoids duplicate tables. |
| Timer computed from `started_at`, never stored | `timeLeft = duration*60000 - (Date.now() - started_at)`. Accurate after tab close. No drift. |
| Delete + reinsert for regenerate (not update in place) | Problem count can change (3→4), and all fields change anyway — update is equivalent but more fragile |
| Training sessions are NO LONGER deleted on regenerate (changed this session) | Originally `deleteActiveSession` ran before every new training set, silently erasing all training history — this was an accidental side effect, not an intentional design choice. Now old training sessions persist as history; only the most recent is "active". Option to instead add an explicit "finish training" flow (matching contest's `is_completed` pattern) was considered and rejected for now as unnecessary complexity — training is casual/repeated practice, not discrete graded events. Revisit if a session-level training history view is ever wanted. |
| Statistics page split into two independent sections: Contest and Training | Contest metrics (timed, rating-relevant, per-problem pass/fail) and training metrics (untimed, volume/tag/rating-coverage) are different enough to be confusing if combined into one view. |
| Google Gemini chosen over Anthropic Claude for post-contest AI analysis | Gemini has a genuine permanent free tier (1,500 req/day, no card, no expiry); Anthropic is pay-per-token with only small starter credits. Cost was negligible either way for this use case, but free was preferred. Accepted tradeoff: Gemini's free tier may use prompt data to improve their models — judged fine since the data (problem ratings, solve times, weak tags) is low-stakes. |
| Post-contest AI analysis blocks navigation until dismissed | User explicitly chose this over navigating to `/statistics` immediately and showing the analysis asynchronously elsewhere. `finish()` shows a loading state, then the analysis + a "continue" button; only clicking continue navigates onward. Final problem list stays visible behind/alongside the analysis rather than clearing immediately. |
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
- `platform_rating` default: schema says 1200, old `saveUserSupa` inserted 1500 — `saveUserSupa` is now removed (superseded by the upsert inline in `app/api/verify/route.ts`, which still inserts 1500). Mismatch still exists, now in the new route instead.
- Rate limiting still not implemented on `/api/verify` — public endpoint, no abuse protection yet

---

## Known Bugs
- `platform_rating` default mismatch (schema: 1200, `app/api/verify/route.ts`: 1500)
- `finishSession` writes `solved_time` on contest finish but not `status` — flagged, not yet fixed (see TODO #2)

---

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=        # https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # legacy anon key, currently in .env.local
GEMINI_API_KEY=                  # server-only — currently in .env
SUPABASE_JWT_SECRET=             # server-only — Legacy JWT Secret, currently in .env
SUPABASE_SERVICE_ROLE_KEY=       # server-only, bypasses RLS entirely — currently in .env
```
Supabase URL/anon key are `NEXT_PUBLIC_` — safe client-side, now genuinely protected by real RLS policies (enabled this session). `GEMINI_API_KEY` is used exclusively in `app/api/analyze/route.ts`. `SUPABASE_JWT_SECRET` is used exclusively in `lib/jwt.ts` to sign session tokens. `SUPABASE_SERVICE_ROLE_KEY` is used exclusively in `lib/supabase.ts`'s `createServiceClient()`, called only from `app/api/verify/route.ts` — this key bypasses every RLS policy and must never reach the browser or be used in a `"use client"` file. Gemini key format is Google's newer `AQ.Ab...` "Auth key" (replacing the older `AIza...` format industry-wide as of ~June 2026) — passed via the `x-goog-api-key` header, not the `?key=` query param. Supabase's JWT secret is the "Legacy JWT Secret" — still active and used to verify tokens even though the project's *default* signing method has moved to newer asymmetric ECC keys.

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