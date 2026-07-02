import { createClient } from "@/lib/supabase"
import { SuccessResponse, ErrorResponse, Response } from "@/types/Response"
import { SessionProblem } from "@/types/SessionProblem"

type RatingPoint = {
  platform_rating: number
  recorded_at: string
}

type TrainingStats = {
  totalAttempted: number
  totalSolved: number
  byTag: { tag: string; attempted: number; solved: number }[]
  byRating: { rating: number; attempted: number; solved: number }[]
}

type WeakTag = { tag: string; attempted: number; solved: number; solveRate: number }


const getWeakTags = async (
  userId: string,
  minAttempts = 3
): Promise<Response<WeakTag[]>> => {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("sessions")
      .select("problems:session_problems(tags, status)")
      .eq("user_id", userId)
    if (error) return ErrorResponse(error.message)

    const tagMap = new Map<string, { attempted: number; solved: number }>()
    for (const s of data as { problems: { tags: string[]; status: string }[] }[]) {
      for (const p of s.problems ?? []) {
        for (const tag of p.tags ?? []) {
          const entry = tagMap.get(tag) ?? { attempted: 0, solved: 0 }
          entry.attempted += 1
          if (p.status === "solved") entry.solved += 1
          tagMap.set(tag, entry)
        }
      }
    }

    const weakTags = Array.from(tagMap.entries())
      .map(([tag, v]) => ({
        tag,
        attempted: v.attempted,
        solved: v.solved,
        solveRate: v.solved / v.attempted,
      }))
      .filter((t) => t.attempted >= minAttempts)
      .sort((a, b) => a.solveRate - b.solveRate)
      .slice(0, 5)

    return SuccessResponse(weakTags)
  } catch (error) {
    return ErrorResponse((error as Error).message)
  }
}

// fetches rating history for the rating chart on statistics page
const getRatingHistory = async (
  userId: string
): Promise<Response<RatingPoint[]>> => {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("rating_history")
      .select("platform_rating, recorded_at")
      .eq("user_id", userId)
      .order("recorded_at", { ascending: true })
    if (error) return ErrorResponse(error.message)
    return SuccessResponse(data as RatingPoint[])
  } catch (error) {
    return ErrorResponse((error as Error).message)
  }
}

// aggregates training history from session_problems across all training
// sessions (started_at IS NULL) for this user — training sets are never
// marked is_completed, so we can't filter on that like contests do
const getTrainingStats = async (
  userId: string
): Promise<Response<TrainingStats>> => {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("sessions")
      .select("session_problems(*)")
      .eq("user_id", userId)
      .is("started_at", null)
    if (error) return ErrorResponse(error.message)

    const allProblems: SessionProblem[] = (
      data as { session_problems: SessionProblem[] }[]
    ).flatMap((s) => s.session_problems ?? [])

    const totalAttempted = allProblems.length
    const totalSolved = allProblems.filter((p) => p.status === "solved").length

    const tagMap = new Map<string, { attempted: number; solved: number }>()
    const ratingMap = new Map<number, { attempted: number; solved: number }>()

    for (const p of allProblems) {
      const solved = p.status === "solved"

      for (const tag of p.tags ?? []) {
        const entry = tagMap.get(tag) ?? { attempted: 0, solved: 0 }
        entry.attempted += 1
        if (solved) entry.solved += 1
        tagMap.set(tag, entry)
      }

      const ratingEntry = ratingMap.get(p.rating) ?? { attempted: 0, solved: 0 }
      ratingEntry.attempted += 1
      if (solved) ratingEntry.solved += 1
      ratingMap.set(p.rating, ratingEntry)
    }

    const byTag = Array.from(tagMap.entries())
      .map(([tag, v]) => ({ tag, ...v }))
      .sort((a, b) => b.attempted - a.attempted)

    const byRating = Array.from(ratingMap.entries())
      .map(([rating, v]) => ({ rating, ...v }))
      .sort((a, b) => a.rating - b.rating)

    return SuccessResponse({ totalAttempted, totalSolved, byTag, byRating })
  } catch (error) {
    return ErrorResponse((error as Error).message)
  }
}

export { getRatingHistory, getTrainingStats, getWeakTags }
export type { RatingPoint, TrainingStats, WeakTag }