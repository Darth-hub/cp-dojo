type TrainingExample = {
  ratingGap: number
  tagSolveRate: number
  label: 0 | 1
}

type Weights = {
  w0: number
  w1: number
  w2: number
}

const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z))

const train = (
  examples: TrainingExample[],
  learningRate = 0.1,
  epochs = 500
): Weights => {
  let w0 = 0
  let w1 = 0
  let w2 = 0
  const n = examples.length

  for (let epoch = 0; epoch < epochs; epoch++) {
    let gradW0 = 0
    let gradW1 = 0
    let gradW2 = 0

    for (const { ratingGap, tagSolveRate, label } of examples) {
      const z = w0 + w1 * ratingGap + w2 * tagSolveRate
      const prediction = sigmoid(z)
      const error = prediction - label

      gradW0 += error
      gradW1 += error * ratingGap
      gradW2 += error * tagSolveRate
    }

    w0 -= learningRate * (gradW0 / n)
    w1 -= learningRate * (gradW1 / n)
    w2 -= learningRate * (gradW2 / n)
  }

  return { w0, w1, w2 }
}

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

export type { TrainingExample, Weights }
export { train, predict, averageTagSolveRate, scoreProblem }