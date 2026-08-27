# Session 2 — Database Schema & Data Modeling
### CP-Dojo Interview Prep — Day 1, Session 2 of 4
### (Written slower and simpler, as requested — explaining as if you're new to this project)

---

## Before anything else: what even IS a "database schema"?

Skip this section if you're already comfortable with tables/rows/keys. If not, read it — everything else in this session depends on it.

Imagine a database as a set of **Excel sheets**. Each sheet is called a **table**. Each row in the sheet is one single "thing" — one user, one problem, one bookmark. Each column is one piece of information about that thing — a name, a date, a number.

So when someone says "the `users` table," they just mean: *the spreadsheet where every row is one person who has an account on CP-Dojo.*

A few words you'll see constantly, defined once here so nothing later feels unfamiliar:

- **Primary Key (PK):** every row needs some value that uniquely identifies *that one row* and no other row, ever. Like a roll number in a class — no two students share one. In a table of users, the primary key is how the database tells "this specific user" apart from every other user.
- **Foreign Key (FK):** a column in one table that points *at* a row in another table, by storing that row's primary key. Example: if a `sessions` table has a column called `user_id`, that column is just storing "which user does this session belong to" — it holds the *primary key value* of one specific row in the `users` table. This is literally how two separate spreadsheets get "linked" to each other.
- **Relationship:** once you have foreign keys, you can describe how tables connect — "one user can have *many* sessions" is a relationship. This is the exact thing the diagram above is drawing: the lines between the five boxes are foreign key relationships.

That's genuinely the whole toolkit. Everything below is just "which spreadsheets does CP-Dojo need, what columns does each one have, and why."

---

## The big picture first — five spreadsheets, described in plain English, zero SQL

Before looking at a single column name, understand *why* these five tables exist at all — what real-world thing is each one keeping track of?

1. **`users`** — one row per person who has logged into CP-Dojo. Stores who they are on Codeforces and their current skill rating on this platform.
2. **`sessions`** — one row per "problem set" a user generated. This is the clever one: the *same* table is used whether that problem set was a casual practice session or a timed mock contest — more on this below.
3. **`session_problems`** — one row per *individual problem* inside one of those sessions. If a session has 4 problems, there are 4 rows here, all pointing back at that one session.
4. **`bookmarks`** — one row per problem a user has starred to look at again later.
5. **`rating_history`** — one row every time a user's skill rating changes, so there's a full timeline, not just "their rating right now."

Notice the pattern already forming: `users` is the "root" — everything else exists *because of* a user, and points back to one.

---

## Table 1 — `users`: "who is this person, and how good are they right now?"

```sql
users(
  id uuid PK DEFAULT gen_random_uuid(),
  cf_handle text UNIQUE,
  cf_rating int,
  avatar_url text,
  platform_rating int DEFAULT 1200,
  created_at timestamptz
)
```

Column by column, in plain words:

- **`id`** — the primary key. A randomly generated unique code (called a **UUID**, explained more below), assigned automatically the moment the row is created.
- **`cf_handle`** — the person's actual Codeforces username, e.g. `Darth_2`. Marked `UNIQUE`, meaning the database itself refuses to let two rows have the same handle — a safety net against accidental duplicate accounts.
- **`cf_rating`** — their *real* skill rating on Codeforces itself (a number CF assigns based on their actual contest history there).
- **`platform_rating`** — a *separate* number, specific to CP-Dojo, that starts at 1200 by default and moves up or down based on how the user performs in CP-Dojo's own mock contests. This is intentionally a different number from `cf_rating` — one is "how good you are on Codeforces overall," the other is "how good this app currently thinks you are, based only on what you've done inside this app."
- **`created_at`** — a timestamp of when the account was made.

**The one tricky decision here, explained simply: why is the primary key a random UUID instead of just using the Codeforces handle itself as the ID?**

Think of it like this: a Codeforces handle is like a nickname — people are *allowed* to change it. If CP-Dojo used the handle itself as the permanent ID for a user, and that person later changed their Codeforces username, every single row in every other table that pointed to "that user" would now be pointing at a nickname that no longer exists — total chaos. A UUID is like a permanent locker number instead of a name tag: it never changes, even if the person's nickname does. The tradeoff, and it's a real one, worth saying honestly in an interview: if someone *does* change their CF handle, CP-Dojo has no way to recognize "hey, this is the same person as before" — they'd just show up as a brand new user with a fresh UUID, starting over at rating 1200. That's an accepted, deliberate tradeoff, not an oversight.

---

## Table 2 — `sessions`: "one problem set, whether it's practice or a real contest"

```sql
sessions(
  id uuid PK,
  user_id uuid REFERENCES users CASCADE,
  started_at bigint NULLABLE,
  ended_at bigint,
  duration_minutes int,
  problem_count int,
  performance int,
  is_completed bool DEFAULT false,
  tags text[],
  created_at timestamptz
)
```

Plain-English walk-through:

- **`user_id`** — the foreign key. This is the column that says "this session belongs to *this* user." It's how a session and a user get linked.
- **`started_at`** — the exact moment (as a raw number of milliseconds, not a fancy date type) that a *timed contest* began.
- **`ended_at`**, **`duration_minutes`**, **`performance`** — details that only make sense for a contest: when it ended, how long it was, and what skill-rating "performance" the user achieved in it (explained fully in Session 5).
- **`is_completed`** — whether this session has been finished/marked done.
- **`tags`** — which topics (like "dynamic programming" or "graphs") this session's problems were chosen from.

**The clever decision here, in plain words: one single table does double duty for two very different things — a relaxed practice set and a timed contest.**

Here's the trick: look at `started_at`. If it's empty (in database terms, `NULL` — meaning "no value was ever put here"), that *itself* is treated as the signal "this is just a casual training set, it was never started as a timer-based contest." If `started_at` *does* have a real value in it, that means "this is a contest, and it actually began running at this exact moment."

Think of it like a light switch that's also a dimmer: instead of building two entirely separate spreadsheets — one for "training sets" and a near-identical duplicate one for "contests" — a single column's *presence or absence* of a value acts as the switch that decides which "mode" a given row represents. It's an efficient trick, but it's also something you should be ready to defend, because "using NULL as a meaningful signal" is a design choice some interviewers will push back on (see the Advanced questions below for exactly how to defend it).

---

## Table 3 — `session_problems`: "each individual problem inside one of those sets"

```sql
session_problems(
  id uuid PK,
  session_id uuid REFERENCES sessions CASCADE,
  contest_id int,
  index text,
  name text,
  rating int,
  tags text[],
  url text,
  solved_time bigint,
  status text DEFAULT 'none',
  bookmarked bool DEFAULT false,
  upsolved bool DEFAULT false
)
```

- **`session_id`** — the foreign key pointing back at which session (which problem set) this individual problem belongs to.
- **`contest_id` + `index`** — together, these two columns identify *which exact problem on Codeforces* this is. On Codeforces, every problem is identified by a contest number plus a letter (like contest `2150`, problem `G`) — CP-Dojo just stores that same pair.
- **`status`** — one of four plain-English states: `"none"` (haven't touched it), `"solved"`, `"wrong"` (attempted, got it wrong), `"testing"` (Codeforces is still judging a just-submitted solution). This column was actually added to the table *after* the table already existed (using a command called `ALTER TABLE`, which lets you add a new column to a spreadsheet that already has data in it) — a small but real detail worth knowing, since it shows the schema evolved over time rather than being perfectly planned from day one.
- **`bookmarked`**, **`upsolved`** — simple true/false flags: has this specific problem been starred, and has the user gone back and solved it after missing it originally.

**The tricky decision here, explained plainly: notice there is NO `user_id` column on this table at all. So how does the database know which user owns a given problem row?**

Think of it like a chain: `session_problems` points at `sessions` (via `session_id`), and `sessions` points at `users` (via `user_id`). So to figure out "which user owns this problem," you have to walk the chain: look up which session it belongs to, then look up which user *that* session belongs to. It's like asking "whose phone is this?" when the phone doesn't have a name on it, but it's sitting inside a specific labeled bag, and that bag belongs to a specific person — you trace ownership through the bag, not directly off the phone. This is intentional: a problem's identity genuinely only makes sense in the context of "which session was it generated as part of" — it isn't independently "owned" by a user in its own right.

**Cascade delete — one more small but important detail on this table:** the `session_id` column says `REFERENCES sessions CASCADE`. In plain words: if a session gets deleted, every single problem row that belonged to it gets automatically deleted too, without needing separate cleanup code. Think of a folder and the files inside it — delete the folder, and everything inside disappears with it. Without this, deleting a session would leave a pile of "orphaned" problem rows in the database, pointing at a session that no longer exists — a real category of bug in systems that forget to set this up.

---

## Table 4 — `bookmarks`: "problems the user starred, kept as its own permanent list"

```sql
bookmarks(
  user_id uuid REFERENCES users CASCADE,
  contest_id int,
  index text,
  name text,
  rating int,
  tags text[],
  url text,
  created_at timestamptz,
  PRIMARY KEY(user_id, contest_id, index)
)
```

Here's the interesting part: **look closely — there's no `id` column at all in this table.** Every other table has a single UUID as its primary key. This one instead says `PRIMARY KEY(user_id, contest_id, index)` — meaning the *combination* of those three columns together is what uniquely identifies a row, not any single column on its own.

**Why, explained with an everyday analogy:** think about how you'd uniquely identify "a specific seat in a specific cinema hall on a specific date." You wouldn't invent a brand new random ticket number for that — you'd just say "Hall 3, Row F, Seat 12." The combination of those three simple facts already uniquely pins down exactly one thing; adding a fourth, made-up ID number would just be redundant. Same logic here: "this exact user bookmarking this exact Codeforces problem" is already a unique fact the moment you know all three pieces — which user, which contest, which problem letter. There's no need to invent an extra artificial ID column just for the sake of having one.

This is called a **composite primary key** (composite = "made of multiple parts").

**A second nice side-effect of this design:** it makes "un-bookmarking" trivially simple. To remove a bookmark, you don't need to first look up "what's the ID of this bookmark row" — you already know the three facts that identify it (which user, which contest, which problem), so you can delete it directly using those.

---

## Table 5 — `rating_history`: "a timeline, not just a single number"

```sql
rating_history(
  id uuid PK,
  user_id uuid REFERENCES users CASCADE,
  platform_rating int,
  recorded_at timestamptz
)
```

This is the simplest table, but the reasoning behind *why it exists at all* is worth understanding clearly.

Remember from Table 1: `users.platform_rating` stores the person's *current* rating — one single number, right now, today. But CP-Dojo also wants to show a **rating graph over time** on the statistics page — a line going up and down across many contests. A single number can never draw a graph; a graph needs *many points across time*.

**The analogy:** imagine tracking your weight. Your bathroom scale shows you one number: your weight *today*. But if you want to see a graph of your weight over the last six months, one number isn't enough — you need to have written down your weight every single day and kept all of those old readings. `users.platform_rating` is "today's reading on the scale." `rating_history` is "the notebook where every past reading was written down, never erased." Every time a contest finishes and the rating changes, a brand new row gets added here — the old rows are never touched or deleted, so the full history stays intact.

---

## Putting it all together — the relationships, explained as a sentence each

Look back at the diagram at the top of this session while reading these:

- **One user can have many sessions.** (One person can generate many practice sets or contests over time.)
- **One session can have many session_problems.** (One problem set contains several individual problems.)
- **One user can have many bookmarks.** (One person can star many problems.)
- **One user can have many rating_history entries.** (One person's rating gets logged again and again over time.)

Notice the shape: everything fans *out* from `users`. Nothing points backward into `session_problems` from anywhere except `sessions`. This "one thing has many of another thing" shape is called a **one-to-many relationship**, and it's the single most common relationship shape in relational databases — almost every real system you'll ever work on will have dozens of these.

---

## How to say all of this out loud, in one breath, if an interviewer says "walk me through your schema"

Practice saying this exact flow, filling in detail only if they ask:

> "There are five tables. `users` is the root — one row per Codeforces account that's logged in, storing their handle and their in-app skill rating. `sessions` represents one generated problem set, and it does double duty for both practice sets and timed contests — a null `started_at` means it's just practice, a real value means a contest is running. `session_problems` holds the individual problems inside a session, linked back by `session_id`, and it cascades — delete a session, its problems go with it. `bookmarks` is a bit different — instead of its own ID, the primary key is the combination of user, contest, and problem index, since that combination is already unique on its own. And `rating_history` exists purely to let the statistics page draw a graph over time, since the `users` table only ever stores the current rating, not the journey to get there."

That's the whole schema in about 45 seconds, and it demonstrates you understand *why*, not just *what*.

---

## SQL queries you should be able to write live on the spot

This is one of the single most commonly reported real interview moments for project rounds — being asked to write actual SQL, on paper or in an editor, about your own project's tables. Practice writing these from memory, not just reading them:

**1. Get every problem in a specific session:**
```sql
SELECT * FROM session_problems
WHERE session_id = 'the-session-uuid-here';
```

**2. Get a user's full rating history, oldest to newest, for the graph:**
```sql
SELECT platform_rating, recorded_at
FROM rating_history
WHERE user_id = 'the-user-uuid-here'
ORDER BY recorded_at ASC;
```

**3. Find every problem a user solved, across every session they've ever done (a join across two tables):**
```sql
SELECT sp.name, sp.rating, sp.tags
FROM session_problems sp
JOIN sessions s ON sp.session_id = s.id
WHERE s.user_id = 'the-user-uuid-here'
  AND sp.status = 'solved';
```
*(This is the query that demonstrates the "chain of ownership" idea from Table 3 above — you can't filter `session_problems` by user directly, so you join through `sessions` to get there.)*

**4. Count how many contests (not training sets) a user has completed:**
```sql
SELECT COUNT(*) FROM sessions
WHERE user_id = 'the-user-uuid-here'
  AND started_at IS NOT NULL
  AND is_completed = true;
```
*(Notice `started_at IS NOT NULL` — this is the exact "which mode is this row in" trick from Table 2, used directly in a real query.)*

**5. Delete a bookmark (demonstrating the composite key in action):**
```sql
DELETE FROM bookmarks
WHERE user_id = 'the-user-uuid-here'
  AND contest_id = 2150
  AND index = 'G';
```

---

## Question Bank

### Basic

**Q1. How many tables does your database have, and what's each one for, in one line?**
> Five: `users` (accounts), `sessions` (a generated problem set — training or contest), `session_problems` (individual problems inside a session), `bookmarks` (starred problems), and `rating_history` (a timeline of rating changes).

**Q2. What is a primary key, and what is CP-Dojo's user table using as one?**
> A primary key is the column (or columns) that uniquely identifies one row. `users` uses a randomly generated UUID, not the Codeforces handle itself.

**Q3. What is a foreign key, with an example from your project?**
> A column that stores another table's primary key, to link two rows together. `sessions.user_id` is a foreign key — it stores the `id` of the row in `users` that this session belongs to.

**Q4. What does `CASCADE` mean on `session_problems.session_id`?**
> If the parent session is deleted, every problem row belonging to it gets automatically deleted too — no manual cleanup needed.

### Intermediate

**Q5. Why is `platform_rating` stored on the `users` table AND tracked separately in `rating_history` — isn't that duplicated data?**
> It's not true duplication — they serve different purposes. `users.platform_rating` is a fast way to read "what is this person's rating *right now*" without scanning a history table. `rating_history` exists purely to reconstruct the *timeline* for a graph. If I only had `rating_history`, every single page load that needs "current rating" would have to run a query like "give me the most recent row for this user" instead of a simple direct lookup — slower for the single most common read.

**Q6. Explain the `started_at` NULL trick in your own words, and tell me one real downside of doing it this way.**
> A session with `started_at = NULL` is a training set; a real value means it's a contest that's begun. The downside: this makes "which mode is this row" implicit rather than explicit — any query that needs to distinguish training from contests has to remember to check `started_at IS NULL` specifically. It would arguably be clearer to have an explicit `session_type` column with values like `'training'` or `'contest'` — that reads as self-documenting to anyone looking at the table later, instead of requiring you to already know the NULL convention.

**Q7. Why does `bookmarks` use a composite primary key instead of just giving it a UUID like every other table?**
> Because the combination of `user_id`, `contest_id`, and `index` is already guaranteed unique — a single user can't bookmark the exact same problem twice, so those three columns together already do the job a separate ID column would do. Adding a UUID on top would just be an extra column with no real purpose.

### Advanced

**Q8. Walk me through what actually happens at the database level, step by step, when I delete one `sessions` row — which other rows get affected, and why?**
> Every row in `session_problems` whose `session_id` points at that session gets deleted automatically, because of the `CASCADE` rule. Nothing in `users`, `bookmarks`, or `rating_history` is affected — none of those tables reference `sessions` at all; they all reference `users` directly. So deleting one session only ever ripples one table deep, never further.

**Q9. You said `session_problems` has no `user_id` column, and ownership is found by joining through `sessions`. What's the actual cost of that design — where does it hurt you?**
This is a great one to answer with real, specific detail from the actual codebase, not just theory:
> Two places it costs something. First, every query that needs "give me this user's problems" needs a join, which is one more table Postgres has to touch — versus a direct `WHERE user_id = ...` if the column existed locally. Second, and this is a real historical bug in this exact project: because ownership isn't a column sitting directly on the row, when a bookmark gets removed from the dedicated bookmarks page, there's no way to reach back and find every `session_problems` row across every old session that references that same Codeforces problem and un-star it there too — there's no session context available from a bare bookmark record to make that connection. It's a known, accepted edge case, not something I pretended didn't exist.

**Q10. If this app had to support 10 million users, what's the first schema-level thing you'd worry about, and why?**
> Indexing. Every one of these join-heavy queries — "get session_problems for a session," "get sessions for a user" — relies on Postgres being able to quickly find matching rows by a foreign key column. Without an index on `sessions.user_id` and `session_problems.session_id`, those lookups become a full table scan as the tables grow, meaning Postgres checks every single row instead of jumping straight to the matches. This is directly connected to another real design decision in this project (covered fully in Session 3): once Row Level Security was turned on, *every single query* runs an extra ownership-check behind the scenes automatically, which is exactly why those two indexes were added at that same time — RLS made the cost of a missing index suddenly much more visible, since now that ownership check runs on every request, not just the ones the application code explicitly asked for.

**Q11. Is this schema in a "normalized" form? Would you ever consider denormalizing any part of it?**
> Mostly yes — each table stores one kind of thing, and data isn't needlessly duplicated across tables (a session doesn't re-store the user's handle, for instance; it just stores the `user_id` and you'd join to get the handle if needed). There is one deliberate, small exception, though: `session_problems.bookmarked` is a denormalized boolean flag — the *real* source of truth for "is this bookmarked" is the separate `bookmarks` table, but that boolean is kept in sync as a copy purely so the star icon on a problem row can render instantly without a second query joining out to the bookmarks table on every single render. That's a conscious, deliberate tradeoff — accepting a small duplicate value in exchange for not needing an extra database round-trip just to draw a star icon.

---

## What to do before Session 3

Try explaining the schema out loud once, using the 45-second script above, without looking at this document. If you stumble on any single table, that's the one to re-read — don't move on until all five feel natural to describe from memory, not recognition.

**Next: Session 3 — Authentication & Security Deep Dive.** This is the single most *distinctive* thing about this project, and it's the part most likely to get genuinely surprised, curious follow-up questions — because "prove who you are by triggering a compile error on a specific competitive programming problem" is not a login method any interviewer has seen before. We'll build up, from scratch and just as slowly as this session, exactly how that works, why a custom-signed JWT was needed at all, what Row Level Security actually does underneath, and the real security tradeoffs worth being honest about.
