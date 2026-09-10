"use client";

import { useMemo, useState } from "react";
import {
  Info,
  Wifi,
  QrCode,
  ChevronDown,
  Search,
  Smartphone,
} from "lucide-react";

type Brand = {
  name: string;
  devices: string[];
};

const iosDevices = [
  "iPhone 7",
  "iPhone 7 Plus",
  "iPhone 8",
  "iPhone 8 Plus",
  "iPhone X",
  "iPhone XS",
  "iPhone XS Max",
  "iPhone XR",
  "iPhone SE (2020)",
  "iPhone 11",
  "iPhone 11 Pro",
  "iPhone 12",
  "iPhone 12 mini",
  "iPhone 12 Pro",
  "iPhone 12 Pro Max",
  "iPhone 13",
  "iPhone 13 mini",
  "iPhone 13 Pro",
  "iPhone 13 Pro Max",
];

const androidBrands: Brand[] = [
  {
    name: "Samsung",
    devices: [
      "Galaxy SIII", "Galaxy S4", "Galaxy S5", "Galaxy S6", "Galaxy S6 Edge",
      "Galaxy S6 Edge+", "Galaxy S7", "Galaxy S7 Edge", "Galaxy S8", "Galaxy S8+",
      "Galaxy S9", "Galaxy S9+", "Galaxy S10", "Galaxy S10 Plus", "Galaxy S20 Plus",
      "Galaxy S20 Ultra", "Galaxy S20 FE", "Galaxy S21 Plus", "Galaxy S21 Ultra",
      "Galaxy Note 3", "Galaxy Note 3 NEO", "Galaxy Note 5", "Galaxy Note 10 Lite",
      "Galaxy Note 10 Plus", "Galaxy Alpha", "Galaxy A5", "Galaxy A30s", "Galaxy A32",
      "Galaxy A50s", "Galaxy A50s 6GB RAM", "Galaxy A51", "Galaxy A52", "Galaxy A52s",
      "Galaxy A70", "Galaxy A70s", "Galaxy A72", "Galaxy A80", "Galaxy M32",
      "Galaxy M40", "Galaxy M42", "Galaxy M51", "Galaxy F62", "Galaxy On8",
      "Galaxy S3 Neo", "Galaxy Z Flip 3", "Galaxy Z Fold 3",
    ],
  },
  {
    name: "OnePlus",
    devices: [
      "OnePlus 3", "OnePlus 3T", "OnePlus 5", "OnePlus 5T", "OnePlus 6", "OnePlus 6T",
      "OnePlus 7", "OnePlus 7T", "OnePlus 7 Pro", "7T Pro McLaren Edition",
      "OnePlus 8", "OnePlus 8 Pro", "OnePlus 8T", "OnePlus Nord", "OnePlus 9",
      "OnePlus 9 Pro", "OnePlus 9R",
    ],
  },
  {
    name: "Nokia",
    devices: [
      "Nokia 3", "Nokia 3.1", "Nokia 4.2", "Nokia 5", "Nokia 5.1", "Nokia 6",
      "Nokia 6.1", "Nokia 7", "Nokia 7 Plus", "Nokia 8", "Nokia 8 Sirocco",
      "Nokia 8.1", "Nokia 9", "Nokia Lumia 920", "Nokia Lumia 930",
    ],
  },
  {
    name: "Motorola",
    devices: [
      "Motorola One", "Motorola One Vision", "Motorola One Vision Plus",
      "Motorola One Action", "Moto Z3 Play", "Moto E4 Plus", "Moto X4",
      "Moto E5 / Plus", "Moto E5 Play / Go", "Moto G5 / G5S Plus",
      "Moto G6 / Plus / Play", "Motorola Razr", "Motorola Moto Turbo",
      "Motorola Moto X Force", "Motorola Moto X Play", "Motorola Moto X",
      "Motorola Edge", "Motorola Edge Plus", "Motorola Edge S", "Motorola Edge S Pro",
      "Motorola Edge 20", "Motorola Edge 20 Pro", "Motorola Edge 20 Lite",
      "Motorola Edge 20 Fusion", "Motorola Defy",
    ],
  },
  {
    name: "LG",
    devices: [
      "LG G2", "LG G3", "LG G4", "LG G4 Dual", "LG G5", "LG G6", "LG G7 ThinQ",
      "LG G7 Plus ThinQ", "LG G8 ThinQ", "LG G Pro 2", "LG Nexus 5X", "LG V10",
      "LG V20", "LG V30", "LG V30 ThinQ", "LG V35 ThinQ", "LG V40 ThinQ",
      "LG Q6", "LG Q6 Plus", "LG Q7", "LG Q7 Plus", "LG Q8", "LG Q92",
      "LG Q Stylus", "LG Q Stylus 4", "LG K10", "LG K62", "LG K92", "LG Wing",
      "LG F70", "LG Stylus 2 Plus",
    ],
  },
  {
    name: "Google",
    devices: [
      "Google Pixel", "Google Pixel XL", "Google Pixel 2", "Google Pixel 2 XL",
      "Google Pixel 3", "Google Pixel 3XL", "Google Pixel 3A", "Google Pixel 4A",
      "Google Nexus 4", "Google Nexus 5", "Google Nexus 5X", "Google Nexus 6P",
    ],
  },
  {
    name: "Realme",
    devices: [
      "Realme GT", "Realme GT Neo", "Realme Narzo 30", "Realme X2 Pro",
      "Realme X7", "Realme X7 Pro", "Realme X7 Max", "Realme X50 Pro",
    ],
  },
  {
    name: "Sony",
    devices: [
      "Sony Xperia XA1 / Ultra / Plus", "Sony Xperia XA2 / Ultra / Plus",
      "Sony Xperia XZ1 / Compact", "Sony Xperia XZ2 / Compact / Premium",
      "Sony Xperia 10", "Sony Xperia 10 Lite", "Sony Xperia 8 Lite",
      "Sony Xperia XA", "Sony Xperia XA1 Dual", "Sony Xperia XA1 Plus",
      "Sony Xperia XZ", "Sony Xperia Z1", "Sony Xperia Z2", "Sony Xperia Z3",
      "Sony Xperia Z3+", "Sony Xperia Z5", "Sony Xperia ZR", "Sony Xperia C5",
      "Sony Xperia T2", "Sony Xperia T3", "Sony Xperia SP", "Sony Xperia E3",
      "Sony Xperia L2", "Sony Xperia M2",
    ],
  },
  {
    name: "Vivo",
    devices: [
      "Vivo X70 Pro Plus", "Vivo X70 Pro", "Vivo X70", "Vivo X60T Pro Plus",
      "Vivo X60T", "Vivo Z6", "Vivo S9 5G", "Vivo S10 Pro", "Vivo Nex 3S",
      "Vivo Y53s",
    ],
  },
  {
    name: "Oppo",
    devices: [
      "OPPO Find X2", "OPPO Find X3", "OPPO Find X3 Pro", "OPPO Find X3 Neo",
      "OPPO Reno", "OPPO Reno 2", "OPPO Reno 3", "OPPO Reno 3A", "OPPO Reno 4",
      "OPPO Reno 5 Lite", "OPPO Reno 5 Pro", "OPPO Reno 5A", "OPPO Reno 6",
      "OPPO Reno6 4G", "OPPO Reno 6 Pro", "OPPO Reno 6 Pro Plus",
      "OPPO Reno 10x", "OPPO R17 Pro", "OPPO K9", "OPPO K9 Pro", "OPPO A16s",
      "OPPO A94", "OPPO A95", "OPPO N1", "OPPO N1 Mini",
    ],
  },
  {
    name: "HTC",
    devices: [
      "HTC One A9", "HTC One E8", "HTC One E9+", "HTC One M9 Plus",
      "HTC One ME", "HTC 10 Evo", "HTC 10 Lifestyle", "HTC U Ultra",
      "HTC U11 Plus", "HTC Desire 10 Pro", "HTC Desire 20 Plus", "HTC Desire Eye",
    ],
  },
  {
    name: "Honor",
    devices: ["Honor 8", "Honor 8 Pro", "Honor View 20", "Honor V10"],
  },
  {
    name: "Asus",
    devices: ["Asus ROG Phone"],
  },
  {
    name: "Essential",
    devices: ["Essential PH-1"],
  },
  {
    name: "Poco",
    devices: ["Poco F2 Pro", "Poco F3", "Poco X3 GT"],
  },
];

function BrandSection({ brand }: { brand: Brand }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2.5">
          <span className="text-sm font-bold text-[#0f0f12]">{brand.name}</span>
          <span className="rounded-full bg-[#FBF3E4] px-2 py-0.5 text-[11px] font-semibold text-[#BD7F14]">
            {brand.devices.length} models
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[#8a8a92] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <ul className="grid grid-cols-1 gap-x-6 gap-y-2 border-t border-black/[0.06] px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
            {brand.devices.map((device) => (
              <li key={device} className="text-sm text-[#4a4a52]">
                {device}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function Compatibility() {
  const [os, setOs] = useState<"android" | "ios">("android");
  const [search, setSearch] = useState("");

  const filteredBrands = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return androidBrands;
    return androidBrands
      .map((brand) => ({
        ...brand,
        devices: brand.devices.filter((d) => d.toLowerCase().includes(q)),
      }))
      .filter((brand) => brand.devices.length > 0);
  }, [search]);

  const filteredIos = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return iosDevices;
    return iosDevices.filter((d) => d.toLowerCase().includes(q));
  }, [search]);

  return (
    <section id="compatibility" className="scroll-mt-20 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#FBF3E4] px-4 py-1.5 text-sm font-semibold text-[#BD7F14]">
            <Smartphone className="h-3.5 w-3.5" />
            Device Compatibility
          </span>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-[#0f0f12] sm:text-4xl">
            List of Supported Devices
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-[#7a7a82]">
            NFC may not work on unsupported devices — but a QR code is always
            provided so you can still use your Hexa Card.
          </p>
        </div>

        {/* Note banner */}
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-[#f0d9a8] bg-[#FBF3E4] p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#BD7F14]" />
          <p className="text-sm text-[#6b5320]">
            <strong className="font-bold">Note:</strong> Some Android phones
            are compatible but have NFC turned off in their settings. If
            tapping doesn&apos;t work, check{" "}
            <span className="italic">Settings → Connected devices → NFC</span>{" "}
            and make sure it&apos;s switched on.
          </p>
        </div>

        {/* OS toggle */}
        <div className="mt-8 flex w-full gap-1 rounded-xl border border-black/[0.06] bg-black/[0.03] p-1 sm:w-80">
          <button
            type="button"
            onClick={() => setOs("android")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-bold transition-all ${
              os === "android"
                ? "bg-[#BD7F14] text-white shadow-md"
                : "text-[#8a8a92] hover:text-[#0f0f12]"
            }`}
          >
            <Wifi className="h-4 w-4" />
            Android
          </button>
          <button
            type="button"
            onClick={() => setOs("ios")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-bold transition-all ${
              os === "ios"
                ? "bg-[#BD7F14] text-white shadow-md"
                : "text-[#8a8a92] hover:text-[#0f0f12]"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            iOS
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a0a0a8]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${os === "android" ? "Android" : "iOS"} devices...`}
            className="w-full rounded-xl border border-black/10 py-3 pl-11 pr-4 text-sm text-[#0f0f12] outline-none focus:border-[#BD7F14]"
          />
        </div>

        {/* Device lists */}
        <div className="mt-8">
          {os === "ios" ? (
            <div className="rounded-2xl border border-black/[0.06] bg-white p-5">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-bold text-[#0f0f12]">
                  Apple iPhone
                </span>
                <span className="rounded-full bg-[#FBF3E4] px-2 py-0.5 text-[11px] font-semibold text-[#BD7F14]">
                  {filteredIos.length} models
                </span>
              </div>
              <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                {filteredIos.map((device) => (
                  <li key={device} className="text-sm text-[#4a4a52]">
                    {device}
                  </li>
                ))}
              </ul>
              {filteredIos.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#8a8a92]">
                  No matching devices found.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredBrands.map((brand) => (
                <BrandSection key={brand.name} brand={brand} />
              ))}
              {filteredBrands.length === 0 ? (
                <p className="py-10 text-center text-sm text-[#8a8a92]">
                  No matching devices found.
                </p>
              ) : null}
            </div>
          )}
        </div>

        {/* QR fallback note */}
        <div className="mt-10 flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-[#fafafa] p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#BD7F14] shadow-sm">
            <QrCode className="h-5 w-5" />
          </span>
          <p className="text-sm text-[#4a4a52]">
            Device not on the list, or NFC not working? Every Hexa Card also
            includes a printed QR code, so anyone can still access your
            profile by scanning instead of tapping.
          </p>
        </div>
      </div>
    </section>
  );
}