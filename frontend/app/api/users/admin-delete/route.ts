import { jsonError, jsonOk } from "@/lib/admin-catalog-db";
import { deleteUserForAdmin } from "@/lib/server/user-admin-delete";

export const runtime = "nodejs";

type AdminDeleteBody = {
  adminId?: string;
};

/**
 * POST /api/users/admin-delete
 * Super Admin removes a user, their cards, and hides orders on user dashboard.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as AdminDeleteBody;
    const adminId = String(body.adminId ?? "").trim();
    if (!adminId) {
      return jsonError(400, "adminId is required");
    }

    const result = await deleteUserForAdmin(adminId);
    return jsonOk(result);
  } catch (err) {
    return jsonError(500, err instanceof Error ? err.message : "Delete failed");
  }
}
