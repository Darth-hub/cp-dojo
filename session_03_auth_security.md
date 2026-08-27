# Session 3 — Authentication & Security Deep Dive
### CP-Dojo Interview Prep — Day 1, Session 3 of 4
### (Same slow, from-scratch style as Session 2 — lots of new vocabulary here, so we go one term at a time)

---

## Start here: what problem is "authentication" actually solving?

Before any Codeforces-specific stuff, get this one idea solid, because everything else in this session is just one specific answer to it:

**The problem:** anyone can type any username into a text box. If CP-Dojo just asked "what's your Codeforces handle?" and believed whatever was typed, nothing would stop you from typing in *my* handle and seeing *my* data, or pretending to be me. Authentication is the general name for "how does a system prove that the person claiming to be a specific account actually is that account, and not just someone who typed the name."

The usual answer everywhere else is a **password** — something only the real account owner is supposed to know. CP-Dojo has a problem: **Codeforces doesn't let third-party apps check anyone's password.** There's no official way to say "hey Codeforces, is this the correct password for this handle?" So password-based login was never even an option here. CP-Dojo had to invent a different way to prove ownership — and that's the compile-error trick.

---

## Step 1 — Proving you own a Codeforces handle, without a password

**The idea, in one sentence:** instead of proving you *know a secret*, you prove you *can currently take an action* on that account — specifically, submitting code to a specific problem.

Here's the exact mechanic, walked through slowly:

1. CP-Dojo shows the user one specific, deliberately obscure problem: **Codeforces contest 2150, problem G.**
2. The user is told: go to that exact problem on the real Codeforces website, logged in as themselves, and submit **any code that fails to compile** — literally broken code, on purpose. Codeforces will record this submission and label it with a verdict called `COMPILATION_ERROR`.
3. CP-Dojo then calls Codeforces's own public API — a set of URLs anyone can query to ask "what are this handle's recent submissions?" — and looks through the response for one very specific thing: *did this handle submit something to contest 2150, problem G, and did it get marked `COMPILATION_ERROR`?*
4. If yes — verified. If no — not verified, try again.

**Why this actually proves ownership, explained with an analogy:** imagine the only way to prove you have the key to a specific mailbox is to put a weirdly-shaped object inside it, then have someone check the mailbox from outside. You don't need to reveal your key or your password to anyone — the *act* of successfully putting something into that specific mailbox is itself the proof, because only someone with real access could have done it. Submitting code under a CF handle requires actually being logged into that handle on Codeforces's own website — CP-Dojo never sees or touches a password, it just checks afterward, using Codeforces's own public records, "did this specific handle just do this specific unusual thing."

**Why problem 2150G specifically, and why "must fail to compile"?** Two deliberate choices, both defending against the same risk — someone accidentally looking "verified" by pure coincidence:
- It's a genuinely hard, obscure problem, so it's extremely unlikely that some random person casually attempted it *and* coincidentally got a compile error on it recently, for unrelated reasons of their own.
- Asking for a *compile error* specifically (not "any submission") means the user doesn't need to actually solve anything difficult — they just need to submit garbage code on purpose — but it still has to be a real, deliberate action tied to that one obscure problem, which nobody would stumble into by accident.

This whole mechanism has a name worth knowing for the interview: it's called **out-of-band verification** — proving something through a side-channel action (a real submission on the real Codeforces site) rather than through a direct handshake between the two systems.

---

## Step 2 — Remembering that you logged in: what a cookie is

Once verified, CP-Dojo needs to remember "this browser belongs to this now-verified user" for future visits, without asking you to prove the compile-error trick on every single page load.

**What a cookie is, in plain words:** a tiny piece of text that a website asks your browser to hold onto, which your browser then automatically attaches to every future request it sends back to that same website — without you doing anything. Think of it like a wristband handed to you at the entrance of an event: you don't have to show your ticket again at every single door inside, the staff just glance at the wristband.

CP-Dojo sets a cookie called `cpdojo-handle`, storing the verified Codeforces handle, set to last **30 days**. Every time you come back within that window, the browser automatically sends that cookie along, and CP-Dojo reads it to know who you are — no need to redo the compile-error trick each visit.

That's the *simple* part of the story, and by itself, it would be enough for a basic "remember who's logged in" system. But CP-Dojo needs something stronger than that, because of the database's own security feature — which is where the harder half of this session begins.

---

## Step 3 — Why a cookie alone isn't enough: introducing Row Level Security (RLS)

**The problem RLS solves, explained from scratch:** imagine your application's code is generally trustworthy — it only ever asks the database for "give me *this* user's sessions," never anyone else's. But what if there's a bug somewhere in that code? Or what if someone finds a way to send a raw request straight to the database, skipping your application code entirely? If the *only* thing standing between "give me anyone's data" and "give me only my own data" is your application's own carefully-written logic, then one mistake anywhere in that logic is a total data leak.

**Row Level Security is a feature built directly into Postgres (the actual database) that adds a second, independent layer of protection — enforced by the database itself, not by your application code.** Even if your application code has a bug, or someone bypasses it entirely and queries the database directly, Postgres itself will refuse to hand back rows that don't belong to whoever is asking.

**The analogy:** think of a bank with a wall of safety deposit boxes. The bank clerk (your application code) is supposed to only ever open *your* box for you. RLS is like the vault door itself also independently checking your ID before it will physically let any box open at all — even if the clerk somehow got confused and tried to open the wrong box, the vault door itself refuses, because the check happens at the door, not just at the clerk's judgment.

**So how does Postgres know *who* is asking?** This is the genuinely tricky part, and it's the reason the rest of this session exists.

---

## Step 4 — The problem: RLS needs to know "who," but CP-Dojo has no traditional login system

Postgres's RLS feature has a built-in function called `auth.uid()` — whenever a query runs, this function is supposed to return "the ID of whoever is making this request right now." RLS rules are written in terms of this function — a rule might say, in plain English, "only allow reading a row from the `sessions` table if `sessions.user_id` matches whatever `auth.uid()` returns."

**Here's the catch:** `auth.uid()` normally only works if you're using Supabase's own built-in login system (called Supabase Auth) — email/password, Google login, that kind of thing. CP-Dojo uses *none* of that; identity is proven entirely through the Codeforces compile-error trick, which has nothing to do with Supabase's login system at all. Without Supabase Auth, `auth.uid()` would just always return "nobody" — meaning every single RLS rule would fail for everyone, and nobody could read or write anything.

**So the real problem is:** how do you get `auth.uid()` to correctly say "this is user X" when your actual login system is something completely custom that Supabase has never heard of?

---

## Step 5 — The solution: a signed ID card, called a JWT

**What a JWT is, explained from absolute zero:** JWT stands for "JSON Web Token." Forget the acronym — think of it as **a signed ID card**. It's a piece of text containing a claim like "this represents user X," but with one crucial extra property: it's been **cryptographically signed** by whoever issued it, using a secret key that only the issuer has.

**Why the signing matters, with an analogy:** imagine a letter sealed with a wax stamp, where the stamp's exact pattern is a secret only one authority possesses. Anyone can *read* the letter's contents. But nobody can *forge* a new letter with that same seal, because they don't have the actual stamp — and if anyone tries to tamper with even one word of an existing letter, the seal breaks and becomes visibly invalid the moment someone checks it. A JWT works the same way: it plainly contains the claim "this is user X" in readable text, but it also carries a cryptographic signature that only the real server could have produced, using a secret key stored only on the server, never shared with anyone. If a user tried to edit their own JWT to claim to be a different user, the signature would no longer match, and the server would immediately reject it as tampered.

**Critically — Supabase doesn't require that a JWT was created *by* Supabase's own login system.** As long as a JWT is properly signed using the project's own secret key, and shaped the way Supabase expects, Postgres's `auth.uid()` will read it correctly, no matter who or what actually created it.

**So the plan becomes:** after the Codeforces compile-error trick succeeds, CP-Dojo's own server mints (creates and signs) its own JWT, shaped exactly the way Supabase expects — containing a field called `sub` (short for "subject," meaning "whose ID this represents") set to the user's UUID, plus a couple of other required fields (`role: authenticated`, `aud: authenticated`, which just mean "this is a normal logged-in user," in Supabase's expected vocabulary). This JWT gets stored in a second cookie, `cpdojo-session`, and from then on, it's attached to every request CP-Dojo makes to the database — and Postgres's `auth.uid()` correctly reads the `sub` field out of it.

**One important thing to say plainly in an interview: this JWT is not a login credential.** The actual proof of identity already happened back in Step 1 — the compile-error trick. This JWT is purely a "session pass" used *afterward*, only so the database itself has a reliable, tamper-proof way to know who's asking for what. The correct word for this whole setup, and the exact word your own project notes use, is **"passwordless," not "tokenless."** There's still a token involved (the JWT) — there's just never a password anywhere in the system.

---

## Step 6 — The chicken-and-egg problem, and how it got solved

Here's a genuinely tricky wrinkle, worth understanding carefully because it's exactly the kind of thing a sharp interviewer will probe.

**The problem:** to mint a JWT for "user X," you need user X's UUID to already exist as a row in the `users` table. But the *very first time* someone verifies with CP-Dojo, their row doesn't exist yet — it needs to be *created*. And creating that very first row is itself a database write... which, if RLS is turned on, would need a valid JWT to be allowed at all. **But you can't have a valid JWT yet, because the user it would represent doesn't exist yet.** It's a loop with no valid starting point.

**The analogy:** imagine a building where every door requires a valid ID badge to open — including the door to the room where ID badges are printed. If you don't have a badge yet, you can never even reach the badge-printing room to get one.

**The fix: a special master key that skips the individual-door checks entirely, used only for this one specific moment.** Supabase provides something called a **`service_role` key** — a much more powerful credential than the normal one the app uses everywhere else. Any request made using this key **completely bypasses RLS** — it can read or write any row in any table, no ownership check at all. This key is only ever used, in this whole project, in exactly one place: the server-side code that creates a brand-new user's very first row. It runs on the server, is never sent to the browser, and is never used for any other kind of request afterward.

So the actual real order of operations is:
1. Codeforces compile-error trick succeeds.
2. Using the `service_role` key (bypassing RLS entirely, on purpose, for this one moment), the server creates the new row in `users`.
3. *Now* that user's UUID genuinely exists.
4. The server mints a JWT containing that UUID.
5. From this point onward, every future request uses that normal JWT — never the `service_role` key again.

**Why this is safe, despite sounding scary ("bypasses all security"):** because the `service_role` key never leaves the server, and the *only* thing that code path is allowed to do is the one specific user-creation operation — it's not a general-purpose backdoor left lying around, it's a narrowly-scoped, server-only exception used for exactly one moment where no other option exists.

---

## Putting the whole thing together — the six steps as one story

Look back at the diagram at the top of this session — this is now the complete story, in order:

1. User submits deliberately broken code on the real Codeforces website, on problem 2150G.
2. CP-Dojo's server checks Codeforces's public records for that exact submission.
3. If found: using the powerful `service_role` key (which bypasses RLS on purpose, just this once), the server creates the user's row in the database.
4. The server then mints a signed JWT, containing that user's ID, using a secret key only the server knows.
5. That JWT gets stored in a cookie in the browser, alongside the simpler "which handle is this" cookie.
6. From then on, every request to the database carries that JWT. Postgres reads the ID out of it via `auth.uid()`, and every table's Row Level Security rule checks that ID against the row being requested — completely independent of whether the application code above it made any mistakes.

---

## Honest security tradeoffs (say these unprompted — it shows maturity, not weakness)

- **The JWT lasts 30 days with no rotation or refresh mechanism.** This is the same tradeoff every long-lived "remember me" cookie makes: convenient (you don't have to re-verify constantly), but it means if that cookie were ever stolen (say, through a different kind of attack that steals cookies from a browser), it would remain usable for the full 30 days.
- **The `service_role` key is the single most sensitive secret in this whole project.** If it ever leaked — say, by accidentally being used in a file that runs in the browser instead of only on the server — literally all RLS protection on every table would become meaningless for whoever holds that key. This is exactly why the project rule is explicit and absolute: this key is used in exactly one server-only file, and must never appear in any `"use client"` file or reach the browser in any way.
- **There is currently no rate limiting on the verification endpoint** (`/api/verify`) — nothing stops someone from hammering it with requests. This is a known, acknowledged gap, not a secret one (covered properly in Session 7, since the fix involves a rate-limiting algorithm, which is its own topic).
- **Changing your Codeforces handle breaks continuity**, tying back to Session 2's UUID discussion — since identity is rooted in the handle-verification step, and the UUID has no independent way to recognize "this is the same person under a new name," a handle change means starting over as a brand-new account.

---

## Question Bank

### Basic

**Q1. How does CP-Dojo know a user actually owns the Codeforces handle they typed in, without a password?**
> By having them submit deliberately broken code (a compile error) to one specific problem on the real Codeforces website, then checking Codeforces's own public API afterward to confirm that exact submission happened. Only someone with real access to that account could produce it.

**Q2. What is a cookie, and what does CP-Dojo use one for?**
> A small piece of data a website asks the browser to store and automatically resend on every future visit. CP-Dojo uses one to remember a verified handle for 30 days, so the user doesn't have to re-verify on every visit.

**Q3. What does "passwordless" mean here, and why is that the right word instead of "tokenless"?**
> There's genuinely no password anywhere in this system — but there is still a token (a JWT) involved, used after identity is already proven, purely to let the database recognize the logged-in user on future requests. "Passwordless" describes the missing password; "tokenless" would be inaccurate, since a token is very much still part of the design.

### Intermediate

**Q4. What is Row Level Security, and why isn't "just writing careful application code" enough on its own?**
> RLS is a Postgres feature that enforces per-row ownership checks at the database level itself, independent of application code. Careful application code can still have bugs, or someone could find a way to query the database directly, bypassing the application entirely. RLS means even in either of those situations, the database itself still refuses to return rows that don't belong to whoever is asking — it's a second, independent layer of defense, not a replacement for careful application code, but a backstop underneath it.

**Q5. Why can't CP-Dojo just use Supabase's own built-in login system instead of building all this custom JWT machinery?**
> Because Supabase Auth's login system is built around email/password or third-party sign-in providers like Google — none of which match "prove you own a specific Codeforces handle by triggering a compile error on a specific problem." That verification method has nothing to do with any login provider Supabase understands. To still get RLS's protection, a JWT shaped the way Supabase expects had to be minted manually, after this custom verification step succeeded, rather than relying on Supabase's login system to produce one automatically.

**Q6. Explain the chicken-and-egg problem with creating a brand-new user under RLS, and how it was solved.**
> Minting a JWT requires the user's UUID to already exist, but that UUID doesn't exist until the very first row is created — and creating that row is itself a database write, which normally would need a valid JWT if RLS is on. There's no valid JWT to have yet, since the user it would represent doesn't exist. Solved by using Supabase's `service_role` key for that one specific operation — a privileged key that completely bypasses RLS — to create the user's row, and only afterward minting the real JWT for that now-existing user.

### Advanced

**Q7. The `service_role` key completely bypasses Row Level Security. Doesn't that mean your "secure" system has one giant hole in it? Defend this design.**
> It's a real, sharp-edged tool, and I don't pretend otherwise — but the risk is contained by scope, not by hoping nothing goes wrong. That key exists in exactly one place in the entire codebase: the server-side route that creates a brand-new user's very first row. It never runs in the browser, never gets sent to any client, and is never invoked for any other kind of request — not for reading sessions, not for reading bookmarks, nothing else. The actual risk isn't "this key exists," it's "this key leaking to somewhere it shouldn't be" — and the mitigation for that is discipline about where server-only secrets are allowed to live, which is exactly why the project rule about it is explicit and absolute rather than assumed.

**Q8. Your JWT is signed with a shared secret (HS256), not the newer asymmetric key approach Supabase now defaults to. What's the actual difference, and why does it matter here?**
> With a shared-secret (symmetric) approach, the exact same secret key is used both to *sign* a new JWT and to *verify* an existing one — so anything holding that secret can do both. With an asymmetric approach, there's a private key (kept secret, used only to sign) and a separate public key (which can be shared freely, used only to verify) — meaning something that only needs to *check* a token's validity never needs access to the actual signing secret at all. The shared-secret approach is simpler to set up, which is exactly why it was used here, but it does mean the one JWT secret this project holds is doing double duty — anyone with that secret could theoretically both verify tokens *and* forge new, fully valid ones. Supabase's own newer default has moved toward the asymmetric approach specifically to avoid that double-duty risk, but the older "Legacy JWT Secret" tab is still fully supported and was the simpler, correct choice for a project at this scale.

**Q9. Walk me through exactly what would happen, step by step, if I stole someone's `cpdojo-session` cookie right now. What could I do, and what couldn't I do?**
> You'd have a valid, correctly-signed JWT for that user, so any request you made using it would pass RLS checks as if you were that user — meaning you could read and write their sessions, bookmarks, and rating history for up to 30 days, or until they happen to log out and get issued a new one. What you couldn't do: you couldn't use it to impersonate a *different* user, since the JWT's `sub` field is fixed to one specific UUID and the signature would break if you tried to alter it. You also couldn't use it to bypass RLS entirely the way the `service_role` key can — you'd still be bound by that one user's own row-level permissions, not given god-mode over every user's data.

**Q10. If you were told to add support for a second identity provider — say, letting users also log in via GitHub — how would that change this design, and what would stay the same?**
> The RLS and JWT-minting machinery would stay exactly the same, because it was never built around "how did we prove identity" in the first place — it just needs *some* verified user UUID to mint a JWT for. What would change is only the verification step itself: instead of (or in addition to) the compile-error trick, there'd be a second code path that verifies a GitHub login and resolves it to the same kind of user row. The chicken-and-egg fix (creating the user via `service_role`, then minting the JWT) is identical either way — the interesting design insight here is that the identity-proving step and the "how does the database know who you are afterward" step are two genuinely separate concerns, and this project's architecture already keeps them cleanly separated.

---

## What to do before Session 4

Walk through the six-step diagram from memory, out loud, without looking — in particular, make sure you can explain *why* the `service_role` step has to come before the JWT-minting step, not after, since that ordering is the single detail most likely to get a confused follow-up question if you get it backward.

**Next: Session 4 — Backend, APIs & External Integration.** We'll cover how Next.js API routes work, the actual shape of the Codeforces API and its quirks (the recurring "forgot to remove the count limit" bug class, the lack of a documented total-submission cap), how the Gemini AI analysis integration works end-to-end including the real debugging journey it took to get working, and the caching strategy behind the shared problems endpoint.
