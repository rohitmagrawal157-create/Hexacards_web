import { Industries, Feature, HowItWorks, FAQ } from "@/components/landing";

/** Navbar → Services page content */
export default function NavServices() {
  return (
    <>
      <div className="border-b border-black/[0.06] bg-white/80">
        <div className="mx-auto max-w-6xl px-5 py-8 text-center sm:px-8 sm:py-10">
          <p className="text-xs font-bold tracking-[0.14em] text-[#BC7C10] uppercase">
            Services
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#141414] sm:text-4xl">
            Solutions for every industry
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-[#5c5346] sm:text-base">
            From enterprise teams to clinics and real estate — share your
            profile with one tap.
          </p>
        </div>
      </div>
      <Industries />
      <Feature />
      <HowItWorks />
      <FAQ />
    </>
  );
}
