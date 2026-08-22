import { redirect } from "next/navigation";

/** Canonical NFC product page is `/product/nfc-business-card`. */
export default function ProductIndexRedirect() {
  redirect("/product/nfc-business-card");
}
