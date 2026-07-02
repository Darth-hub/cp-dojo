import { createClient } from "@/lib/supabase"
import { SuccessResponse, ErrorResponse, Response } from "@/types/Response"

// K starts high for new users (fast convergence to true skill level) and
// decays toward a floor as more rated contests accumulate (stability once
// established) — same tension real Elo/Glicko systems handle with
// provisional vs. established ratings
const getKFactor = (contestsPlayed: number): number => {
  const floor = 0.15
  const start = 0.8
  const decay = Math.exp(-contestsPlayed / 5)
  return floor + (start - floor) * decay
}

const updatePlatformRating = async (
  userId: string,
  currentRating: number,
  performanceRating: number
): Promise<Response<number>> => {
  try {
    const supabase = createClient()

    // count past rated contests to determine K-factor
    const { count, error: countError } = await supabase
      .from("rating_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
    if (countError) return ErrorResponse(countError.message)

    const k = getKFactor(count ?? 0)
    const rawNewRating = currentRating + k * (performanceRating - currentRating)
    const newRating = Math.max(0, Math.round(rawNewRating))

    const { error: userError } = await supabase
      .from("users")
      .update({ platform_rating: newRating })
      .eq("id", userId)
    if (userError) return ErrorResponse(userError.message)

    const { error: historyError } = await supabase
      .from("rating_history")
      .insert({ user_id: userId, platform_rating: newRating })
    if (historyError) return ErrorResponse(historyError.message)

    return SuccessResponse(newRating)
  } catch (error) {
    return ErrorResponse((error as Error).message)
  }
}

export { updatePlatformRating, getKFactor }