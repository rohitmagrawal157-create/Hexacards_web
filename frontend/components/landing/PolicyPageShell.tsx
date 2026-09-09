import Link from "next/link";
import { Navbar, Footer } from "@/components/landing";

export type PolicySection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

type PolicyPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt: string;
  sections: PolicySection[];
};

export default function PolicyPageShell({
  eyebrow,
  title,
  description,
  updatedAt,
  sections,
}: PolicyPageShellProps) {
  return (
    <div className="min-h-full bg-[#FFFCF7] text-[#141414]">
      <Navbar />
      <main className="flex-1">
        <div className="border-b border-black/[0.06] bg-white/80">
          <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
            <p className="text-xs font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#141414] sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 text-sm text-[#5c5346] sm:text-base">
              {description}
            </p>
            <p className="mt-3 text-xs text-[#8a8174]">
              Last updated: {updatedAt}
            </p>
          </div>
        </div>

        <article className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
          <div className="space-y-8">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-lg font-bold text-[#141414] sm:text-xl">
                  {section.heading}
                </h2>
                {section.paragraphs?.map((p, i) => (
                  <p
                    key={`${section.heading}-p-${i}`}
                    className="mt-3 text-sm leading-relaxed text-[#5c5346] sm:text-[15px]"
                  >
                    {p}
                  </p>
                ))}
                {section.bullets?.length ? (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#5c5346] sm:text-[15px]">
                    {section.bullets.map((item, i) => (
                      <li key={`${section.heading}-b-${i}`}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          <p className="mt-12 border-t border-black/[0.06] pt-6 text-sm text-[#5c5346]">
            Questions?{" "}
            <Link
              href="/contact"
              className="font-semibold text-[#BC7C10] hover:text-[#9a650d]"
            >
              Contact us
            </Link>{" "}
            or email{" "}
            <a
              href="mailto:info@hexacards.com"
              className="font-semibold text-[#BC7C10] hover:text-[#9a650d]"
            >
              info@hexacards.com
            </a>
            .
          </p>
        </article>
      </main>
      <Footer />
    </div>
  );
}
