import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const [catRes, prodRes, userRes, sessionRes, countryRes] = await Promise.all([
      supabase.from("categories").select("id").limit(1),
      supabase.from("products").select("id").limit(1),
      supabase.from("users").select("user_id").limit(1),
      supabase.from("user_session").select("id").limit(1),
      supabase.from("country").select("country_id").limit(1),
    ]);

    const categoriesOk = !catRes.error;
    const productsOk = !prodRes.error;
    const usersOk = !userRes.error;
    const sessionsOk = !sessionRes.error;
    const countriesOk = !countryRes.error;
    const missingTable =
      [catRes, prodRes, userRes, sessionRes, countryRes].some(
        (r) =>
          r.error?.message?.includes("schema cache") ||
          r.error?.message?.includes("does not exist"),
      );

    const [
      { count: catCount },
      { count: prodCount },
      { count: userCount },
      { count: sessionCount },
      { count: countryCount },
    ] = await Promise.all([
      categoriesOk
        ? supabase.from("categories").select("*", { count: "exact", head: true })
        : Promise.resolve({ count: 0 }),
      productsOk
        ? supabase.from("products").select("*", { count: "exact", head: true })
        : Promise.resolve({ count: 0 }),
      usersOk
        ? supabase.from("users").select("*", { count: "exact", head: true })
        : Promise.resolve({ count: 0 }),
      sessionsOk
        ? supabase.from("user_session").select("*", { count: "exact", head: true })
        : Promise.resolve({ count: 0 }),
      countriesOk
        ? supabase.from("country").select("*", { count: "exact", head: true })
        : Promise.resolve({ count: 0 }),
    ]);

    const ok =
      categoriesOk && productsOk && usersOk && sessionsOk && countriesOk;

    return NextResponse.json({
      ok,
      backend: "nextjs-app-router",
      database: "supabase",
      connected: true,
      checks: {
        categories: {
          ok: categoriesOk,
          count: catCount ?? 0,
          error: catRes.error?.message ?? null,
        },
        products: {
          ok: productsOk,
          count: prodCount ?? 0,
          error: prodRes.error?.message ?? null,
        },
        users: {
          ok: usersOk,
          count: userCount ?? 0,
          error: userRes.error?.message ?? null,
        },
        user_session: {
          ok: sessionsOk,
          count: sessionCount ?? 0,
          error: sessionRes.error?.message ?? null,
        },
        country: {
          ok: countriesOk,
          count: countryCount ?? 0,
          error: countryRes.error?.message ?? null,
        },
      },
      hint: missingTable
        ? "Tables missing. Run frontend/sql/schema.sql then frontend/sql/country-seed.sql in Supabase SQL Editor."
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
