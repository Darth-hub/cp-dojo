import jwt from "jsonwebtoken"

const SESSION_DURATION_SECONDS = 30 * 24 * 60 * 60 // 30 days, matches the handle cookie

// mints a JWT shaped like what Supabase Auth issues, so auth.uid() resolves
// correctly in RLS policies. SERVER-ONLY — uses the JWT secret.
const signSessionToken = (userId: string): string => {
  const secret = process.env.SUPABASE_JWT_SECRET!
  const now = Math.floor(Date.now() / 1000)
  return jwt.sign(
    {
      aud: "authenticated",
      role: "authenticated",
      sub: userId,
      iat: now,
      exp: now + SESSION_DURATION_SECONDS,
    },
    secret,
    { algorithm: "HS256" }
  )
}

export { signSessionToken }