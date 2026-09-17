import type { getSupabaseAdmin } from "@/lib/supabase/server";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

/**
 * Resolve a valid users.user_id for FK columns.
 * Stale browser auth userIds (after users wipe) must not be written —
 * they break orders/payments inserts with foreign-key errors.
 */
export async function resolveExistingUserId(
  supabase: SupabaseAdmin,
  opts: {
    explicit?: number | null;
    phone?: string | null;
  },
): Promise<number | null> {
  const explicit = Number(opts.explicit);
  if (Number.isInteger(explicit) && explicit > 0) {
    const { data } = await supabase
      .from("users")
      .select("user_id")
      .eq("user_id", explicit)
      .maybeSingle();
    if (data?.user_id != null) return Number(data.user_id);
  }

  const digits = String(opts.phone || "")
    .replace(/\D/g, "")
    .slice(-10);
  if (!digits) return null;

  const { data } = await supabase
    .from("users")
    .select("user_id")
    .eq("mobile", digits)
    .maybeSingle();
  return data?.user_id != null ? Number(data.user_id) : null;
}
