import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const CORE_TABLES = [
  "categories",
  "products",
  "users",
  "user_session",
  "country",
  "state",
  "city",
  "admin",
  "card_theme",
  "cards",
  "links",
  "orders",
  "order_items",
  "payments",
  "reviews",
  "messages",
] as const;

const EXTRA_TABLES = ["coupons", "home_offers", "site_enquiries"] as const;

const ORDERS_REQUIRED_COLUMNS = [
  "order_id",
  "order_code",
  "status",
  "payment_status",
  "mobile_number",
  "name",
  "amount",
  "ord_date",
] as const;

function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

function supabaseUrlConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
  );
}

export async function GET() {
  try {
    if (!supabaseUrlConfigured() || !hasServiceRoleKey()) {
      return NextResponse.json(
        {
          ok: false,
          backend: "nextjs-app-router",
          database: "supabase",
          connected: false,
          config: {
            supabaseUrl: supabaseUrlConfigured(),
            serviceRoleKey: hasServiceRoleKey(),
          },
          error: "Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY",
          hint:
            "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local (and Vercel), then restart.",
          time: new Date().toISOString(),
        },
        { status: 500 },
      );
    }

    const supabase = getSupabaseAdmin();

    const allTables = [...CORE_TABLES, ...EXTRA_TABLES];
    const probes = await Promise.all(
      allTables.map(async (table) => {
        const { error } = await supabase.from(table).select("*").limit(1);
        if (error) {
          return {
            table,
            ok: false,
            count: 0,
            error: error.message,
            optional: (EXTRA_TABLES as readonly string[]).includes(table),
          };
        }
        const { count } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });
        return {
          table,
          ok: true,
          count: count ?? 0,
          error: null as string | null,
          optional: (EXTRA_TABLES as readonly string[]).includes(table),
        };
      }),
    );

    // Column-level probe for orders (schema drift breaks checkout)
    const { data: sampleOrder, error: orderColErr } = await supabase
      .from("orders")
      .select(ORDERS_REQUIRED_COLUMNS.join(","))
      .limit(1)
      .maybeSingle();

    const missingOrderColumns: string[] = [];
    if (orderColErr?.message) {
      const m = orderColErr.message.match(/'([^']+)' column/i);
      if (m?.[1]) missingOrderColumns.push(m[1]);
      else missingOrderColumns.push(orderColErr.message);
    }

    // Detect mistaken PK column named `orders` (legacy broken schema)
    const { error: badPkProbe } = await supabase
      .from("orders")
      .select("orders")
      .limit(1);
    const hasLegacyOrdersPkColumn = !badPkProbe;

    const coreOk = probes
      .filter((p) => !p.optional)
      .every((p) => p.ok);
    const ok =
      coreOk &&
      missingOrderColumns.length === 0 &&
      !hasLegacyOrdersPkColumn;

    const checks = Object.fromEntries(
      probes.map((c) => [
        c.table,
        {
          ok: c.ok,
          count: c.count,
          error: c.error,
          ...(c.optional ? { optional: true } : {}),
        },
      ]),
    );

    const hints: string[] = [];
    if (missingOrderColumns.length) {
      hints.push(
        `orders missing columns: ${missingOrderColumns.join(", ")}. Run frontend/sql/orders-fix-live-schema.sql`,
      );
    }
    if (hasLegacyOrdersPkColumn) {
      hints.push(
        "orders still has legacy `orders` column (broken PK). Run frontend/sql/orders-fix-live-schema.sql",
      );
    }
    if ((checks.order_items as { count?: number })?.count === 0) {
      hints.push(
        "order_items is empty — new order line-items may be failing FK to orders.order_id",
      );
    }
    const optionalFail = probes.filter((p) => p.optional && !p.ok);
    if (optionalFail.length) {
      hints.push(
        `optional tables missing: ${optionalFail.map((p) => p.table).join(", ")}`,
      );
    }

    return NextResponse.json({
      ok,
      backend: "nextjs-app-router",
      database: "supabase",
      connected: true,
      config: {
        supabaseUrl: true,
        serviceRoleKey: true,
      },
      flow: {
        frontend: "browser → /api/* (same-origin)",
        backend: "Next.js App Router route handlers",
        database: "Supabase Postgres via service role",
      },
      checks,
      ordersSchema: {
        ok: missingOrderColumns.length === 0 && !hasLegacyOrdersPkColumn,
        requiredColumns: ORDERS_REQUIRED_COLUMNS,
        missingColumns: missingOrderColumns,
        hasLegacyOrdersPkColumn,
        sampleHasRow: Boolean(sampleOrder),
      },
      hint:
        hints[0] ||
        (ok
          ? "Backend → Database → Frontend connected."
          : "Supabase reachable but some checks failed."),
      hints,
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
        time: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
