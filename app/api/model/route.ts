import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { createServiceClient } from "@/lib/supabase"
import { fetchAdaptiveModel } from "@/lib/modelService"
import { modelRatelimit } from "@/lib/ratelimit"

const SESSION_COOKIE_KEY = "cpdojo-session"

// Identity comes from the signed session JWT, never from the request body,
// so a caller can only ever build the model for their own account.
const getUserIdFromSession = (request: NextRequest): string | null => {
  const token = request.cookies.get(SESSION_COOKIE_KEY)?.value
  if (!token) return null

  try {
    const claims = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!, {
      algorithms: ["HS256"],
      audience: "authenticated",
    })
    return typeof claims === "object" && typeof claims.sub === "string" ? claims.sub : null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const userId = getUserIdFromSession(request)
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  // each call can trigger a full Codeforces history fetch + training run
  const { success } = await modelRatelimit.limit(userId)
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  const supabase = createServiceClient()
  const { data: user, error } = await supabase
    .from("users")
    .select("cf_handle, platform_rating")
    .eq("id", userId)
    .single()

  if (error || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const model = await fetchAdaptiveModel(user.cf_handle, user.platform_rating)
  return NextResponse.json({ model })
}
