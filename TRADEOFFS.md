# Tradeoffs & Future Optimizations

## 1. User fetch on every page refresh
**Current:** cookie stores handle only. On every page refresh, one Supabase call is made to fetch the user object.
**Why acceptable now:** under 100ms response, Supabase free tier handles 500k requests/month.
**Fix when:** 100k+ daily active users.
**Solution:** add Redis (Upstash). Cache user object server side. Read from Redis first, Supabase on cache miss.

## 2. getAllProblems fetched per user
**Current:** every user's browser calls CF API to fetch all problems independently.
**Why acceptable now:** SWR caches it in memory for the tab session. One call per user per tab open.
**Fix when:** 500+ concurrent users hitting CF API rate limits.
**Solution:** Next.js API route with `revalidate = 3600`. All users hit your server, server hits CF API once per hour.

## 3. No Row Level Security (RLS) on Supabase
**Current:** any client with the anon key can read all rows in all tables.
**Why acceptable now:** app is in development, no real users yet.
**Fix when:** before going public.
**Solution:** enable RLS on all tables. Add policies so users can only read/write their own rows.

## 4. No rate limiting on verification endpoint
**Current:** anyone can call the verify flow unlimited times.
**Why acceptable now:** low traffic, no real abuse risk yet.
**Fix when:** before going public.
**Solution:** add rate limiting middleware using Upstash Redis. Max 5 verification attempts per IP per hour.

## 5. getPerformance needs rewrite
**Current:** placeholder only. Old project used Level system which we dropped.
**Why acceptable now:** contest finish flow not built yet.
**Fix when:** building useContest.ts.
**Solution:** rewrite to use problem ratings + solved times without Level dependency.

## 6. No handle change handling
**Current:** if user changes CF handle, their history is lost. New UUID created on next login.
**Why acceptable now:** handle changes are extremely rare on Codeforces, require CF support.
**Fix when:** if users complain.
**Solution:** build a handle claim flow that lets user prove ownership of old handle and merge history.

## 7. Upsolve derived from session_problems
**Current:** upsolve page queries session_problems with a join on sessions.
**Why acceptable:** single source of truth, no sync bugs, indexes keep it fast.
**Fix when:** query becomes slow at very large scale (1M+ rows).
**Solution:** add a materialized view or separate upsolve table only then.

## 8. Timer calculated from started_at
**Current:** timer is never stored. Always calculated as duration - (now - started_at).
**Why good:** accurate even if user closes tab mid-contest. No sync needed.