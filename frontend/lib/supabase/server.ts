import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

function getSupabaseUrl(): string | undefined {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  );
}

function getSupabaseKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  );
}

/**
 * Server Supabase client for Next.js Route Handlers.
 * Prefer SUPABASE_SERVICE_ROLE_KEY for admin CRUD (bypasses RLS).
 * Falls back to publishable / anon key for read access.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = getSupabaseUrl();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const key = getSupabaseKey();

  if (!url || !key) {
    throw new Error(
      "Missing Supabase config. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (and SUPABASE_SERVICE_ROLE_KEY for writes) in frontend/.env.local",
    );
  }

  if (!serviceRole && process.env.NODE_ENV !== "production") {
    console.warn(
      "[supabase] SUPABASE_SERVICE_ROLE_KEY is missing — writes may fail under RLS. Using anon/publishable key.",
    );
  }

  cached = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cached;
}
