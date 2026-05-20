## what exists
## what each file does in one line
## what is not built yet
## what the next step is


1. what is this project (one line)
a complete one stop cp training application 

2. what are the 5 pages and what does each do
/ -> home 
/training -> generates problem sets in a given rating range(persistent), user can solve and green the problems 
/upsolve -> upsolve problems of the contest 
/contest -> gives contest (1hr 2problems)(1.5hr 3problems)(2hrs 4problems) from a range that he selects problems are random 
/stats -> gives previous contest + ques solved and rating level perfomed in that contest (delta of my platform rating) 

3. what is Supabase and why are we using it
sql database, using coz i dont want to use localstorage 

4. what is the difference between services/ hooks/ utils/ 
services -> api called and some fetch or somthing happening, async functions no react 
hooks -> react glue bewteen components, this will call services and utils
utils -> pure functions that take in data that is fetched by a service and give output 

5. what does lib/supabase.ts do
initiate my client in server side and when function is called it makes a fresh browser client 

6. what are the 6 localStorage keys in the old project
HISTORY_STORAGE_KEY = "training-tracker-history"
PROBLEMS_CACHE_KEY = "codeforces-all-problems"
TRAINING_STORAGE_KEY = "training-tracker-training"
UPSOLVED_PROBLEMS_CACHE_KEY = "training-tracker-upsolved-problems"
USER_STORAGE_KEY = "training-tracker-user";
USER_CACHE_KEY = "codeforces-user";

7. what is the CF verification trick and how does it work
i will give the user 3200 problem and he will submit garbage code and i will poll his last submission to be a compilation error

8. what files are copied from old project and why
types/Codeforces.ts     → CF API data shapes, unchanged
types/Response.ts       → success/error wrapper, unchanged
public/data/tag.json    → all CF problem tags, static list
utils/getPerformance.ts → performance calculation, will rewrite later
hooks/useTags.ts        → tag selection UI state, unchanged
hooks/useBounds.ts      → two rating inputs, rename to useRatingRange.ts