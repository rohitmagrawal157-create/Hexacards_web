import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import { mapCard } from "@/lib/server/card-types";
import { allocateCardSlugForName } from "@/lib/server/card-slug";
import { buildPublicCardUrl } from "@/lib/site-url";
import {
  computeCardEndDateIso,
  toIsoDateOnly,
} from "@/lib/card-validity";
import {
  buildOrderInsertPayload,
  mapOrder,
  type OrderRow,
} from "@/lib/server/order-types";
import { mapUser, normalizeMobile, USER_SAFE_COLS } from "@/lib/users-db";
import type { UserRow } from "@/lib/server/user-types";

type Body = {
  userId?: number | string;
  user_id?: number | string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  email?: string | null;
  mobile?: string;
  jobTitle?: string;
  job_title?: string;
  businessName?: string;
  business_name?: string;
};

/**
 * POST /api/cards/admin-create
 * Add a Digital Profile + QR card for an EXISTING user (Super Admin).
 * Creates cards row first, then offline paid order already linked (card_id set).
 * Appears on that user's dashboard as Offline — one tile only.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    const userId = Number(body.userId ?? body.user_id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return jsonError(400, "user_id is required");
    }

    const supabase = getSupabaseAdmin();
    const { data: userRow, error: userErr } = await supabase
      .from("users")
      .select(USER_SAFE_COLS)
      .eq("user_id", userId)
      .maybeSingle();

    if (userErr) {
      return jsonError(500, "Failed to load user", userErr.message);
    }
    if (!userRow) {
      return jsonError(404, "User not found");
    }

    const user = userRow as UserRow;
    const firstName =
      String(body.firstName ?? body.first_name ?? "").trim() ||
      String(user.first_name ?? "").trim() ||
      "User";
    const lastName =
      String(body.lastName ?? body.last_name ?? "").trim() ||
      String(user.last_name ?? "").trim();
    const mobile =
      normalizeMobile(String(body.mobile ?? "")) ||
      normalizeMobile(String(user.mobile ?? ""));
    const emailRaw = body.email !== undefined ? body.email : user.email;
    const email = emailRaw ? String(emailRaw).trim() || null : null;
    const jobTitle = String(body.jobTitle ?? body.job_title ?? "").trim();
    const businessName = String(
      body.businessName ?? body.business_name ?? "",
    ).trim();

    if (!/^\d{10}$/.test(mobile)) {
      return jsonError(400, "Valid 10-digit mobile number is required");
    }

    const customerName = [firstName, lastName].filter(Boolean).join(" ").trim();
    const displayName = businessName || customerName;
    const orderCode = `HC-${Date.now().toString().slice(-8)}`;
    const cardSlug = await allocateCardSlugForName(supabase, customerName);
    const startDate = toIsoDateOnly(new Date());
    const endDate = computeCardEndDateIso(startDate, "digital-profile-qr");
    const cardUrl = buildPublicCardUrl(cardSlug, "canonical");

    const { data: productRow } = await supabase
      .from("products")
      .select("product_id")
      .eq("slug", "digital-profile-qr")
      .maybeSingle();
    const productDbId =
      productRow?.product_id != null ? Number(productRow.product_id) : null;

    // 1) Create card first so the order can insert with card_id already set
    //    (avoids a follow-up update that can silently match 0 rows → duplicate My Cards).
    const { data: cardRow, error: cardErr } = await supabase
      .from("cards")
      .insert({
        unic_card_name: cardSlug,
        card_name: customerName,
        job_name: jobTitle || "Digital Profile + QR",
        business_name: customerName,
        user_id: userId,
        logo: null,
        bg_img: null,
        bg_url: null,
        theme_id: 1,
        mobile,
        email,
        code: "91",
        whatsapp: mobile,
        address: null,
        about: null,
        about_company: null,
        services: null,
        brochure: null,
        page_view: 0,
        start_date: startDate,
        end_date: endDate,
        status: 1,
      })
      .select("*")
      .single();

    if (cardErr || !cardRow) {
      if (cardErr?.code === "23505") {
        return jsonError(409, "Card profile URL already exists — try again");
      }
      return jsonError(500, "Failed to create card", cardErr?.message);
    }

    const cardId = Number(cardRow.card_id);
    if (!Number.isInteger(cardId) || cardId <= 0) {
      await supabase.from("cards").delete().eq("card_id", cardRow.card_id);
      return jsonError(500, "Failed to create card — invalid card_id");
    }

    // 2) Insert order already linked to the card
    const orderPayload = buildOrderInsertPayload(
      {
        id: orderCode,
        customerName,
        name: customerName,
        phone: mobile,
        mobileNumber: mobile,
        ownerPhone: mobile,
        email: email ?? "",
        productId: "digital-profile-qr",
        productSlug: "digital-profile-qr",
        productTitle: "Digital Profile + QR",
        packTitle: "Digital Profile + QR",
        qty: 1,
        subtotal: 0,
        discount: 0,
        total: 0,
        amount: 0,
        paymentStatus: "paid",
        paymentMethod: "admin",
        status: "placed",
        businessName: displayName,
        companyName: displayName,
        jobTitle,
        cardId,
        cardSlug,
        cardUrl,
        cardDesign: {
          cardBody: "black",
          finish: "gold",
          cardColor: "#141414",
          accentColor: "#BC7C10",
          name: displayName,
          subtitle: jobTitle || "Digital Profile + QR",
          liveUrl: cardUrl,
        },
        userId,
      },
      { orderCode, userId, productDbId },
    );

    const { data: orderRow, error: orderErr } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select("*")
      .single();

    if (orderErr || !orderRow) {
      await supabase.from("cards").delete().eq("card_id", cardId);
      return jsonError(500, "Failed to create offline order", orderErr?.message);
    }

    const linkedCardId =
      (orderRow as OrderRow).card_id != null
        ? Number((orderRow as OrderRow).card_id)
        : null;
    if (linkedCardId !== cardId) {
      // Hard repair if insert dropped card_id
      const { data: repaired, error: repairErr } = await supabase
        .from("orders")
        .update({ card_id: cardId, card_slug: cardSlug, card_url: cardUrl })
        .eq("order_id", (orderRow as OrderRow).order_id)
        .select("order_id, card_id")
        .maybeSingle();
      if (repairErr || Number(repaired?.card_id) !== cardId) {
        await supabase.from("orders").delete().eq("order_id", (orderRow as OrderRow).order_id);
        await supabase.from("cards").delete().eq("card_id", cardId);
        return jsonError(
          500,
          "Failed to link order to card",
          repairErr?.message || "card_id not persisted on order",
        );
      }
    }

    const order = mapOrder({
      ...(orderRow as OrderRow),
      card_id: cardId,
      card_slug: cardSlug,
      card_url: cardUrl,
    });

    return jsonOk(
      {
        user: mapUser(user),
        order,
        card: mapCard(cardRow),
        slug: cardSlug,
        liveUrl: cardUrl,
        expiryYears: 25,
        startDate,
        endDate,
      },
      201,
    );
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}
