"use client";

import { Home, type LucideIcon } from "lucide-react";
import type { IconType } from "react-icons";
import CardContactForm from "@/components/user-dashboard/CardContactForm";
import CardLayoutFooter from "./CardLayoutFooter";

export type CardBottomSocialLink = {
  label: string;
  Icon: LucideIcon | IconType;
  href: string;
};

type CardLayoutBottomProps = {
  accent: string;
  accentMuted: string;
  about: string;
  services: string[];
  socialLinks: CardBottomSocialLink[];
  showContactForm?: boolean;
  showBusiness?: boolean;
  showSocials?: boolean;
};

/**
 * Classic-style bottom content + shared Hexa footer.
 * Other layouts can use CardLayoutFooter alone and keep their own middle sections.
 */
export default function CardLayoutBottom({
  accent,
  accentMuted,
  about,
  services,
  socialLinks,
  showContactForm = true,
  showBusiness = true,
  showSocials = true,
}: CardLayoutBottomProps) {
  return (
    <>
      {showBusiness ? (
        <div
          className="mx-4 mb-5 rounded-2xl border bg-white p-4"
          style={{ borderColor: accentMuted }}
        >
          <div className="flex items-center gap-2">
            <Home
              className="h-4 w-4"
              strokeWidth={1.75}
              style={{ color: accent }}
            />
            <h3 className="text-base font-bold text-[#0f0f12]">
              Business Information
            </h3>
          </div>
          <p className="mt-2 max-w-full text-sm leading-relaxed break-words [overflow-wrap:anywhere] text-[#4a4a52]">
            {about ||
              "Add company details in the Company tab — about your business and services will show here."}
          </p>

          <h4 className="mt-4 text-sm font-bold text-[#0f0f12]">
            Services / Products
          </h4>
          {services.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {services.map((service, index) => (
                <li
                  key={`${service}-${index}`}
                  className="flex items-start gap-2"
                >
                  <span
                    className="mt-1.5 h-0 w-0 shrink-0 border-y-[5px] border-l-[7px] border-y-transparent"
                    style={{ borderLeftColor: accent }}
                    aria-hidden
                  />
                      <span className="min-w-0 break-words [overflow-wrap:anywhere] text-sm text-[#4a4a52]">{service}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-[#8a8a92]">
              Add services or products from the Company tab.
            </p>
          )}
        </div>
      ) : null}

      {showSocials && socialLinks.length > 0 ? (
        <div className="pb-5 text-center">
          <h3 className="text-base font-bold text-[#0f0f12]">
            Social Media Links
          </h3>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5">
            {socialLinks.map(({ label, Icon, href }) => (
              <a
                key={label}
                href={href.startsWith("http") ? href : `https://${href}`}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform hover:scale-105"
                style={{ backgroundColor: accent }}
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {showContactForm ? (
        <div id="card-contact-form">
          <CardContactForm accentColor={accent} className="mx-4 mb-6" />
        </div>
      ) : null}

      <CardLayoutFooter accent={accent} />
    </>
  );
}
