# Session 1 — High-Level Design, Architecture & Tech Stack Tradeoffs
### CP-Dojo Interview Prep — Day 1, Session 1 of 4

---

## Part A — The Elevator Pitches (memorize all three lengths)

Interviewers will ask you to explain your project at wildly different depths depending on time pressure. Have all three ready, not just one you improvise from.

**10-second version (if they just want a label):**
> "A training platform for competitive programmers on Codeforces — think of it as a personal trainer that generates practice problems and mock contests, then adapts to your skill level over time."

**60-second version (the default "walk me through your project" answer):**
> "CP-Dojo is a full-stack training tracker for competitive programmers who use Codeforces. The core idea: instead of randomly picking problems off the archive, you tell it a rating range and topics, and it generates a practice set for you — or a timed mock contest if you want to simulate real competition pressure. It tracks everything in Postgres via Supabase: what you've solved, your evolving skill rating computed with an Elo-style algorithm, which topics you're weak in, and problems you've bookmarked or still need to revisit. The most interesting technical piece is a small logistic regression model I built that learns each user's personal 'comfortable difficulty zone' from their real Codeforces submission history, and biases problem selection toward that zone during training — while contests stay pure uniform-random on purpose, since a contest is supposed to be a fair skill assessment, not a personalized one. Auth is custom-built, not OAuth — verification happens by having the user deliberately trigger a compile error on a specific Codeforces problem, which proves they own that handle without ever touching a password."

**5-minute version:** walk the interviewer through the architecture diagram layer by layer (Part B below), then pick ONE feature to go deep on — I'd recommend the adaptive difficulty algorithm (Session 5) since it's the most differentiated thing here and gives you a natural excuse to talk about a real debugging journey with genuine intellectual content, not just "I used a library."

---

## Part B — The Layered Architecture (the "why" behind every arrow)

Your actual dependency rule, verbatim from your own build discipline:

```
app (pages/routing)
  → components (UI only, call hooks only)
    → hooks ("use client", React state, calls services + utils)
      → services (async functions, no React, calls lib or CF API)
        → lib (client initializers only)
utils = pure functions, zero side effects, zero React
types = TypeScript shapes only, no logic
```

**Why this exists — the interview-ready justification, not just "it's organized":**

1. **Components never call services directly.** This forces every piece of business logic to live in exactly one testable place (a hook), rather than being scattered across whatever component happened to need it first. If two pages both need "generate a training set," the logic lives once in `useTraining`, not copy-pasted into two `page.tsx` files.

2. **Hooks never call the Codeforces API directly — always through services.** This is a seam for testability and for swapping implementations. If Codeforces changed their API shape tomorrow, you'd fix `lib/codeforces.ts` and `services/problem.service.ts` — zero hooks or components would need to change, because they only know "I get an array of `CodeforcesProblem[]` back," not how that array was produced.

3. **Utils are pure and cannot import services.** This is the rule you actually had to defend mid-build: when `predictSolveProbability`-style logic was needed by both a service (`adaptiveDifficulty.service.ts`, which does I/O — fetching Codeforces history) and a util (`getRandomProblems.ts`, which must stay pure), the scoring math got pulled *down* into `utils/logisticRegression.ts` rather than having the util reach *up* into the service layer. That's a real architectural decision with a real reason: a pure function with no side effects can be called from anywhere without dragging network calls along with it, and it's trivially unit-testable in isolation.

4. **`createClient()` is called fresh per request, never a module-level singleton.** This one is a genuine bug class you avoided on purpose: if you created one Supabase client at module load time and reused it across requests, in a serverless environment (Vercel functions) you risk one user's session/JWT leaking into another user's request if the module instance gets reused across invocations. Creating a fresh client per request means each request's cookie/JWT is read independently — no cross-contamination.

**How to draw this on a whiteboard in 30 seconds:** five stacked boxes, arrows pointing straight down, one arrow branching right at the bottom to "Supabase" and "Codeforces API." That's it. The interviewer will almost always ask "what happens if you skip a layer" — your answer is #1–3 above.

---

## Part C — Full Tech Stack, Choice by Choice

For each one: what it is, why *this* one, and the honest tradeoff (interviewers grade you on identifying the *cost* of your choice, not on picking the objectively "best" tool — there usually isn't one).

### Next.js 16, App Router
- **What:** A React meta-framework adding file-based routing, server rendering, and API routes on top of React.
- **Why here:** You need both a frontend (training/contest pages) and a backend (API routes for Codeforces verification, Gemini calls, RLS-bypassing user creation) in one deployable unit, without standing up a separate Express server.
- **Tradeoff, honestly:** App Router's Server/Client Component split adds real complexity — every file needs a conscious `"use client"` decision, and mixing them wrong produces confusing errors ("why is `window` undefined," "why can't I add `onClick` here"). Your project leans heavily client-side (`"use client"` on nearly everything, since Japanese-theme pages need `useState`/`useEffect`/cookies) which sacrifices some of Next.js's SSR/SEO advantage — a fair critique an interviewer might raise, and a fair one to concede: this app's dashboard-like, logged-in-only nature means SEO barely matters, but it *is* giving up some of what Next.js's App Router is actually for.

### TypeScript, strict, no `any`
- **Why:** Catches type mismatches at compile time. Concretely: `npm run build` caught a real bug before it reached Vercel — `getRandomProblems.ts` was building `SessionProblem` objects missing the required `status` field. That's not hypothetical; it's a documented incident.
- **Tradeoff:** Strict mode is slower to write initially (no shortcuts, no `any` escape hatch) — cost paid upfront, benefit collected at every future refactor.

### Bun (package manager)
- **Why:** Faster installs than npm/yarn via a different runtime/resolver architecture.
- **Tradeoff, honestly:** Ecosystem maturity is behind npm — some tooling assumes npm/yarn lockfiles specifically. (You actually hit a real-world version of this exact class of problem: a stray `package-lock.json` in your home directory confused Next.js's workspace-root detection during a build — a good live example if asked "any tooling gotchas you hit?")

### Tailwind CSS + inline styles (hybrid, not pure Tailwind)
- **This is a great tradeoff question to have a real answer for.** Your Japanese Dusk theme needs *exact* hex values (`#f5f0eb`, `#c0392b`, specific borders) and later needed to be swapped per-theme (light/dark) at runtime via a token object, not a fixed set of utility classes. Inline styles reading from a `tokens` object (`{ background: tokens.background }`) made **runtime theme-switching trivial** — swap one JS object, every color updates. Pure Tailwind utility classes are compile-time fixed strings; you'd need Tailwind's own dark-mode variant machinery (`dark:bg-...`) duplicated across every element instead of one central token swap.
- **Tradeoff:** you lose Tailwind's main selling point — no utility-class reuse, more verbose per-element style objects, no design-system-via-class-names. This was a deliberate call given the *specific* need (a fully re-themeable design system with a bilingual Japanese aesthetic), not a default.

### shadcn/ui (Radix primitives)
- **Why over a component library like MUI/Chakra:** shadcn isn't a dependency you `npm install` and import from `node_modules` — it's a CLI that copies component *source code* into your own `components/ui/` folder. You own and can edit every line.
- **Tradeoff:** you're responsible for keeping those components updated yourself; there's no `npm update` that pulls in shadcn's latest fixes automatically.

### SWR (data fetching)
- **What it does:** stale-while-revalidate — return cached data instantly, refetch in the background, update the UI when fresh data arrives.
- **Where it's used:** `cpdojo-all-problems` (deduped across `useTraining` and `useContest` — both call the same SWR key, so only one network request happens even though two different hooks "ask" for it), `cpdojo-solved-${handle}`.
- **Tradeoff / known gap you've already identified yourself:** `useTraining.ts` and `useContest.ts` independently fetch `allProblems` and `solvedProblems` — SWR's deduplication saves you from double-fetching *right now*, but the architecturally cleaner fix (a shared `useProblems` hook) is sitting in your own Technical Debt list. Good self-awareness to demonstrate if asked "what would you refactor first?"

### Supabase (Postgres) — not Firebase, not raw self-hosted Postgres
- **Why Postgres over a NoSQL choice:** your data is inherently relational — sessions have many session_problems, users have many sessions, bookmarks reference specific problems. Joins and referential integrity (foreign keys, cascade deletes) are first-class needs here, which is exactly relational databases' strength and exactly what you'd fight against in a document store.
- **Why Supabase over raw self-hosted Postgres:** you get RLS-enabled Postgres, an auto-generated REST layer (PostgREST), and instant hosted infra without provisioning a server yourself.
- **Why NOT Supabase Auth (the big one):** covered in full in Session 3 — short version: Supabase Auth wants email/password or OAuth; your actual identity proof is "you can trigger a specific compile error on Codeforces," which has zero relationship to any auth provider's model. Custom JWT-minting was the only way to get RLS *and* keep that identity model.

### Custom cookie-based auth (not OAuth, not sessions-in-DB)
- Deep dive is Session 3. For HLD purposes: know that this is the single most *distinctive* design decision in the whole project, and it's the one most likely to get "why not just use X" follow-ups (why not Auth0, why not NextAuth, why not Supabase Auth). Your honest answer: none of them model "prove you own a Codeforces handle" as a first-class login method, so building it yourself was the actual shortest path, not a NIH-syndrome choice.

### Vercel (deploy target)
- **Why:** Zero-config deploys for Next.js specifically (same company builds both), serverless functions for your API routes, free tier.
- **Tradeoff/real limitation you hit:** serverless functions are stateless and short-lived — no persistent server process holding connections open. This is *why* rate limiting needed an external store (Upstash Redis) rather than an in-memory counter: an in-memory counter would reset on every cold start and wouldn't be shared across concurrent function instances anyway. (This ties directly into Session 7's rate-limiting discussion.)

---

## Part D — End-to-End Data Flow: "Walk me through what happens when I click Generate"

This is one of the single most common interviewer requests — "trace a request through your system." Have this exact walkthrough ready, since it touches almost every layer:

1. **Browser:** user is on `/training`, has set a rating range, tags, and problem count. Clicks the "生成 · generate" button.
2. **Component → Hook:** `page.tsx` calls `generate()`, a function returned by the `useTraining` hook — the component itself contains zero logic about *how* problems get picked.
3. **Hook orchestrates, calls a util:** `useTraining.generate()` calls `getRandomProblems()` — a **pure function** — passing in: the full CF problem list (already cached client-side via SWR from `/api/problems`), the user's solved problems, the rating range, selected tags, and — if it exists — the user's `adaptiveModel` (built once per session, not refetched per click) plus their `platform_rating`.
4. **Pure filtering + optional ML scoring, inside the util:** `getRandomProblems` filters the CF problem pool down to the rating range and tags, excludes already-solved problems, then either (a) shuffles uniformly if no model exists, or (b) scores every remaining candidate with the logistic regression model, ranks them by predicted difficulty *within that specific filtered pool*, and does weighted sampling biased toward the harder end of that pool. **Contests never pass a model in, so this branch is never taken there — same function, byte-identical behavior for contests.**
5. **Hook persists the result:** back in the hook, `createSession()` (a service) inserts a new row into the `sessions` table (with `started_at = NULL`, marking it as a training set, not a contest) via `createClient()` — a fresh Supabase client for this request, which automatically attaches the user's JWT as a Bearer token, read from the `cpdojo-session` cookie.
6. **RLS enforcement, at the database:** Postgres's Row Level Security policy on the `sessions` table checks `auth.uid()` — extracted from that JWT's `sub` claim — against the row being inserted. If the JWT didn't belong to this user, the insert would simply fail at the database level, regardless of what the application code tried to do.
7. **Second write:** `saveSessionProblems()` inserts the picked problems into `session_problems`, each referencing the new `session_id` — protected by an RLS policy that has to check ownership via an `EXISTS` subquery against the parent `sessions` row, since `session_problems` has no direct `user_id` column of its own.
8. **State flows back up:** the hook calls `setProblems(...)`, React re-renders, the component displays the new problem list. No page reload, no full round-trip beyond the two writes.

**Why this answer is strong:** it demonstrates you understand the *boundary* between pure computation (step 4, testable with zero mocks) and side-effecting I/O (steps 5–7, needs a real database), and that security (RLS) is enforced at the data layer, not just trusted from the application layer — a detail many candidates miss entirely.

---

## Part E — Non-Functional Considerations (what would break, what's a single point of failure)

Be ready for "what would break first if this had 100,000 users" even in an HLD-focused round — it's a natural follow-up.

- **Codeforces API itself is the real bottleneck**, not your own infrastructure. It's a third-party public API with no SLA to you, rate limits you don't control, and no reliable way to know the *total* count of a user's submissions (their `user.status` endpoint returns recent history with no documented hard cap you can rely on — which is exactly why your codebase has a whole recurring bug pattern around accidentally re-introducing a `count=500` cap and losing historical data).
- **The `/api/problems` cache (`revalidate = 3600`)** is your main defense against every single visitor hitting Codeforces independently — without it, N concurrent users means N independent CF API calls for the exact same global problem list.
- **Single points of failure, honestly assessed:** Supabase (if it's down, nothing works — no local fallback); Codeforces (if it's down, verification and problem generation both fail — though existing logged-in users with cached data could still browse). Vercel's serverless model actually helps here for pure compute scaling (auto-scales function instances) but doesn't help at all for the two external dependencies above.
- **Known scaling gap you've already surfaced yourself:** the `/api/verify` route has zero rate limiting currently (flagged, not yet built) — meaning at scale, this is an open abuse vector (someone could hammer it with fake handles), and it's also the route most repeatedly hit by outbound-network failures in your own debugging history, worth mentioning as a "here's a known gap and here's my plan for it" answer rather than pretending it's solved.

---

## Question Bank

### Basic (fair game for a first technical screen)

**Q1. What does CP-Dojo do, in one sentence?**
> A training platform for competitive programmers that generates personalized practice problem sets and simulated timed contests for Codeforces users, tracking their progress and adapting difficulty over time.

**Q2. What's your tech stack and why did you pick it?**
Walk through Part C above — pick 3–4 of the choices, not all of them, unless asked to be exhaustive. Always pair the *why* with an honest *tradeoff* — that pairing is what separates a strong answer from a name-drop.

**Q3. Why Next.js instead of a plain React app with a separate backend?**
> One deployable unit gives me both frontend pages and API routes (for things that must run server-side, like the Gemini API key or the Supabase service_role key) without standing up and hosting a separate Express server.

**Q4. What's the difference between your `hooks`, `services`, and `utils` folders?**
> Hooks are React-aware — they hold state, call `useEffect`, and orchestrate a user flow. Services are async functions with zero React — they talk to Supabase or external APIs and return data. Utils are pure functions — same input always produces the same output, no network calls, no side effects, trivially testable.

**Q5. Where is your app deployed and how?**
> Vercel, connected directly to the `main` branch on GitHub — every push triggers an automatic rebuild and redeploy.

### Intermediate (expect these once you've explained the basics)

**Q6. Why did you split `lib`, `services`, `hooks`, and `components` into four separate layers instead of just writing the logic wherever it's needed?**
> Each layer has a single responsibility, which makes the codebase testable and swappable in isolation. If I need to unit test "does the difficulty algorithm pick harder problems correctly," I test the pure util directly with fake data — no database, no React, no network mocking required. If Codeforces changed their API, I'd only touch `lib` and `services`; every hook and component stays untouched because they only depend on the *shape* of the data coming back, not how it was fetched.

**Q7. Walk me through what happens end-to-end when a user clicks "Generate" on the training page.**
Use Part D verbatim — this is designed to be recited almost exactly as written.

**Q8. Your styling is a mix of Tailwind and inline styles — isn't that inconsistent? Why not pick one?**
> It's deliberate, not accidental — inline styles read from a shared token object specifically because the app needed *runtime* theme-switching (light/dark mode, added later), which a fixed set of compiled Tailwind utility classes doesn't give you for free without duplicating every element's classes with `dark:` variants. Tailwind still handles layout and structural utilities; only themed color/spacing values that need to swap at runtime go through the token object.

**Q9. Why is `createClient()` called fresh on every request instead of once at module load?**
> In a serverless environment, a module-level singleton risks being reused across different requests/users if the runtime reuses a warm function instance — you could end up with one user's session data leaking into another user's request. A fresh client per request means each one reads its own cookie/JWT independently, with no shared mutable state between requests.

**Q10. What's the single biggest single point of failure in this system?**
> Codeforces itself — it's a third-party API I don't control, with no guaranteed uptime SLA to me, and no reliable way to fetch a user's *complete* submission history since their API doesn't document a hard total-count cap. My own caching layer (the hourly-revalidated problems endpoint) protects against my own users overwhelming CF with duplicate requests, but doesn't protect against CF itself being slow or down.

### Advanced (this is where they're testing depth, not memorization)

**Q11. You said utils can't import services, but `getRandomProblems` needs the adaptive difficulty model, and building that model needs a network call to Codeforces. How do you reconcile "utils are pure" with "the util uses ML predictions that come from network data"?**
> The util itself never makes the network call — it receives an already-built model object (`{ weights, tagSolveRate }`) as a plain parameter and just does math on it: multiply, sigmoid, rank, sample. All the I/O — the actual Codeforces fetch, grouping submissions, training the logistic regression — lives in the service layer (`adaptiveDifficulty.service.ts`), which runs once per session in a hook's `useEffect`, and only the resulting plain-data weights get passed down into the pure scoring function. The util stays pure because "pure" means deterministic-given-its-inputs, not "never touches anything ML-related" — the model is just another input, same as the rating range is.

**Q12. Your architecture rule says hooks call services, but couldn't you just call Supabase directly from a hook and skip the service layer entirely — wouldn't that be less code?**
This is a real design tradeoff worth being honest about, not a trick with one right answer:
> It would genuinely be less code short-term. The cost you're trading away is testability and reuse — if two different hooks both need "fetch a user's bookmarks," without a service layer you'd either duplicate the Supabase query twice or have one hook import from another hook (which creates a tangled dependency graph). The service layer is a deliberate seam even though it does add an extra function call for what's sometimes a one-line query. For a solo project at this scale, you could reasonably argue the seam isn't earning its keep everywhere — but consistency across the codebase (every hook always calling a service, never mixing patterns) is itself worth something, since it means you never have to remember "wait, does *this* particular hook talk to Supabase directly or not."

**Q13. Explain a real example where your architecture's layering actually caught or prevented a bug, not just "kept things organized" in the abstract.**
> Two examples. First: because `platformRating` and `model` are passed as plain optional parameters into `getRandomProblems` rather than the util reaching into React context or a hook's closure to get them, it was trivial to guarantee contests are byte-for-byte unaffected — `useContest.ts` simply never passes those two arguments, and the function's own `if (model && platformRating !== undefined)` branch falls through to the exact same uniform-random code path it always used. No new code path could accidentally leak into contest generation, because there's no shared mutable state the two callers could accidentally diverge on. Second: keeping the CF-fetching logic entirely inside `services/adaptiveDifficulty.service.ts` meant that when a debug instrumentation snippet was mistakenly pasted into `getRandomProblems.ts` (the util) referencing variable names that only exist in the hook's scope, TypeScript caught it immediately as eight compile errors — because a pure util genuinely has no way to see hook-scoped variables. The architecture didn't just "organize" that mistake away, it made it a compile-time impossibility rather than a runtime bug.

**Q14. If you were rebuilding this from scratch for a team of five engineers instead of solo, what would you change architecturally?**
Good answer structure: identify what scales and what doesn't.
> The layered dependency rule (app→components→hooks→services→lib) scales fine to a team — it's a clear, teachable contract anyone can follow without tribal knowledge. What I'd change: right now, all page UI is fully inline inside `page.tsx` files rather than extracted into `components/training/`, `components/contest/`, etc. — that's fine solo since I hold the whole file in my head, but with five engineers touching the same 300-line page file, merge conflicts and review friction would get real fast. I'd also want a shared `useProblems` hook instead of `useTraining` and `useContest` each independently fetching the same CF problem list — SWR's deduplication papers over it today, but it's implicit rather than an explicit contract, which is fine for one person but risky for a team who might not know the dedup is happening at all.

**Q15. Your inline-styles-with-a-token-object approach for theming — how would this scale if the design system grew to 50 components instead of 5 pages?**
> It would start to strain. Right now, every themed value is spelled out per-element (`style={{ color: tokens.text }}`), which is fine at "a handful of pages," but at 50 components you'd want to extract shared styled primitives (a `<ThemedCard>`, a `<ThemedButton>`) so the token-reading logic lives in one place per component *type*, not repeated inline everywhere it's used. The token-object *approach* itself (a single JS object swapped at runtime) still scales — CSS-in-JS libraries use the exact same underlying idea — but the current "spell it out inline every time" implementation is the part that wouldn't.

---

## What to do before Session 2

Re-read Part D (the data-flow walkthrough) out loud once, timed — it should take you 60–90 seconds to say, not read. That single answer is reusable almost verbatim for "walk me through a feature," "explain your architecture," and "what happens when a user does X" — three different phrasings of the same underlying question that show up constantly.

**Next: Session 2 — Database Schema & Data Modeling.** We'll cover all five tables in depth, why `bookmarks` uses a composite primary key instead of a UUID, why `sessions` is one shared table for both training sets and contests, indexing decisions made under RLS, and a set of "write me the SQL query for X" prompts — since that's one of the single most commonly reported project-round asks (see the Meesho and Increff interview experiences I pulled for calibration: "he asked me to write all the tables used in this project and asked some SQL queries related to this").
