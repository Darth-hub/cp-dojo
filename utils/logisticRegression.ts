// Scoring side of the adaptive-difficulty model. Training lives in model-service/
// (Python); these weights come back from it via /api/model.
type Weights = {
  w0: number
  w1: number
  w2: number
}

const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z))

const predict = (weights: Weights, ratingGap: number, tagSolveRate: number): number => {
  const { w0, w1, w2 } = weights
  const z = w0 + w1 * ratingGap + w2 * tagSolveRate
  return sigmoid(z)
}

const averageTagSolveRate = (tags: string[], tagSolveRate: Map<string, number>): number => {
  if (tags.length === 0) return 0
  const sum = tags.reduce((acc, t) => acc + (tagSolveRate.get(t) ?? 0), 0)
  return sum / tags.length
}

const scoreProblem = (
  weights: Weights,
  tagSolveRate: Map<string, number>,
  problemRating: number,
  problemTags: string[],
  platformRating: number
): number => {
  const ratingGap = (problemRating - platformRating) / 400
  const tagRate = averageTagSolveRate(problemTags, tagSolveRate)
  return predict(weights, ratingGap, tagRate)
}

export type { Weights }
export { predict, averageTagSolveRate, scoreProblem }