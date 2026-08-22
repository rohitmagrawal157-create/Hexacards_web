type Step = {
  number: string;
  title: string;
  description: string;
  image: string;
  alt: string;
};

const ACCENT = "#BC7C10";

const steps: Step[] = [
  {
    number: "01",
    title: "Get Your Product",
    description:
      "Customise your Hexa Card with your photo, logo, and style. Choose your premium material and make it uniquely yours.",
    image: "/Images/step1.webp",
    alt: "Get your Hexa Card product",
  },
  {
    number: "02",
    title: "Hexa Digital Profile",
    description:
      "Fully customise your digital profile, update anytime by logging in to your dashboard. Add all your details and links, then share with your network.",
    image: "/Images/step2.webp",
    alt: "Hexa Cards digital profile",
  },
  {
    number: "03",
    title: "Share Your Details With Anyone, Any Way",
    description:
      "One tap. One scan. One link. Your info, shared in seconds — no app required.",
    image: "/Images/step3.webp",
    alt: "Share your details with anyone",
  },
];

function StepCard({ item }: { item: Step }) {
  return (
    <div
      className="group relative overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white/80 p-6 text-center backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:border-gray-200 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] lg:p-8"
      style={{ "--step-accent": ACCENT } as React.CSSProperties}
    >
      {/* Ghost background number — CSS var is defined on this card (the
          ancestor), so both this element and the content below can read
          it via group-hover:text-[color:var(--step-accent)]. */}
      <div
        className="pointer-events-none absolute bottom-4 left-1/2 z-0 -translate-x-1/2 text-[12rem] font-black leading-none text-gray-100 transition-all duration-700 group-hover:text-[color:var(--step-accent)] group-hover:opacity-[0.12]"
        aria-hidden
      >
        {item.number}
      </div>

      <div className="relative z-10 flex h-full flex-col">
        {/* Product photo */}
        <div className="mb-8 aspect-[4/3] w-full overflow-hidden rounded-[1.5rem] bg-white ring-1 ring-gray-100/50 transition-shadow duration-500 group-hover:shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image}
            alt={item.alt}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>

        {/* Numbered badge — background fades in on hover behind the
            number, text switches from accent to white at the same time */}
        <div
          className="relative mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-gray-100 bg-gray-50 transition-colors duration-500 group-hover:border-transparent group-hover:bg-[#BC7C10]"
        >
          <span
            className="relative z-10 text-lg font-bold transition-colors duration-500 group-hover:text-white"
            style={{ color: ACCENT }}
          >
            {item.number.replace(/^0/, "")}
          </span>
        </div>

        <h3 className="mb-3 text-2xl font-bold tracking-tight text-gray-900">
          {item.title}
        </h3>
        <p className="mx-auto max-w-[280px] text-base leading-relaxed text-gray-500">
          {item.description}
        </p>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-20 overflow-hidden bg-white py-20 sm:py-24"
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center lg:mb-20">
          <h2 className="text-4xl font-bold leading-tight tracking-tight text-gray-900 lg:text-5xl">
            How Hexa Cards Works
          </h2>
          <p className="mt-4 text-lg text-gray-500 lg:text-xl">
            Three simple steps to revolutionize your networking experience
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:gap-10">
          {steps.map((step) => (
            <StepCard key={step.number} item={step} />
          ))}
        </div>
      </div>
    </section>
  );
}