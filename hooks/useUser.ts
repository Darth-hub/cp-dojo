"use client"
import { useState } from "react"
import useSWR from "swr"
import { User } from "@/types/User"
import { createClient } from "@/lib/supabase"

const USER_CACHE_KEY = "cpdojo-user"
const HANDLE_COOKIE_KEY = "cpdojo-handle"
const SESSION_COOKIE_KEY = "cpdojo-session"


// reads a cookie value by name from the browser
const getCookie = (name: string) => {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(";").shift() ?? null
  return null
}

// sets a cookie with an expiry in days
const setCookie = (name: string, value: string, days: number) => {
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
}

// deletes a cookie by setting its expiry to the past
const deleteCookie = (name: string) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`
}

const useUser = () => {
  // tracks whether verification is in progress
  const [isVerifying, setIsVerifying] = useState(false)
  // stores any error message from verification
  const [verificationError, setVerificationError] = useState<string | null>(null)

  // fetches user from Supabase on page load using handle stored in cookie
  // SWR caches the result so Supabase is not hit on every render
  const { data: user, isLoading, mutate } = useSWR<User | null>(
    USER_CACHE_KEY,
    async () => {
      if (typeof window === "undefined") return null 
      const handle = getCookie(HANDLE_COOKIE_KEY)
      if (!handle) return null
      const supabase = createClient()
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("cf_handle", handle)
        .single()
      if (error) return null
      return data as User
    },
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  )

  // full login flow:
  // 1. fetch CF profile to confirm handle exists
  // 2. check if user submitted compilation error on verification problem
  // 3. save or update user in Supabase
  // 4. store handle in cookie so user stays logged in
  // 5. update SWR cache with saved user
  const login = async (handle: string) => {
    setIsVerifying(true)
    setVerificationError(null)
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      })
      const data = await res.json()
      if (!res.ok) {
        setVerificationError(data.error ?? "Verification failed.")
        return false
      }
      setCookie(HANDLE_COOKIE_KEY, data.user.cf_handle, 30)
      setCookie(SESSION_COOKIE_KEY, data.token, 30)
      await mutate(data.user, { revalidate: false })
      return true
    } catch (error) {
      setVerificationError((error as Error).message)
      return false
    } finally {
      setIsVerifying(false)
    }
  }

  // clears cookie and resets user state to null
  const logout = () => {
    deleteCookie(HANDLE_COOKIE_KEY)
    deleteCookie(SESSION_COOKIE_KEY)
    mutate(null, { revalidate: false })
  }

  return {
    user,
    isLoading,
    isVerifying,
    verificationError,
    login,
    logout,
  }
}

export default useUser