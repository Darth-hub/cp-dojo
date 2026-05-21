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