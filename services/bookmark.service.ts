import { createClient } from "@/lib/supabase"
import { SuccessResponse, ErrorResponse, Response } from "@/types/Response"
import { Bookmark } from "@/types/Bookmark"

type BookmarkInput = {
  contest_id: number
  index: string
  name: string
  rating: number
  tags: string[]
  url: string
}

// adds a bookmark — composite PK (user_id, contest_id, index) means this
// is safe to call even if already bookmarked (upsert avoids duplicate errors)
const addBookmark = async (
  userId: string,
  problem: BookmarkInput
): Promise<Response<null>> => {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from("bookmarks")
      .upsert({
        user_id: userId,
        contest_id: problem.contest_id,
        index: problem.index,
        name: problem.name,
        rating: problem.rating,
        tags: problem.tags,
        url: problem.url,
      })
    if (error) return ErrorResponse(error.message)
    return SuccessResponse(null)
  } catch (error) {
    return ErrorResponse((error as Error).message)
  }
}

// removes a bookmark by its composite key — no UUID needed per schema design
const removeBookmark = async (
  userId: string,
  contestId: number,
  index: string
): Promise<Response<null>> => {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", userId)
      .eq("contest_id", contestId)
      .eq("index", index)
    if (error) return ErrorResponse(error.message)
    return SuccessResponse(null)
  } catch (error) {
    return ErrorResponse((error as Error).message)
  }
}

// fetches all bookmarks for the dedicated bookmarks view
const getBookmarks = async (
  userId: string
): Promise<Response<Bookmark[]>> => {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    if (error) return ErrorResponse(error.message)
    return SuccessResponse(data as Bookmark[])
  } catch (error) {
    return ErrorResponse((error as Error).message)
  }
}

export { addBookmark, removeBookmark, getBookmarks }
export type { BookmarkInput }