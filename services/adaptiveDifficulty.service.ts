import type { Weights } from "@/utils/logisticRegression"

// Training now runs in the Python model service (model-service/), reached via
// the /api/model route. The browser only receives the trained weights, then
// scores problems locally with the pure scoreProblem() util.

type AdaptiveModel = {
  weights: Weights
  tagSolveRate: Map<string, number>
}

type ModelRouteResponse = {
  model: {
    weights: Weights
    tag_solve_rate: Record<string, number>
    training_examples: number
  } | null
}

// null = cold start, service unavailable, or not signed in. getRandomProblems
// falls back to uniform random in every one of those cases.
const fetchAdaptiveModel = async (): Promise<AdaptiveModel | null> => {
  const response = await fetch("/api/model", { method: "POST" })
  if (!response.ok) return null

  const { model } = (await response.json()) as ModelRouteResponse
  if (!model) return null

  return {
    weights: model.weights,
    tagSolveRate: new Map(Object.entries(model.tag_solve_rate)),
  }
}

export type { AdaptiveModel }
export { fetchAdaptiveModel }
