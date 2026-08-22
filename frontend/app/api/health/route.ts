import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const [catRes, prodRes] = await Promise.all([
      supabase.from("categories").select("id").limit(1),
      supabase.from("products").select("id").limit(1),
    ]);

    const categoriesOk = !catRes.error;
    const productsOk = !prodRes.error;
    const missingTable =
      catRes.error?.message?.includes("schema cache") ||
      prodRes.error?.message?.includes("schema cache") ||
      catRes.error?.message?.includes("does not exist") ||
      prodRes.error?.message?.includes("does not exist");

    const [{ count: catCount }, { count: prodCount }] = await Promise.all([
      categoriesOk
        ? supabase.from("categories").select("*", { count: "exact", head: true })
        : Promise.resolve({ count: 0 }),
      productsOk
        ? supabase.from("products").select("*", { count: "exact", head: true })
        : Promise.resolve({ count: 0 }),
    ]);

    const ok = categoriesOk && productsOk;

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
      },
      hint: missingTable
        ? "Tables missing. Open Supabase → SQL Editor → paste frontend/sql/schema.sql → Run. Then open /api/health again."
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
        hint: "Check frontend/.env.local and restart npm run dev in the frontend folder.",
      },
      { status: 500 },
    );
  }
}
