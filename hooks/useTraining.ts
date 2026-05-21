"use client"
import { useState, useEffect } from "react"
import useSWR from "swr"
import { SessionProblem } from "@/types/SessionProblem"
import { CodeforcesProblem, ProblemTag } from "@/types/Codeforces"
import useUser from "@/hooks/useUser"
import { getAllProblems, getSolvedProblems } from "@/services/problem.service"
import {
  createSession,
  saveSessionProblems,
  deleteActiveSession,
  getActiveSession,
} from "@/services/session.service"
import getRandomProblems from "@/utils/getRandomProblems"
import { getSubmissions } from "@/services/problem.service"
import checkSolvedStatus from "@/utils/checkSolvedStatus"

const ALL_PROBLEMS_KEY = "cpdojo-all-problems"
const SOLVED_PROBLEMS_KEY = (handle: string) => `cpdojo-solved-${handle}`

const useTraining = () => {
  const { user } = useUser()

  // current problem set shown on training page
  const [problems, setProblems] = useState<SessionProblem[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [ratingMin, setRatingMin] = useState(800)
  const [ratingMax, setRatingMax] = useState(1600)
  const [selectedTags, setSelectedTags] = useState<ProblemTag[]>([])
  const [problemCount, setProblemCount] = useState(4)

  // fetch all CF problems, cached for 1 hour
  const { data: allProblems } = useSWR<CodeforcesProblem[]>(
    ALL_PROBLEMS_KEY,
    async () => {
      const res = await getAllProblems()
      if (!res.success) throw new Error(res.error)
      return res.data
    },
    { revalidateOnFocus: false, dedupingInterval: 3600000 }
  )

  // fetch solved problems for this user
  const { data: solvedProblems } = useSWR<CodeforcesProblem[]>(
    user ? SOLVED_PROBLEMS_KEY(user.cf_handle) : null,
    async () => {
      if (!user) throw new Error("No user")
      const res = await getSolvedProblems(user.cf_handle)
      if (!res.success) throw new Error(res.error)
      return res.data
    },
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  )

  // on page load, restore last active training session if exists
  useEffect(() => {
    if (!user) return
    const restore = async () => {
      const res = await getActiveSession(user.id)
      if (!res.success || !res.data) return
      const session = res.data
      // only restore if not started (pure training set, not a contest)
      if (session.started_at !== null) return
      setSessionId(session.id)
      setProblems(session.session_problems ?? [])
    }
    restore()
  }, [user])

  // generate a new problem set
  const generate = async () => {
    if (!user || !allProblems) return
    setIsGenerating(true)
    try {
      // delete old incomplete session if exists
      await deleteActiveSession(user.id)

      // pick random problems
      const picked = getRandomProblems(
        allProblems,
        solvedProblems ?? [],
        ratingMin,
        ratingMax,
        selectedTags,
        problemCount // default 4 problems for training
      )

      // create session in Supabase
      const sessionRes = await createSession(
        user.id,
        0, // no duration for training
        picked.length,
        selectedTags.map((t) => t.value)
      )
      if (!sessionRes.success) throw new Error(sessionRes.error)

      // save problems with session id
      const withSessionId = picked.map((p) => ({
        ...p,
        session_id: sessionRes.data.id,
      }))
      const problemsRes = await saveSessionProblems(
        sessionRes.data.id,
        withSessionId
      )
      if (!problemsRes.success) throw new Error(problemsRes.error)

      setSessionId(sessionRes.data.id)
      setProblems(problemsRes.data)
    } finally {
      setIsGenerating(false)
    }
  }

  // bookmark or unbookmark a problem
  const toggleBookmark = async (problem: SessionProblem) => {
    if (!sessionId) return
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

  const onTagClick = (tag: ProblemTag) => {
    setSelectedTags((prev) =>
      prev.find((t) => t.value === tag.value)
        ? prev.filter((t) => t.value !== tag.value)
        : [...prev, tag]
    )
  }
  const checkDone = async () => {
  if (!user || problems.length === 0) return
  const submissionsRes = await getSubmissions(user.cf_handle, 10)
  if (!submissionsRes.success) return
  const updated = checkSolvedStatus(problems, submissionsRes.data)
  // update Supabase for newly solved
  const supabase = (await import("@/lib/supabase")).createClient()
  for (const p of updated) {
    if (p.solved_time !== null) {
      await supabase
        .from("session_problems")
        .update({ solved_time: p.solved_time })
        .eq("id", p.id)
        .is("solved_time", null)
    }
  }
  setProblems(updated)
}

  const onClearTags = () => setSelectedTags([])

  return {
    problems,
    isGenerating,
    ratingMin,
    ratingMax,
    selectedTags,
    allProblems: allProblems ?? [],
    setRatingMin,
    setRatingMax,
    onTagClick,
    onClearTags,
    generate,
    toggleBookmark,
    problemCount,
    setProblemCount,
    checkDone,
  }
}

export default useTraining