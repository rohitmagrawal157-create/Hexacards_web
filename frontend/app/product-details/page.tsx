import { redirect } from "next/navigation";

/** Legacy route — NFC product lives at `/product`. */
export default function ProductDetailsRedirect() {
  redirect("/product");
}
