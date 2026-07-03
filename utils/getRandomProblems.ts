import { CodeforcesProblem, ProblemTag } from "@/types/Codeforces";
import { SessionProblem } from "@/types/SessionProblem";

const getRandomProblems = (
  problems: CodeforcesProblem[],
  solved: CodeforcesProblem[],
  ratingMin: number,
  ratingMax: number,
  tags: ProblemTag[],
  count: number,
): SessionProblem[] => {

  // step 1: build set of solved prolem ids for O(1) lookup
  const solvedIds = new Set(
    solved.map((p) => `${p.contestId}_${p.index}`)
  )

  // step 2: filter by rating range and remove already solved
  const inRange = problems.filter((p) =>
    p.rating >= ratingMin &&
    p.rating <= ratingMax &&
    !solvedIds.has(`${p.contestId}_${p.index}`)
  )

  // step 3: filter by tags if any selected
  // if no tags selected, use all problems in range
  const tagValues = tags.map((t) => t.value)
  const pool = tags.length > 0
    ? inRange.filter((p) =>
        tagValues.some((tag) => p.tags.includes(tag))
      )
    : inRange

  // step 4: shuffle and pick `count` problems
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const picked = shuffled.slice(0, count)

  // step 5: convert to SessionProblem shape
  return picked.map((p) => ({
    id: crypto.randomUUID(),
    session_id: "",           // filled in when session is created
    contest_id: p.contestId,
    index: p.index,
    name: p.name,
    rating: p.rating,
    tags: p.tags,
    url: `https://codeforces.com/contest/${p.contestId}/problem/${p.index}`,
    solved_time: null,
    status: "none",
    bookmarked: false,
    upsolved: false,
  }))
}

export default getRandomProblems;