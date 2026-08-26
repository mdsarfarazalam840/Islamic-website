import type { SupabaseClient } from "@supabase/supabase-js"

// Both are inlined at build time, so a deploy without them simply ships a site
// with no live counter rather than a broken one. Referenced as full
// `process.env.NEXT_PUBLIC_*` expressions because that literal form is what Next
// substitutes — destructuring or dynamic lookup would leave them undefined.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey)
}

let clientPromise: Promise<SupabaseClient | null> | null = null

/**
 * Browser Supabase client, or null when the project is not configured (local
 * dev without env vars, or the Tauri/Capacitor shells running offline).
 *
 * The SDK is imported dynamically: it is only needed for the live-visitor
 * badge in the footer, and a static `import` would pull the realtime client
 * into the shared bundle that every page loads.
 */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!url || !anonKey) return Promise.resolve(null)
  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(url, anonKey, {
      // Nobody signs in — skipping session persistence keeps the client from
      // writing auth keys to localStorage and refreshing tokens forever.
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 2 } },
    }),
  )
  return clientPromise
}
