import { getSupabaseAdmin } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import {
  mapMessage,
  type MessageRow,
  type MessageWriteBody,
} from "@/lib/server/message-types";

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

async function findMessage(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  id: string,
): Promise<MessageRow | null> {
  const raw = String(id).trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("message_id", Number(raw))
      .maybeSingle();
    if (data) return data as MessageRow;
  }

  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("message_code", raw)
    .maybeSingle();
  return (data as MessageRow | null) ?? null;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);
    const supabase = getSupabaseAdmin();
    const row = await findMessage(supabase, id);
    if (!row) return jsonError(404, "Message not found");
    return jsonOk(mapMessage(row));
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);
    const body = (await request.json().catch(() => ({}))) as MessageWriteBody & {
      read?: boolean;
      markAllForOwner?: string;
    };
    const supabase = getSupabaseAdmin();

    // Bulk mark-all for an owner phone
    if (body.markAllForOwner) {
      const digits = String(body.markAllForOwner).replace(/\D/g, "").slice(-10);
      if (!digits) return jsonError(400, "owner phone required");
      const { error } = await supabase
        .from("messages")
        .update({ is_read: 1 })
        .eq("owner_phone", digits)
        .eq("is_read", 0);
      if (error) {
        return jsonError(500, "Failed to mark messages read", error.message);
      }
      return jsonOk({ markedAll: true, ownerPhone: digits });
    }

    const existing = await findMessage(supabase, id);
    if (!existing) return jsonError(404, "Message not found");

    const patch: Record<string, unknown> = {};
    if (body.isRead !== undefined || body.read !== undefined) {
      const read = body.isRead ?? body.read;
      patch.is_read = Boolean(read) && read !== 0 ? 1 : 0;
    }
    if (body.name !== undefined) patch.name = String(body.name).trim();
    if (body.email !== undefined) patch.email = String(body.email).trim();
    if (body.phone !== undefined) {
      patch.phone = String(body.phone).replace(/\D/g, "").slice(-10);
    }
    if (body.website !== undefined) {
      patch.website = String(body.website).trim();
    }
    if (body.message !== undefined) {
      patch.message = String(body.message).trim();
    }

    if (Object.keys(patch).length === 0) {
      return jsonError(400, "No fields to update");
    }

    const { data, error } = await supabase
      .from("messages")
      .update(patch)
      .eq("message_id", existing.message_id)
      .select("*")
      .maybeSingle();

    if (error) {
      return jsonError(500, "Failed to update message", error.message);
    }
    if (!data) return jsonError(404, "Message not found");
    return jsonOk(mapMessage(data as MessageRow));
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await Promise.resolve(context.params);
    const supabase = getSupabaseAdmin();
    const existing = await findMessage(supabase, id);
    if (!existing) return jsonError(404, "Message not found");

    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("message_id", existing.message_id);

    if (error) {
      return jsonError(500, "Failed to delete message", error.message);
    }
    return jsonOk({
      deleted: existing.message_code,
      messageId: existing.message_id,
    });
  } catch (err) {
    return jsonError(
      500,
      err instanceof Error ? err.message : "Server error",
    );
  }
}
