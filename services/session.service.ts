import { createClient } from "@/lib/supabase"
import { Session } from "@/types/Session"
import { SessionProblem } from "@/types/SessionProblem"
import { SuccessResponse, ErrorResponse, Response } from "@/types/Response"

// creates a new session row when user generates a problem set
const createSession = async (
  userId: string,
  durationMinutes: number,
  problemCount: number,
  tags: string[]
): Promise<Response<Session>> => {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        user_id: userId,
        duration_minutes: durationMinutes,
        problem_count: problemCount,
        tags,
        is_completed: false,
        started_at: null,
      })
      .select()
      .single()
    if (error) return ErrorResponse(error.message)
    return SuccessResponse(data as Session)
  } catch (error) {
    return ErrorResponse((error as Error).message)
  }
}

// inserts all problems for a session after session row is created
const saveSessionProblems = async (
  sessionId: string,
  problems: SessionProblem[]
): Promise<Response<SessionProblem[]>> => {
  try {
    const supabase = createClient()
    const rows = problems.map((p) => ({ ...p, session_id: sessionId }))
    const { data, error } = await supabase
      .from("session_problems")
      .insert(rows)
      .select()
    if (error) return ErrorResponse(error.message)
    return SuccessResponse(data as SessionProblem[])
  } catch (error) {
    return ErrorResponse((error as Error).message)
  }
}

// fetches the last incomplete session for the user
// used to restore problem set on training page load
// and restore contest if user closed tab mid-contest
const getActiveSession = async (
  userId: string
): Promise<Response<(Session & { problems: SessionProblem[] }) | null>> => {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("sessions")
      .select("*, session_problems(*)")
      .eq("user_id", userId)
      .eq("is_completed", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
    if (error) return SuccessResponse(null)
    return SuccessResponse(data as Session & { problems: SessionProblem[] })
  } catch (error) {
    return ErrorResponse((error as Error).message)
  }
}

// deletes the current incomplete session when user regenerates problems
const deleteActiveSession = async (
  userId: string
): Promise<Response<null>> => {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("user_id", userId)
      .eq("is_completed", false)
    if (error) return ErrorResponse(error.message)
    return SuccessResponse(null)
  } catch (error) {
    return ErrorResponse((error as Error).message)
  }
}

// sets started_at when user clicks start contest
// this is the anchor point for the timer
const startSession = async (
  sessionId: string
): Promise<Response<Session>> => {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("sessions")
      .update({ started_at: Date.now() })
      .eq("id", sessionId)
      .select()
      .single()
    if (error) return ErrorResponse(error.message)
    return SuccessResponse(data as Session)
  } catch (error) {
    return ErrorResponse((error as Error).message)
  }
}

// marks session as completed, saves performance and ended_at
// also updates solved_time for any problems solved during contest
const finishSession = async (
  sessionId: string,
  performance: number,
  solvedProblems: { contestId: number; index: string }[]
): Promise<Response<Session>> => {
  try {
    const supabase = createClient()
    const now = Date.now()

    // update session row
    const { data, error } = await supabase
      .from("sessions")
      .update({
        is_completed: true,
        ended_at: now,
        performance,
      })
      .eq("id", sessionId)
      .select()
      .single()
    if (error) return ErrorResponse(error.message)

    // update solved_time for each solved problem
    for (const p of solvedProblems) {
      await supabase
        .from("session_problems")
        .update({ solved_time: now })
        .eq("session_id", sessionId)
        .eq("contest_id", p.contestId)
        .eq("index", p.index)
        .is("solved_time", null) // only update if not already set
    }

    return SuccessResponse(data as Session)
  } catch (error) {
    return ErrorResponse((error as Error).message)
  }
}

// fetches all completed sessions for statistics page
const getSessions = async (
  userId: string
): Promise<Response<(Session & { problems: SessionProblem[] })[]>> => {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("sessions")
      .select("*, session_problems(*)")
      .eq("user_id", userId)
      .eq("is_completed", true)
      .order("created_at", { ascending: false })
    if (error) return ErrorResponse(error.message)
    return SuccessResponse(data as (Session & { problems: SessionProblem[] })[])
  } catch (error) {
    return ErrorResponse((error as Error).message)
  }
}

export {
  createSession,
  saveSessionProblems,
  getActiveSession,
  deleteActiveSession,
  startSession,
  finishSession,
  getSessions,
}