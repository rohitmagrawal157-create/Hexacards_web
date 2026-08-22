import { redirect } from "next/navigation";

/** Legacy standy route → standee category */
export default function GoogleReviewStandyRedirect() {
  redirect("/product/google-review-standee");
}
