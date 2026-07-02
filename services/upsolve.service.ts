import { createClient } from "@/lib/supabase"
import { SessionProblem } from "@/types/SessionProblem"
import { SuccessResponse, ErrorResponse, Response } from "@/types/Response"

// fetches all missed problems eligible for upsolve:
// belongs to a completed session, not solved, not already marked upsolved
const getUpsolveProblems = async (
  userId: string
): Promise<Response<SessionProblem[]>> => {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("session_problems")
      .select("*, sessions!inner(user_id, is_completed)")
      .eq("sessions.user_id", userId)
      .eq("sessions.is_completed", true)
      .is("solved_time", null)
      .eq("upsolved", false)
      .order("id", { ascending: false })
    if (error) return ErrorResponse(error.message)

    // strip the joined sessions field, keep shape as SessionProblem
    const cleaned = (data as unknown as (SessionProblem & { sessions: unknown })[]).map(
      ({ sessions, ...rest }) => rest as SessionProblem
    )
    return SuccessResponse(cleaned)
  } catch (error) {
    return ErrorResponse((error as Error).message)
  }
}

// marks a problem as upsolved (or un-marks it) — toggle, same pattern as bookmark
const setUpsolved = async (
  problemId: string,
  value: boolean
): Promise<Response<null>> => {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from("session_problems")
      .update({ upsolved: value })
      .eq("id", problemId)
    if (error) return ErrorResponse(error.message)
    return SuccessResponse(null)
  } catch (error) {
    return ErrorResponse((error as Error).message)
  }
}

export { getUpsolveProblems, setUpsolved }