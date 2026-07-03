"use client"
import { useState, useEffect, useCallback } from "react"
import useUser from "@/hooks/useUser"
import { getBookmarks, removeBookmark } from "@/services/bookmark.service"
import { Bookmark } from "@/types/Bookmark"

const useBookmarks = () => {
  const { user } = useUser()

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchBookmarks = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const res = await getBookmarks(user.id)
      if (res.success) setBookmarks(res.data)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBookmarks()
  }, [fetchBookmarks])

  // removes a bookmark from this dedicated view. Note: this only removes
  // it from the bookmarks table (source of truth) — it does NOT touch
  // session_problems.bookmarked on whatever session this problem
  // originally came from, since that denormalized flag is scoped to a
  // specific session_problems row, and this view has no session context.
  // Minor known inconsistency: unbookmarking here won't un-star the
  // problem if it's later shown again on training/upsolve pages from an
  // old session row. Low-impact edge case, not fixed for now.
  const removeFromBookmarks = async (bookmark: Bookmark) => {
    const res = await removeBookmark(user!.id, bookmark.contest_id, bookmark.index)
    if (!res.success) return
    setBookmarks((prev) =>
      prev.filter(
        (b) => !(b.contest_id === bookmark.contest_id && b.index === bookmark.index)
      )
    )
  }

  return {
    bookmarks,
    isLoading,
    removeFromBookmarks,
    refetch: fetchBookmarks,
  }
}

export default useBookmarks