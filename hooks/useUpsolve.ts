"use client"
import { useState, useEffect, useCallback } from "react"
import { SessionProblem } from "@/types/SessionProblem"
import useUser from "@/hooks/useUser"
import { getUpsolveProblems, setUpsolved } from "@/services/upsolve.service"

const useUpsolve = () => {
  const { user } = useUser()

  const [problems, setProblems] = useState<SessionProblem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // fetch all missed problems eligible for upsolve
  const fetchUpsolveProblems = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const res = await getUpsolveProblems(user.id)
      if (!res.success) return
      setProblems(res.data)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUpsolveProblems()
  }, [fetchUpsolveProblems])

  // bookmark or unbookmark a problem (same shape as useTraining's toggleBookmark)
  const toggleBookmark = async (problem: SessionProblem) => {
    const supabase = (await import("@/lib/supabase")).createClient()
    const { error } = await supabase
      .from("session_problems")
      .update({ bookmarked: !problem.bookmarked })
      .eq("id", problem.id)
    if (error) return
    setProblems((prev) =>
      prev.map((p) =>
        p.id === problem.id ? { ...p, bookmarked: !p.bookmarked } : p
      )
    )
  }

  // mark a problem as upsolved — removes it from this list
  const markUpsolved = async (problem: SessionProblem) => {
    const res = await setUpsolved(problem.id, true)
    if (!res.success) return
    setProblems((prev) => prev.filter((p) => p.id !== problem.id))
  }

  return {
    problems,
    isLoading,
    toggleBookmark,
    markUpsolved,
    refetch: fetchUpsolveProblems,
  }
}

export default useUpsolve