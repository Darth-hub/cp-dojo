# Architecture & Design Decisions

## 1. Delete + reinsert for regenerate (not update in place)
When user regenerates a problem set, we delete the session and all its problems,
then create a fresh session with new problems. Not update each row.
Why: problems change completely on regenerate (different contest_id, index, name, rating).
Also problem count can change. Update in place cannot handle either case cleanly.
Cascade delete on session_problems handles cleanup automatically.

## 2. Update in place for solve status, bookmarks, upsolved
When a problem's state changes (solved, bookmarked, upsolved), we update
the existing session_problems row directly.
Why: only one field changes, the problem identity stays the same.
Delete + reinsert would lose the solved_time history.

## 3. On delete cascade on session_problems
session_problems references sessions with on delete cascade.
Deleting a session automatically deletes all its problems.
One delete operation, no orphaned rows, no manual cleanup needed.

## 4. Timer calculated from started_at, never stored
The contest timer is always calculated as: duration - (now - started_at).
Why: accurate even if user closes tab mid-contest.
No timer state to sync, no drift, always correct on restore.

## 5. Duration and problem count are independent inputs
User picks duration and problem count separately.
Neither derives from the other.
Why: a user may want 4 problems in 1hr or 2 problems in 2hrs.
The session stores both as flat fields.

## 6. Upsolve derived from session_problems, no separate table
Upsolve page queries session_problems where solved_time is null
and session is completed.
Why: single source of truth, no sync bugs, no data duplication.

## 7. One sessions table for both training sets and contests
Training problem sets and contests use the same sessions table.
State is tracked via started_at and is_completed fields.
started_at null = generated but not started
started_at set = contest running
is_completed true = finished contest shown in statistics
Why: no data duplication, same structure, simpler queries.
## 8. Model training moved into a separate Python service
Training used to run in the browser: the client fetched the user's whole Codeforces
history and ran gradient descent on the main thread.
Moved to model-service/ (FastAPI) behind the /api/model route.
Why:
- Codeforces is called from one server-side place, with a timeout, caching (10 min
  per user) and per-user rate limiting, instead of from every visitor's browser.
- The browser downloads three weights + a tag map instead of thousands of submissions.
- Python/NumPy is the natural home for model code and makes the next model
  (more features, different algorithm) a change in one service.
Scoring stays in TypeScript (utils/logisticRegression.ts): it is a pure function over
the weights and must run per candidate problem during generation, so keeping it
client-side avoids a network round trip per click.
The Python port was verified against the old TS trainer on identical data
(max weight difference ~1e-17), so recommendations did not change.

## 9. Service-to-service auth: HMAC-signed requests, not a bearer API key
Next.js signs HMAC-SHA256(secret, "timestamp.METHOD.path.body") and sends the
timestamp + signature in headers. The service recomputes it and compares in constant time.
Why over a static API key header:
- The secret itself never travels over the wire.
- The signature covers method, path and body, so a captured request can't be
  altered (e.g. changing the handle) and still pass.
- The timestamp bounds replay to a 5-minute window.
The browser never talks to the service directly; identity comes from the session
JWT, which /api/model verifies before looking up the handle server-side.

## 10. Model service failure never breaks training
/api/model returns { model: null } on timeout (10 s), non-2xx, network error or missing
config, and getRandomProblems already treats "no model" as uniform random.
Why: the model is an enhancement. A training page that still works with slightly
less personalised problems beats an error page.

## 11. AWS App Runner (not ECS/EKS/Lambda) for the model service
Why: one small stateless HTTP container. App Runner gives HTTPS, health checks,
autoscaling and rolling deploys without managing a VPC, load balancer or cluster.
Lambda would also work but cold starts with NumPy are slow and the container
image is the same artefact used in docker compose locally.
Infrastructure is Terraform; GitHub Actions deploys through OIDC, so no
long-lived AWS keys exist anywhere.
