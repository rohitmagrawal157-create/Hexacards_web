import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import { mapCard } from "@/lib/server/card-types";
import { allocateCardSlugForName } from "@/lib/server/card-slug";
import {
  computeCardEndDateIso,
  toIsoDateOnly,
} from "@/lib/card-validity";
import {
  cardImageDbFields,
  saveCardImage,
} from "@/lib/server/card-image-storage";
import {
  buildOrderInsertPayload,
  mapOrder,
  type OrderRow,
} from "@/lib/server/order-types";
import { mapUser, normalizeMobile, USER_SAFE_COLS } from "@/lib/users-db";
import type { UserRow } from "@/lib/server/user-types";

type ProvisionBody = {
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  email?: string | null;
  mobile?: string;
  businessName?: string;
  business_name?: string;
  jobTitle?: string;
  job_title?: string;
  logoDataUrl?: string;
  logo_data_url?: string;
};

/**
 * POST /api/users/admin-provision
 * Create user + Digital Profile + QR order + card (with optional logo).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as ProvisionBody;

    const firstName = String(body.firstName ?? body.first_name ?? "").trim();
    const lastName = String(body.lastName ?? body.last_name ?? "").trim();
    const mobile = normalizeMobile(String(body.mobile ?? ""));
    const email = body.email ? String(body.email).trim() || null : null;
    const businessName = String(
      body.businessName ?? body.business_name ?? "",
    ).trim();
    const jobTitle = String(body.jobTitle ?? body.job_title ?? "").trim();
    const logoDataUrl = String(
      body.logoDataUrl ?? body.logo_data_url ?? "",
    ).trim();

    if (!firstName) return jsonError(400, "first_name is required");
    if (!/^\d{10}$/.test(mobile)) {
      return jsonError(400, "Valid 10-digit mobile number is required");
    }

    const supabase = getSupabaseAdmin();
    const customerName = [firstName, lastName].filter(Boolean).join(" ").trim();
    const displayName = businessName || customerName;

    const { data: existingUser } = await supabase
      .from("users")
      .select("user_id")
      .eq("mobile", mobile)
      .maybeSingle();
    if (existingUser?.user_id) {
      return jsonError(409, "mobile number already registered");
    }

    const { data: userRow, error: userErr } = await supabase
      .from("users")
      .insert({
        first_name: firstName,
        last_name: lastName,
        mobile,
        email,
        status: 1,
      })
      .select(USER_SAFE_COLS)
      .single();

    if (userErr || !userRow) {
      if (userErr?.code === "23505") {
        return jsonError(409, "mobile number already registered");
      }
      return jsonError(500, "Failed to create user", userErr?.message);
    }

    const userId = Number((userRow as UserRow).user_id);
    const orderCode = `HC-${Date.now().toString().slice(-8)}`;
    const cardSlug = await allocateCardSlugForName(supabase, customerName);
    const startDate = toIsoDateOnly(new Date());
    const endDate = computeCardEndDateIso(startDate, "digital-profile-qr");
    const cardUrl = `https://hexacards.com/${cardSlug}`;

    const { data: productRow } = await supabase
      .from("products")
      .select("product_id")
      .eq("slug", "digital-profile-qr")
      .maybeSingle();
    const productDbId =
      productRow?.product_id != null ? Number(productRow.product_id) : null;

    let logoFilename: string | null = null;
    if (logoDataUrl.startsWith("data:image/")) {
      try {
        const saved = await saveCardImage({
          username: cardSlug,
          kind: "profile",
          dataUrl: logoDataUrl,
        });
        logoFilename = saved.filename;
      } catch (err) {
        console.warn(
          "[admin-provision] logo save failed:",
          err instanceof Error ? err.message : err,
        );
      }
    }

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
        businessName: businessName || displayName,
        companyName: businessName || displayName,
        jobTitle,
        cardSlug,
        cardUrl,
        cardDesign: {
          cardBody: "black",
          finish: "gold",
          cardColor: "#141414",
          accentColor: "#BC7C10",
          name: displayName,
          subtitle: jobTitle || "Digital Profile + QR",
          logoSrc: logoFilename || undefined,
          liveUrl: cardUrl,
        },
        orderLogoSrc: logoFilename,
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
      await supabase.from("users").delete().eq("user_id", userId);
      return jsonError(500, "Failed to create order", orderErr?.message);
    }

    const logoDb = logoFilename
      ? cardImageDbFields("profile", logoFilename).logo
      : null;

    const { data: cardRow, error: cardErr } = await supabase
      .from("cards")
      .insert({
        unic_card_name: cardSlug,
        card_name: customerName,
        job_name: jobTitle || "Digital Profile + QR",
        business_name: customerName,
        user_id: userId,
        logo: logoDb,
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
      await supabase.from("orders").delete().eq("order_id", (orderRow as OrderRow).order_id);
      await supabase.from("users").delete().eq("user_id", userId);
      if (cardErr?.code === "23505") {
        return jsonError(409, "Card profile URL already exists — try again");
      }
      return jsonError(500, "Failed to create digital profile", cardErr?.message);
    }

    const cardId = Number(cardRow.card_id);
    const { error: linkErr } = await supabase
      .from("orders")
      .update({ card_id: cardId, card_slug: cardSlug, card_url: cardUrl })
      .eq("order_id", (orderRow as OrderRow).order_id);

    if (linkErr) {
      await supabase.from("cards").delete().eq("card_id", cardId);
      await supabase.from("orders").delete().eq("order_id", (orderRow as OrderRow).order_id);
      await supabase.from("users").delete().eq("user_id", userId);
      return jsonError(500, "Failed to link order to card", linkErr.message);
    }

    const order = mapOrder({
      ...(orderRow as OrderRow),
      card_id: cardId,
      card_slug: cardSlug,
      card_url: cardUrl,
    });

    return jsonOk(
      {
        user: mapUser(userRow as UserRow),
        order,
        card: mapCard(cardRow),
        slug: cardSlug,
        liveUrl: cardUrl,
      },
      201,
    );
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Server error");
  }
}
