import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const SESSION_COOKIE_KEY = "cpdojo-session";

const getSessionToken = (): string | null => {
  if (typeof window === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${SESSION_COOKIE_KEY}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() ?? null;
  return null;
};

// browser client — automatically attaches the custom session JWT (if present)
// as a Bearer token, so Postgres RLS policies using auth.uid() resolve correctly
export const createClient = () => {
  const token = getSessionToken();
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    token
      ? { global: { headers: { Authorization: `Bearer ${token}` } } }
      : undefined
  );
};

// SERVER-ONLY. Uses the service_role key, which bypasses RLS entirely.
// Never import/call this from a "use client" component or expose its key.
export const createServiceClient = () => {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};