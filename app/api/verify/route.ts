import { NextRequest, NextResponse } from "next/server"
import { fetchUserData, verifyHandle } from "@/services/user.service"
import { createServiceClient } from "@/lib/supabase"
import { signSessionToken } from "@/lib/jwt"
import { ratelimit } from "@/lib/ratelimit"

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown"
    const { success, reset } = await ratelimit.limit(ip)
    if (!success) {
      const retryAfterSeconds = Math.ceil((reset - Date.now()) / 1000)
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${retryAfterSeconds}s.` },
        { status: 429 }
      )
    }

    const { handle } = await req.json()
    if (!handle) {
      return NextResponse.json({ error: "Missing handle" }, { status: 400 })
    }

    const cfRes = await fetchUserData(handle)
    if (!cfRes.success) {
      return NextResponse.json({ error: cfRes.error }, { status: 400 })
    }

    const verifyRes = await verifyHandle(handle)
    if (!verifyRes.success || !verifyRes.data) {
      return NextResponse.json(
        { error: "Verification failed. Submit a compilation error on the given problem." },
        { status: 401 }
      )
    }

    // upsert via service_role — bypasses RLS, since no JWT exists for this
    // user until AFTER their row exists (chicken-and-egg on first login)
    const supabase = createServiceClient()
    const { data: user, error } = await supabase
      .from("users")
      .upsert(
        {
          cf_handle: cfRes.data.handle,
          cf_rating: cfRes.data.rating,
          avatar_url: cfRes.data.avatar,
          platform_rating: 1500,
        },
        { onConflict: "cf_handle" }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const token = signSessionToken(user.id)

    return NextResponse.json({ user, token })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}