import cfFetch from "@/lib/codeforces"
import { train, predict, averageTagSolveRate, type Weights } from "@/utils/logisticRegression"
import type { CodeforcesSubmission } from "@/types/Codeforces"

const COLD_START_FLOOR = 5 // min distinct rated problems attempted on CF

// A problem only counts as a "quick solve" (label 1) if it was solved within
// this many total attempts. Solved-but-grindy or never-solved both label 0 —
// both are evidence the problem was at or beyond the edge of comfortable
// ability, not a false negative to correct for.
const QUICK_SOLVE_ATTEMPT_THRESHOLD = 3

type AdaptiveModel = {
  weights: Weights
  tagSolveRate: Map<string, number>
}

type ProblemAttempts = {
  rating: number
  tags: string[]
  attempts: { verdict: string; creationTimeSeconds: number }[]
}

const getLabel = (attempts: ProblemAttempts["attempts"]): 0 | 1 => {
  const sorted = [...attempts].sort((a, b) => a.creationTimeSeconds - b.creationTimeSeconds)
  const firstSolveIndex = sorted.findIndex((a) => a.verdict === "OK")

  if (firstSolveIndex === -1) return 0 // never solved
  const attemptsUsed = firstSolveIndex + 1
  return attemptsUsed <= QUICK_SOLVE_ATTEMPT_THRESHOLD ? 1 : 0
}

const getTagSolveRateMap = (
  labeledProblems: Map<string, { label: 0 | 1; tags: string[] }>
): Map<string, number> => {
  const tagStats = new Map<string, { solved: number; total: number }>()

  for (const { label, tags } of labeledProblems.values()) {
    for (const tag of tags) {
      const stats = tagStats.get(tag) ?? { solved: 0, total: 0 }
      stats.total += 1
      if (label === 1) stats.solved += 1
      tagStats.set(tag, stats)
    }
  }

  const tagSolveRate = new Map<string, number>()
  for (const [tag, { solved, total }] of tagStats) {
    tagSolveRate.set(tag, solved / total)
  }
  return tagSolveRate
}

const buildAdaptiveModel = async (
  cfHandle: string,
  platformRating: number
): Promise<AdaptiveModel | null> => {
  const submissions: CodeforcesSubmission[] = await cfFetch(`user.status?handle=${cfHandle}`)

  const byProblem = new Map<string, ProblemAttempts>()

  for (const sub of submissions) {
    const { problem, verdict, creationTimeSeconds } = sub
    if (problem.rating == null) continue

    const key = `${problem.contestId}_${problem.index}`
    const existing = byProblem.get(key)

    if (existing) {
      existing.attempts.push({ verdict, creationTimeSeconds })
    } else {
      byProblem.set(key, {
        rating: problem.rating,
        tags: problem.tags,
        attempts: [{ verdict, creationTimeSeconds }],
      })
    }
  }

  if (byProblem.size < COLD_START_FLOOR) {
    return null
  }

  const labeledProblems = new Map<string, { rating: number; tags: string[]; label: 0 | 1 }>()
  for (const [key, { rating, tags, attempts }] of byProblem) {
    labeledProblems.set(key, { rating, tags, label: getLabel(attempts) })
  }

  const tagSolveRate = getTagSolveRateMap(labeledProblems)

  const examples = Array.from(labeledProblems.values()).map(({ rating, tags, label }) => ({
    ratingGap: (rating - platformRating) / 400,
    tagSolveRate: averageTagSolveRate(tags, tagSolveRate),
    label,
  }))

  const weights = train(examples)

  return { weights, tagSolveRate }
}

const predictSolveProbability = (
  model: AdaptiveModel,
  problemRating: number,
  problemTags: string[],
  platformRating: number
): number => {
  const ratingGap = (problemRating - platformRating) / 400
  const avgTagSolveRate = averageTagSolveRate(problemTags, model.tagSolveRate)
  return predict(model.weights, ratingGap, avgTagSolveRate)
}

export type { AdaptiveModel }
export { buildAdaptiveModel, predictSolveProbability }