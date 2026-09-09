import PolicyPageShell from "@/components/landing/PolicyPageShell";

export const metadata = {
  title: "Return & Refund Policy — HexaCards",
  description:
    "Returns, replacements, and refunds for Hexa Cards NFC business cards and accessories.",
};

export default function ReturnRefundPolicyPage() {
  return (
    <PolicyPageShell
      eyebrow="Useful links"
      title="Return & Refund Policy"
      description="Our guidelines for returns, replacements, and refunds on Hexa Cards products."
      updatedAt="9 September 2026"
      sections={[
        {
          heading: "Overview",
          paragraphs: [
            "We want you to be happy with your Hexa Cards order. Because many products are personalized or custom-printed, returns are limited. This policy explains when a return, replacement, or refund may apply.",
          ],
        },
        {
          heading: "Eligible cases",
          bullets: [
            "Wrong item shipped (different from what you ordered).",
            "Manufacturing defect or product damaged on arrival (report within 48 hours with photos).",
            "Missing items from the package compared to the invoice.",
          ],
        },
        {
          heading: "Non-returnable items",
          bullets: [
            "Custom-printed or personalized NFC cards once production has started or the card has been activated/linked, except for proven defects or shipping errors.",
            "Products that show misuse, damage after delivery, or alteration by the customer.",
            "Digital services or activated profiles that have been fully delivered, except where required by law.",
          ],
        },
        {
          heading: "How to raise a request",
          paragraphs: [
            "Email info@hexacards.com or call +91 9226286898 within 48 hours of delivery for damage/defect claims, or within 7 days for wrong-item claims. Include your order ID, issue description, and clear photos or video where relevant.",
          ],
        },
        {
          heading: "Inspection & resolution",
          paragraphs: [
            "After we review your request, we may arrange a pickup or ask you to return the item in original packing. Approved cases are typically resolved by replacement of the same product, or a refund to the original payment method when replacement is not possible.",
          ],
        },
        {
          heading: "Refund timelines",
          paragraphs: [
            "Once a refund is approved, it is usually initiated within 5–7 business days. Banks and payment partners may take additional time to credit your account. You will be notified when the refund is processed.",
          ],
        },
        {
          heading: "Cancellations",
          paragraphs: [
            "You may request cancellation before the order is dispatched or before custom production begins. Once printing or shipping has started, cancellation may not be available. Prepaid amounts for approved cancellations will be refunded as above.",
          ],
        },
        {
          heading: "Contact",
          paragraphs: [
            "For return or refund help: info@hexacards.com · +91 9226286898 · Hexa Cards, Plot No 42, G Sector, Town Center, Cidco, Chhatrapati Sambhajinagar, Maharashtra 431003.",
          ],
        },
      ]}
    />
  );
}
