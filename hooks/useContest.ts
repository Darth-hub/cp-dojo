"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import useUser from "@/hooks/useUser"
import { SessionProblem } from "@/types/SessionProblem"
import { CodeforcesProblem, ProblemTag } from "@/types/Codeforces"
import { getAllProblems, getSolvedProblems, getSubmissions } from "@/services/problem.service"
import {
  createSession, saveSessionProblems, getActiveSession,
  deleteActiveSession, startSession, finishSession,
} from "@/services/session.service"
import getRandomProblems from "@/utils/getRandomProblems"
import checkSolvedStatus from "@/utils/checkSolvedStatus"
import useSWR from "swr"
import getPerformance from "@/utils/getPerformance"
import { updatePlatformRating } from "@/services/rating.service"
import { getWeakTags } from "@/services/statistics.service"




const useContest = () => {
  const router = useRouter()
  const { user } = useUser()

  const [problems, setProblems] = useState<SessionProblem[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [duration, setDuration] = useState(120)        // minutes
  const [problemCount, setProblemCount] = useState(4)
  const [ratingMin, setRatingMin] = useState(800)
  const [ratingMax, setRatingMax] = useState(1600)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isGenerating, setIsGenerating] = useState(false)
  
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<number | null>(null)

  const [analysis, setAnalysis] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)


  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const { data: allProblems } = useSWR<CodeforcesProblem[]>(
    "cpdojo-all-problems",
    async () => {
      const res = await getAllProblems()
      if (!res.success) throw new Error(res.error)
      return res.data
    },
    { revalidateOnFocus: false, dedupingInterval: 3600000 }
  )

  const { data: solvedProblems } = useSWR<CodeforcesProblem[]>(
    user ? `cpdojo-solved-${user.cf_handle}` : null,
    async () => {
      if (!user) throw new Error("No user")
      const res = await getSolvedProblems(user.cf_handle)
      if (!res.success) throw new Error(res.error)
      return res.data
    },
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  )

  // restore an active contest on page load
  useEffect(() => {
    if (!user) return
    const restore = async () => {
      const res = await getActiveSession(user.id)
      if (!res.success || !res.data) return
      const s = res.data
      if (s.started_at === null) return  // not a contest, just a training set
      setSessionId(s.id)
      setProblems(s.session_problems ?? [])
      setStartedAt(s.started_at)
      setDuration(s.duration_minutes)
      setProblemCount(s.problem_count)
    }
    restore()
  }, [user])

  // finish the contest — declared before the timer effect that calls it


  const finish = useCallback(async () => {
  if (!sessionId) return
  clearInterval(timerRef.current)
  let finalProblems = problems
  if (user) {
    const subRes = await getSubmissions(user.cf_handle, 20)
    if (subRes.success) finalProblems = checkSolvedStatus(problems, subRes.data)
  }

  const solved = finalProblems
    .filter((p) => p.status === "solved")
    .map((p) => ({ contestId: p.contest_id, index: p.index }))

  const performance = getPerformance(
    finalProblems.map((p) => ({ rating: p.rating, solved: p.status === "solved" }))
  )

  await finishSession(sessionId, performance, solved)

  if (user) {
    await updatePlatformRating(user.id, user.platform_rating, performance)
  }

  // fetch AI analysis before allowing navigation onward
  setIsAnalyzing(true)
  try {
    const weakTagsRes = await getWeakTags(user!.id)
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problems: finalProblems.map((p) => ({ name: p.name, rating: p.rating, status: p.status })),
        solvedCount: solved.length,
        totalCount: finalProblems.length,
        weakTags: weakTagsRes.success ? weakTagsRes.data.map((t) => t.tag) : [],
      }),
    })
    const data = await res.json()
    setAnalysis(data.analysis ?? "Analysis unavailable this time.")
  } catch {
    setAnalysis("Analysis unavailable this time.")
  } finally {
    setIsAnalyzing(false)
  }

  setStartedAt(null)
  setSessionId(null)
  setProblems(finalProblems)
}, [sessionId, user, problems, router])

const dismissAnalysis = useCallback(() => {
  setAnalysis(null)
  setProblems([])
  router.push("/statistics")
}, [router])





  // timer loop
  useEffect(() => {
    if (startedAt === null) return
    const tick = () => {
      const elapsed = Date.now() - startedAt
      const total = duration * 60000
      const remaining = total - elapsed
      if (remaining <= 0) {
        setTimeLeft(0)
        finish()  // auto finish when time runs out
      } else {
        setTimeLeft(remaining)
      }
    }
    tick()
    timerRef.current = setInterval(tick, 1000)
    return () => clearInterval(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, duration])

  // generate fresh unseen problems
  const generate = async () => {
    if (!user || !allProblems) return
    setIsGenerating(true)
    try {
      await deleteActiveSession(user.id)
      const picked = getRandomProblems(
        allProblems, solvedProblems ?? [], ratingMin, ratingMax, [], problemCount
      )
      const sessionRes = await createSession(user.id, duration, picked.length, [])
      if (!sessionRes.success) throw new Error(sessionRes.error)
      const withId = picked.map((p) => ({ ...p, session_id: sessionRes.data.id }))
      const probRes = await saveSessionProblems(sessionRes.data.id, withId)
      if (!probRes.success) throw new Error(probRes.error)
      setSessionId(sessionRes.data.id)
      setProblems(probRes.data)
    } finally {
      setIsGenerating(false)
    }
  }

  // start the contest
  const start = async () => {
    if (!sessionId) return
    const res = await startSession(sessionId)
    if (!res.success) return
    setStartedAt(res.data.started_at)
  }

  // refresh solved status
  // refresh solved status
  const refresh = useCallback(async () => {
    if (!user || problems.length === 0) return
    setIsRefreshing(true)
    try {
      const subRes = await getSubmissions(user.cf_handle, 20)
      if (!subRes.success) return
      const updated = checkSolvedStatus(problems, subRes.data)
      const supabase = (await import("@/lib/supabase")).createClient()
      for (const p of updated) {
        await supabase.from("session_problems")
          .update({ status: p.status, solved_time: p.solved_time })
          .eq("id", p.id)
      }
      setProblems(updated)
      setLastRefreshed(Date.now())
    } finally {
      setIsRefreshing(false)
    }
  }, [user, problems])

  return {
  problems, duration, problemCount, ratingMin, ratingMax,
  startedAt, timeLeft, isGenerating, isRefreshing, lastRefreshed,
  analysis, isAnalyzing,
  setDuration, setProblemCount, setRatingMin, setRatingMax,
  generate, start, refresh, finish, dismissAnalysis,
  }
}

export default useContest