import { CodeforcesProblem, ProblemTag } from "@/types/Codeforces"
import { SessionProblem } from "@/types/SessionProblem"
import { Weights, scoreProblem } from "@/utils/logisticRegression"

type AdaptiveModelInput = {
  weights: Weights
  tagSolveRate: Map<string, number>
}

// Efraimidis–Spirakis weighted sampling without replacement.
const weightedSample = <T,>(items: T[], weights: number[], count: number): T[] => {
  const MIN_WEIGHT = 0.01
  const keyed = items.map((item, i) => {
    const w = Math.max(weights[i], MIN_WEIGHT)
    const key = Math.pow(Math.random(), 1 / w)
    return { item, key }
  })
  keyed.sort((a, b) => b.key - a.key)
  return keyed.slice(0, count).map((k) => k.item)
}

// Rank-relative difficulty targeting (see context.md Session Log #13 for why
// this replaced absolute-band targeting).
const TARGET_PERCENTILE = 0.3 // 0 = hardest in pool, 1 = easiest in pool
const PERCENTILE_SIGMA = 0.25

const percentileBandWeight = (percentile: number): number => {
  const diff = percentile - TARGET_PERCENTILE
  return Math.exp(-(diff * diff) / (2 * PERCENTILE_SIGMA * PERCENTILE_SIGMA))
}

const getRandomProblems = (
  problems: CodeforcesProblem[],
  solved: CodeforcesProblem[],
  ratingMin: number,
  ratingMax: number,
  tags: ProblemTag[],
  count: number,
  model?: AdaptiveModelInput,
  platformRating?: number
): SessionProblem[] => {

  const solvedIds = new Set(solved.map((p) => `${p.contestId}_${p.index}`))

  const inRange = problems.filter((p) =>
    p.rating >= ratingMin &&
    p.rating <= ratingMax &&
    !solvedIds.has(`${p.contestId}_${p.index}`)
  )

  const tagValues = tags.map((t) => t.value)
  const pool = tags.length > 0
    ? inRange.filter((p) => tagValues.some((tag) => p.tags.includes(tag)))
    : inRange

  let picked: CodeforcesProblem[]
  if (model && platformRating !== undefined && pool.length > 0) {
    const scored = pool.map((p) => ({
      problem: p,
      probability: scoreProblem(model.weights, model.tagSolveRate, p.rating, p.tags, platformRating),
    }))
    const sorted = [...scored].sort((a, b) => a.probability - b.probability)
    const rankOf = new Map(sorted.map((s, i) => [s.problem, i]))

    const n = pool.length
    const weights = pool.map((p) => {
      const rank = rankOf.get(p) ?? 0
      const percentile = n > 1 ? rank / (n - 1) : 0
      return percentileBandWeight(percentile)
    })

    picked = weightedSample(pool, weights, count)
  } else {
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    picked = shuffled.slice(0, count)
  }

  return picked.map((p) => ({
    id: crypto.randomUUID(),
    session_id: "",
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

export default getRandomProblems