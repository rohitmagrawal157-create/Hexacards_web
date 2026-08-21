import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url) {
  throw new Error("Missing SUPABASE_URL in backend/.env");
}

if (!serviceKey && !anonKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_ANON_KEY in backend/.env",
  );
}

export const supabase: SupabaseClient = createClient(url, serviceKey || anonKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export function assertSupabaseConfigured(): boolean {
  return Boolean(url && (serviceKey || anonKey));
}
