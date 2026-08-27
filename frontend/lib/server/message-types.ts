import type { CardMessage } from "@/lib/card-messages";

export type MessageRow = {
  message_id: number | string;
  user_id: number | string | null;
  name: string;
  email: string;
  phone: string;
  website: string;
  message: string;
  is_read: number;
  created_at: string;
  owner_phone: string;
  card_id: number | string | null;
  card_slug: string | null;
  message_code: string;
  updated_at?: string;
};

export type MessageWriteBody = {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  message?: string;
  ownerPhone?: string;
  owner_phone?: string;
  userId?: number | null;
  user_id?: number | null;
  cardId?: number | null;
  card_id?: number | null;
  cardSlug?: string | null;
  card_slug?: string | null;
  messageCode?: string;
  isRead?: boolean | number;
};

export function mapMessage(row: MessageRow): CardMessage & {
  messageId: number;
  ownerPhone: string;
  cardSlug: string | null;
  userId: number | null;
} {
  return {
    id: row.message_code,
    messageId: Number(row.message_id),
    name: row.name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    website: row.website ?? "",
    message: row.message ?? "",
    createdAt: row.created_at,
    read: Number(row.is_read) === 1,
    ownerPhone: row.owner_phone ?? "",
    cardSlug: row.card_slug,
    userId: row.user_id == null ? null : Number(row.user_id),
  };
}
