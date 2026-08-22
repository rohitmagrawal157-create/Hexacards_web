"use client";

import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { faqs } from "./data";

// faqs shape expected in ./data:
// { question: string; answer: string }[]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(1);

  return (
    <section id="faqs" className="scroll-mt-20 bg-[#FFFCF6] pt-12 pb-16 sm:pt-16 sm:pb-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-16">
          {/* ── Left: heading + CTA ─────────────────── */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-1.5 text-sm font-semibold text-[#1a1a1a]">
              <Sparkles className="h-3.5 w-3.5 text-[#BC7C10]" />
              FAQ&apos;s
              <Sparkles className="h-3.5 w-3.5 text-[#BC7C10]" />
            </span>

            <h2 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-[#0f0f12] sm:text-5xl">
              Frequently Ask Questions
            </h2>

            <p className="mt-5 max-w-md text-base leading-relaxed text-[#7a7a82]">
              Everything you need to know about Hexa Cards — how it works,
              what&apos;s included, and how to get started.
            </p>

            
              <a href="#all-faqs"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#BC7C10] px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-md shadow-black/10 transition-transform active:scale-[0.98]"
            >
              Check More FAQ
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          {/* ── Right: accordion list ───────────────── */}
          <div className="flex flex-col gap-4">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={faq.question}
                  className="overflow-hidden rounded-2xl bg-white px-6 py-5 transition-colors"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-start justify-between gap-4 text-left"
                  >
                    <span className="text-lg font-bold leading-snug text-[#0f0f12] sm:text-xl">
                      Q. {faq.question}
                    </span>
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        isOpen
                          ? "border-transparent bg-[#BC7C10] text-white"
                          : "border-black/15 text-[#1a1a1a]"
                      }`}
                    >
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
                      ) : (
                        <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
                      )}
                    </span>
                  </button>

                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                      isOpen ? "mt-3 grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-base leading-relaxed text-[#6b6b73]">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}