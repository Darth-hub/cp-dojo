"use client"
import { useState, useEffect, useCallback } from "react"
import useUser from "@/hooks/useUser"
import { getSessions } from "@/services/session.service"
import { getRatingHistory, getTrainingStats, RatingPoint, TrainingStats } from "@/services/statistics.service"
import { Session } from "@/types/Session"
import { SessionProblem } from "@/types/SessionProblem"

const useStatistics = () => {
  const { user } = useUser()

  const [contestSessions, setContestSessions] = useState<(Session & { problems: SessionProblem[] })[]>([])
  const [ratingHistory, setRatingHistory] = useState<RatingPoint[]>([])
  const [trainingStats, setTrainingStats] = useState<TrainingStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchStatistics = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const [sessionsRes, ratingRes, trainingRes] = await Promise.all([
        getSessions(user.id),
        getRatingHistory(user.id),
        getTrainingStats(user.id),
      ])
      // getSessions returns everything is_completed=true, which today is
      // contests only — training sets are never marked completed
      if (sessionsRes.success) {
        setContestSessions(sessionsRes.data.filter((s) => s.started_at !== null))
      }
      if (ratingRes.success) setRatingHistory(ratingRes.data)
      if (trainingRes.success) setTrainingStats(trainingRes.data)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStatistics()
  }, [fetchStatistics])

  return {
    contestSessions,
    ratingHistory,
    trainingStats,
    isLoading,
    refetch: fetchStatistics,
  }
}

export default useStatistics