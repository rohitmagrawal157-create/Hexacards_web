import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const [catRes, prodRes, userRes, sessionRes, countryRes, stateRes, cityRes, adminRes, themeRes, cardsRes] =
      await Promise.all([
        supabase.from("categories").select("id").limit(1),
        supabase.from("products").select("id").limit(1),
        supabase.from("users").select("user_id").limit(1),
        supabase.from("user_session").select("id").limit(1),
        supabase.from("country").select("country_id").limit(1),
        supabase.from("state").select("state_id").limit(1),
        supabase.from("city").select("city_id").limit(1),
        supabase.from("admin").select("aid").limit(1),
        supabase.from("card_theme").select("theme_id").limit(1),
        supabase.from("cards").select("card_id").limit(1),
      ]);

    const checksMeta = [
      ["categories", catRes],
      ["products", prodRes],
      ["users", userRes],
      ["user_session", sessionRes],
      ["country", countryRes],
      ["state", stateRes],
      ["city", cityRes],
      ["admin", adminRes],
      ["card_theme", themeRes],
      ["cards", cardsRes],
    ] as const;

    const missingTable = checksMeta.some(
      ([, r]) =>
        r.error?.message?.includes("schema cache") ||
        r.error?.message?.includes("does not exist"),
    );

    const countQueries = await Promise.all(
      checksMeta.map(async ([table, res]) => {
        if (res.error) return { table, ok: false, count: 0, error: res.error.message };
        const { count } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });
        return { table, ok: true, count: count ?? 0, error: null as string | null };
      }),
    );

    const ok = countQueries.every((c) => c.ok);
    const checks = Object.fromEntries(
      countQueries.map((c) => [
        c.table,
        { ok: c.ok, count: c.count, error: c.error },
      ]),
    );

    return NextResponse.json({
      ok,
      backend: "nextjs-app-router",
      database: "supabase",
      connected: true,
      checks,
      hint: missingTable
        ? "Tables missing. Run schema.sql then country-seed.sql → state-seed.sql → city-seed.sql in Supabase."
        : ok
          ? "Backend → Database → Frontend connected."
          : "Supabase reachable but queries failed. Check keys in frontend/.env.local.",
      time: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        backend: "nextjs-app-router",
        database: "supabase",
        connected: false,
        error: err instanceof Error ? err.message : "Server error",
        hint:
          process.env.VERCEL === "1"
            ? "Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY in Vercel → Settings → Environment Variables, then redeploy."
            : "Check frontend/.env.local and restart npm run dev in the frontend folder.",
      },
      { status: 500 },
    );
  }
}
