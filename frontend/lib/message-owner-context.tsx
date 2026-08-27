import { createContext, useContext } from "react";

export type MessageOwnerContextValue = {
  /** Card owner phone (10 digits) — required for inbox routing */
  ownerPhone?: string;
  userId?: number | null;
  cardId?: number | null;
  cardSlug?: string | null;
};

export const MessageOwnerContext = createContext<MessageOwnerContextValue>({});

export function useMessageOwner() {
  return useContext(MessageOwnerContext);
}
