type SessionProblem = {
  id: string
  session_id: string
  contest_id: number
  index: string
  name: string
  rating: number
  tags: string[]
  url: string
  solved_time: number | null
  status: "none" | "solved" | "wrong" | "testing"
  bookmarked: boolean
  upsolved: boolean
}
export type { SessionProblem }