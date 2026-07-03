import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// 5 verification attempts per IP per 10 minutes — generous enough for a
// real user retrying after a failed CF submission, tight enough to stop
// abuse (this endpoint hits both the CF API and Supabase's service_role
// key on every call)
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "10 m"),
  analytics: true,
  prefix: "cpdojo-verify",
})

export { ratelimit }