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
      .filter((p) => p.solved_time !== null)
      .map((p) => ({ contestId: p.contest_id, index: p.index }))
    const performance = solved.length * 100
    await finishSession(sessionId, performance, solved)
    setStartedAt(null)
    setSessionId(null)
    setProblems([])
    router.push("/statistics")
  }, [sessionId, user, problems, router])

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
  const refresh = useCallback(async () => {
    if (!user || problems.length === 0) return
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
  }, [user, problems])

  return {
    problems, duration, problemCount, ratingMin, ratingMax,
    startedAt, timeLeft, isGenerating,
    setDuration, setProblemCount, setRatingMin, setRatingMax,
    generate, start, refresh, finish,
  }
}

export default useContest