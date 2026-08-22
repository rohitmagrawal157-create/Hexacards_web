export type NavChild = {
  label: string;
  href: string;
};

export type NavLink = {
  label: string;
  href: string;
  children?: NavChild[];
};

export const navLinks: NavLink[] = [
  {
    label: "Digital Business Card",
    href: "/product/nfc-business-card",
    children: [
      { label: "NFC Business Card", href: "/product/nfc-business-card" },
      { label: "Metal Card", href: "/product/metal-card" },
      { label: "PVC Card", href: "/product/pvc-card" },
      // { label: "Wooden Card", href: "/product/wooden-card" },
    ],
  },
  {
    label: "For Reviews",
    href: "/product/social-media-cards",
    children: [
      // { label: "Social Media Cards", href: "/product/social-media-cards" },
      { label: "Google Review Cards", href: "/product/google-review-card" },
      { label: "Instagram Card", href: "/product/instagram-card" },
      { label: "YouTube Card", href: "/product/youtube-card" },
      { label: "Review Standee", href: "/product/google-review-standee" },
      { label: "Instagram Standee", href: "/product/instagram-standee" },
      { label: "YouTube Standee", href: "/product/youtube-standee" },
      { label: "Review Keychain QR", href: "/product/review-keychain-qr" },
    ],
  },
  { label: "Products", href: "/products" },
  { label: "Franchise", href: "/franchise" },
  { label: "Services", href: "/services" },
  { label: "Contact Us", href: "/contact" },
];


export const clients = [
  "Northline",
  "Vespera",
  "Cobalt Forge",
  "Lumen Health",
  "Arcadia Labs",
  "Kinetic Ops",
] as const;

export const products = [
  {
    title: "Digital Profile + QR",
    description: "NFC + QR digital identity",
    price: "₹999",
    image: "/Images/Products/digitalCard.png",
  },
  {
    title: "QR Code",
    description: "Instant scan-to-connect",
    price: "₹749",
    image: "/Images/Products/QR.png",
  },
  {
    title: "Social Media Cards",
    description: "Get more Google reviews",
    price: "₹ 799",
    image: "/Images/Products/googleReview.png",
  },
  {
    title: "Review Stand",
    description: "Collect reviews on your counter",
    price: "₹699",
    image: "/Images/Products/reviewStandy.png",
  },
];

export const steps = [
  {
    step: "1",
    title: "Tap or Scan",
    description: "Tap your Hexa Card or scan the QR code",
    image: "/stack/card-1.svg",
  },
  {
    step: "2",
    title: "Share Instantly",
    description: "Your digital profile opens instantly on their phone",
    image: "/stack/card-2.svg",
  },
  {
    step: "3",
    title: "Connect & Grow",
    description: "Save contact, follow, enquire or do business",
    image: "/stack/card-3.svg",
  },
];
export const reasons = [
  {
    title: "Unlimited Updates",
    description: "Update anytime, anywhere",
  },
  {
    title: "NFC + QR Enabled",
    description: "Works on all smartphones",
  },
  {
    title: "Works Offline",
    description: "Share even without internet",
  },
  {
    title: "Real-time Analytics",
    description: "Track views, saves and leads",
  },
  {
    title: "Lead Collection",
    description: "Capture quality leads instantly",
  },
  {
    title: "Team Management",
    description: "Manage multiple team members",
  },
  {
    title: "Eco Friendly",
    description: "Reusable & environment friendly",
  },
  {
    title: "Premium Designs",
    description: "Luxury Cards for professionals",
  },
];

export const industries = [
  {
    name: "Enterprise teams",
    detail: "Org charts that people actually open.",
  },
  // {
  //   name: "Healthcare",
  //   detail: "Care teams and clinic contacts, clear and calm.",
  // },
  {
    name: "Events & venues",
    detail: "Speakers, staff, and sponsors on every screen.",
  },
  {
    name: "Education",
    detail: "Faculty and cohort directories students can tap.",
  },
  {
    name: "Real estate",
    detail: "Agent cards that feel premium in the field.",
  },
  {
    name: "Agencies",
    detail: "Client-facing rosters with brand-level polish.",
  },
] as const;

export const testimonials = [
  {
    name: "Rakesh Patel",
    role: "Real Estate Consultant",
    rating: 5,
    quote:
      "Hexa Cards has completely changed the way I network. More leads, more business!",
  },
  {
    name: "Dr. Anjali Verma",
    role: "MBBS, BIO",
    rating: 5,
    quote: "Getting patient reviews is now so easy with Hexa Review Standee.",
  },
  {
    name: "Vikram Singh",
    role: "Business Owner",
    rating: 5,
    quote: "Premium quality cards with excellent support. Highly recommended!",
  },
  {
    name: "Sneha Kapoor",
    role: "Marketing Manager",
    rating: 5,
    quote: "Analytics feature helps me track my networking growth.",
  },
];

export const faqs = [
  {
    question: "What is Hexa Cards?",
    answer: "Hexa Cards is a digital NFC business card that lets you share your contact and social profiles instantly with a single tap.",
  },
  {
    question: "How does NFC business card work?",
    answer: "Simply tap your Hexa Card on any NFC-enabled smartphone and your digital profile opens instantly — no app required.",
  },
  {
    question: "Does it work on iPhone?",
    answer: "Yes, Hexa Cards works seamlessly on both iPhone and Android devices.",
  },
  {
    question: "Do I need an app to use Hexa Cards?",
    answer: "No app is needed for the person receiving your card — they just tap or scan and your profile opens in their browser.",
  },
  {
    question: "Can I update my profile anytime?",
    answer: "Yes, you can update your profile information anytime and changes reflect instantly without reprinting your card.",
  },
  {
    question: "How is it better than paper cards?",
    answer: "Unlike paper cards, Hexa Cards are reusable, eco-friendly, always up to date, and let you track engagement with analytics.",
  },
  {
    question: "What if my phone has no internet?",
    answer: "Your basic profile details can still be shared via NFC even without an active internet connection.",
  },
  {
    question: "Is Hexa Cards safe and secure?",
    answer: "Yes, your data is encrypted and you have full control over what information is shared on your profile.",
  },
  {
    question: "Do you offer bulk or corporate orders?",
    answer: "Yes, we offer bulk ordering and team management features for corporate clients — reach out to our enterprise team for details.",
  },
];

export const footerLinks = {
  product: [
    { label: "NFC Business Card", href: "/product/nfc-business-card" },
    { label: "Metal Card", href: "/product/metal-card" },
    { label: "PVC Card", href: "/product/pvc-card" },
    { label: "Wooden Card", href: "/product/wooden-card" },
  ],
  solutions: [
    { label: "Social Media Cards", href: "/product/social-media-cards" },
    { label: "Google Review Cards", href: "/product/google-review-card" },
    { label: "Instagram Card", href: "/product/instagram-card" },
    { label: "YouTube Card", href: "/product/youtube-card" },
    { label: "Review Standee", href: "/product/google-review-standee" },
    { label: "Google Standee", href: "/product/google-standee" },
    { label: "Instagram Standee", href: "/product/instagram-standee" },
    { label: "YouTube Standee", href: "/product/youtube-standee" },
    { label: "Review Keychain QR", href: "/product/review-keychain-qr" },
    { label: "Services", href: "/services" },
    { label: "Design Your Card", href: "/design-your-card" },
  ],
  company: [
    { label: "Home", href: "/" },
    { label: "Contact", href: "/contact" },
    { label: "Products", href: "/products" },
    { label: "Services", href: "/services" },
  ],
  support: [
    { label: "FAQs", href: "/#faqs" },
    { label: "Contact Us", href: "/contact" },
    { label: "Design Card", href: "/design-your-card" },
    { label: "Checkout", href: "/checkout" },
  ],
};
