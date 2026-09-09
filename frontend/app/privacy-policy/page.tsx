import PolicyPageShell from "@/components/landing/PolicyPageShell";

export const metadata = {
  title: "Privacy Policy — HexaCards",
  description:
    "How Hexa Cards collects, uses, and protects your personal information when you order NFC digital business cards and related services.",
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyPageShell
      eyebrow="Useful links"
      title="Privacy Policy"
      description="This policy explains what information we collect, how we use it, and the choices you have when you use Hexa Cards."
      updatedAt="9 September 2026"
      sections={[
        {
          heading: "Who we are",
          paragraphs: [
            "Hexa Cards (“we”, “us”, “our”) provides NFC digital business cards, related accessories, and digital profile services. Our office is at Plot No 42, G Sector, opposite Medicover Hospital, Town Center, Cidco, Chhatrapati Sambhajinagar, Maharashtra 431003. You can reach us at info@hexacards.com or +91 9226286898.",
          ],
        },
        {
          heading: "Information we collect",
          paragraphs: [
            "We collect information you provide when you browse our site, place an order, create or edit a digital card, contact support, or apply for a franchise.",
          ],
          bullets: [
            "Identity and contact details such as name, email, phone number, and shipping address.",
            "Order and payment-related details (payment is processed by our payment partners; we do not store full card numbers).",
            "Card profile content you upload or enter (logo, photos, business details, links).",
            "Technical data such as IP address, browser type, and pages visited, used to run and improve the website.",
          ],
        },
        {
          heading: "How we use your information",
          bullets: [
            "To process and deliver orders, and to set up or update your digital card profile.",
            "To send order updates, support replies, and important account notices.",
            "To improve our products, website, and customer experience.",
            "To meet legal, tax, and fraud-prevention requirements.",
          ],
        },
        {
          heading: "Sharing of information",
          paragraphs: [
            "We do not sell your personal information. We may share limited data with trusted partners who help us operate — for example courier partners, payment gateways, hosting/storage providers, and SMS or email services — only as needed to fulfill your order or run the service. We may also disclose information if required by law.",
          ],
        },
        {
          heading: "Data retention and security",
          paragraphs: [
            "We keep order and account records for as long as needed for service, legal, and accounting purposes. We use reasonable technical and organizational measures to protect your data. No method of transmission or storage is 100% secure; please use a strong password and keep your login details private.",
          ],
        },
        {
          heading: "Your choices",
          paragraphs: [
            "You may request access, correction, or deletion of personal data we hold about you, subject to legal retention needs. To make a request, email info@hexacards.com. You can also update card profile details from your dashboard where available.",
          ],
        },
        {
          heading: "Cookies",
          paragraphs: [
            "Our site may use cookies or similar technologies for session management, preferences, and analytics. You can control cookies through your browser settings; some features may not work fully if cookies are disabled.",
          ],
        },
        {
          heading: "Updates to this policy",
          paragraphs: [
            "We may update this Privacy Policy from time to time. The “Last updated” date at the top will change when we do. Continued use of our site after updates means you accept the revised policy.",
          ],
        },
      ]}
    />
  );
}
