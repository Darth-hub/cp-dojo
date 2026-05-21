// get user handle, save and do db updations here 
import { createClient } from "@/lib/supabase"
import { User } from "@/types/User"
import { SuccessResponse, ErrorResponse, Response } from "@/types/Response"
import cfFetch from "@/lib/codeforces"
import { getSubmissions } from "@/services/problem.service"

const VERIFICATION_CONTEST_ID = 2150
const VERIFICATION_PROBLEM_INDEX = "G"

const fetchUserData = async (
  handle: string
): Promise<Response<{ handle: string; rating: number; avatar: string }>> => {
  try {
    const result = await cfFetch(`user.info?handles=${handle}`)
    const profile = result[0]
    return SuccessResponse({
      handle: profile.handle,
      rating: profile.rating,
      avatar: profile.avatar,
    })
  } catch (error) {
    return ErrorResponse((error as Error).message)
  }
}

const verifyHandle = async (
  handle: string
): Promise<Response<boolean>> => {
  try {
    const res = await getSubmissions(handle, 10)
    if (!res.success) return ErrorResponse(res.error)
    const verified = res.data.some(
      (s) =>
        s.verdict === "COMPILATION_ERROR" &&
        s.problem.contestId === VERIFICATION_CONTEST_ID &&
        s.problem.index === VERIFICATION_PROBLEM_INDEX
    )
    return SuccessResponse(verified)
  } catch (error) {
    return ErrorResponse((error as Error).message)
  }
}

const saveUserSupa = async (user: {
  cf_handle: string
  cf_rating: number
  avatar_url: string
}): Promise<Response<User>> => {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("users")
      .upsert(
        { ...user, platform_rating: 1500 },
        { onConflict: "cf_handle" }
      )
      .select()
      .single()
    if (error) return ErrorResponse(error.message)
    return SuccessResponse(data as User)
  } catch (error) {
    return ErrorResponse((error as Error).message)
  }
}

export { fetchUserData, verifyHandle, saveUserSupa }