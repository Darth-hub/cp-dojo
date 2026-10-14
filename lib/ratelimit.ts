import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// 5 verification attempts per IP per 10 minutes — generous enough for a
// real user retrying after a failed CF submission, tight enough to stop
// abuse (this endpoint hits both the CF API and Supabase's service_role
// key on every call)
const redis = Redis.fromEnv()

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "10 m"),
  analytics: true,
  prefix: "cpdojo-verify",
})

// model training fetches a user's whole CF history; 20 per user per hour is far
// more than normal use (one build per training-page visit) but caps abuse
const modelRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 h"),
  prefix: "cpdojo-model",
})

export { ratelimit, modelRatelimit }