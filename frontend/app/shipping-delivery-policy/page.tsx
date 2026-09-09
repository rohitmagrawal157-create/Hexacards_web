import PolicyPageShell from "@/components/landing/PolicyPageShell";

export const metadata = {
  title: "Shipping & Delivery Policy — HexaCards",
  description:
    "Shipping timelines, delivery areas, and tracking for Hexa Cards NFC business cards and accessories across India.",
};

export default function ShippingDeliveryPolicyPage() {
  return (
    <PolicyPageShell
      eyebrow="Useful links"
      title="Shipping & Delivery Policy"
      description="How we pack, ship, and deliver Hexa Cards products after your order is confirmed."
      updatedAt="9 September 2026"
      sections={[
        {
          heading: "Service area",
          paragraphs: [
            "We ship Hexa Cards products across India. Delivery timelines may vary by pin code, courier availability, and local conditions. For bulk or franchise orders, timelines will be confirmed separately.",
          ],
        },
        {
          heading: "Order processing",
          paragraphs: [
            "Orders are processed after successful payment confirmation. Custom or designed cards may need extra production time for printing and quality checks. You will receive updates by SMS, WhatsApp, or email where contact details are available.",
          ],
          bullets: [
            "Standard / ready products: typically processed within 1–3 business days.",
            "Custom printed or personalized cards: typically processed within 3–7 business days after design approval.",
            "Business days exclude Sundays and public holidays.",
          ],
        },
        {
          heading: "Delivery timelines",
          paragraphs: [
            "After dispatch, courier transit usually takes 3–7 business days depending on your location. Remote areas may take longer. Estimated dates shown at checkout or in order updates are indicative, not guaranteed.",
          ],
        },
        {
          heading: "Shipping charges",
          paragraphs: [
            "Shipping charges (if any) are shown before you pay. Free shipping offers, if active, will be applied automatically at checkout or communicated on the product page.",
          ],
        },
        {
          heading: "Tracking",
          paragraphs: [
            "Once your order is shipped, we share tracking details when provided by the courier. Please keep your phone reachable so delivery attempts succeed.",
          ],
        },
        {
          heading: "Failed delivery & address issues",
          paragraphs: [
            "Please ensure your shipping address and phone number are correct. If a delivery fails due to an incorrect address, unreachable recipient, or refusal, re-shipping may attract additional charges. Contact us promptly at info@hexacards.com or +91 9226286898 if you need to update an address before dispatch.",
          ],
        },
        {
          heading: "Damage in transit",
          paragraphs: [
            "If your package arrives damaged, share clear photos of the outer packing and product within 48 hours of delivery so we can assist with a replacement or resolution as applicable under our Return & Refund Policy.",
          ],
        },
      ]}
    />
  );
}
