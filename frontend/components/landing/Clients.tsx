"use client";

import Image from "next/image";

const CLIENT_W = 120;
const CLIENT_H = 70;

/** Paths must match public/Images/clients filenames exactly (Linux/Vercel is case-sensitive). */
const clients = [
  { name: "Desale", logo: "/Images/clients/dsale.png" },
  { name: "Yugen", logo: "/Images/clients/yugen.png" },
  { name: "Advocate", logo: "/Images/clients/advocate.png" },
  { name: "Honda", logo: "/Images/clients/honda.png" },
  { name: "Hero", logo: "/Images/clients/hero.png" },
  { name: "TVS", logo: "/Images/clients/tvs.png" },
  { name: "Royal", logo: "/Images/clients/royal.png" },
  { name: "Sakal", logo: "/Images/clients/sakal.png" },
  { name: "CA India", logo: "/Images/clients/caindia.png" },
  { name: "HDFC Life", logo: "/Images/clients/hdfclife.png" },
  { name: "LIC", logo: "/Images/clients/lic.png" },
  { name: "Medicover", logo: "/Images/clients/medicover.png" },
  { name: "Angel", logo: "/Images/clients/angel.png" },
  { name: "BBG", logo: "/Images/clients/bbg.png" },
  { name: "Buzz", logo: "/Images/clients/buzz.png" },
  { name: "Sasmos", logo: "/Images/clients/sasmos.png" },
] as const;

const marqueeItems = [...clients, ...clients];

export default function Clients() {
  return (
    <section
      aria-label="Trusted by companies"
      className="bg-[#FFFCF7] pt-8 pb-6 sm:pt-10 sm:pb-8"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <p className="text-center text-xs font-bold tracking-[0.15em] text-[#BC7C10] uppercase sm:text-sm">
          Trusted by 500+ companies & 10,000+ professionals
        </p>
      </div>

      <div className="group relative mt-5 overflow-hidden sm:mt-6">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#FFFCF7] to-transparent sm:w-28" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#FFFCF7] to-transparent sm:w-28" />

        <div className="clients-marquee flex w-max items-center gap-14 group-hover:[animation-play-state:paused] sm:gap-20">
          {marqueeItems.map((client, index) => (
            <div
              key={`${client.name}-${index}`}
              className="flex h-[70px] w-[120px] shrink-0 items-center justify-center"
            >
              <Image
                src={client.logo}
                alt={`${client.name} logo`}
                width={CLIENT_W}
                height={CLIENT_H}
                className="h-[70px] w-[120px] object-contain opacity-90"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
