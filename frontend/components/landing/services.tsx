import {
  Code2,
  Megaphone,
  Smartphone,
  Palette,
  ShoppingCart,
  Server,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";

type Service = {
  icon: typeof Code2;
  title: string;
  description: string;
};

const WHATSAPP_NUMBER = "919226286898";

const services: Service[] = [
  {
    icon: Code2,
    title: "Web Design and Development",
    description:
      "We build a responsive website which targets effective communication in the market through quality code & interactive design.",
  },
  {
    icon: Megaphone,
    title: "Digital Marketing",
    description:
      "Make sense of your data to drive sales. Work smarter to boost revenue with Invictus Digital Marketing.",
  },
  {
    icon: Smartphone,
    title: "Mobile App Development",
    description:
      "We are experts in delivering high-performance, scalable enterprise mobile apps in Android & iOS.",
  },
  {
    icon: Palette,
    title: "Graphic Design",
    description:
      "Bring your brand to life with custom-made website themes, templates, logos, and video marketing.",
  },
  {
    icon: ShoppingCart,
    title: "eCommerce Solutions",
    description:
      "We provide all the advanced eCommerce functionality you might need to allow your business to grow.",
  },
  {
    icon: Server,
    title: "Web Hosting",
    description:
      "Our cost-effective hosting supports websites to stay connected in the changing digital landscape.",
  },
];

function ServiceCard({ service }: { service: Service }) {
  const Icon = service.icon;
  const whatsappHref = `https://api.whatsapp.com/send/?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(
    `Hi HexaCards support, I'd like to enquire about ${service.title}.`,
  )}&type=phone_number&app_absent=0`;

  return (
    <div className="group flex h-full flex-col rounded-2xl border border-black/[0.06] bg-white p-7 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#BC7C10]/20 hover:shadow-lg">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#BC7C10]/20 bg-[#FFF8ED] text-[#BC7C10] transition-colors duration-300 group-hover:border-[#25D366]/35 group-hover:bg-[#E8F8EE] group-hover:text-[#25D366]">
        <Icon className="h-6 w-6" strokeWidth={1.6} />
      </span>

      <h5 className="mt-5 text-lg font-bold tracking-tight text-[#141414]">
        {service.title}
      </h5>
      <p className="mt-2.5 flex-1 text-sm leading-relaxed text-[#5c5346]">
        {service.description}
      </p>

      <a
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#BC7C10]/30 bg-[#FFF8ED] px-4 py-2.5 text-sm font-semibold text-[#BC7C10] transition-colors duration-300 hover:border-[#25D366] hover:bg-[#25D366] hover:text-white active:scale-[0.98]"
      >
        <FaWhatsapp className="h-4 w-4" />
        Enquiry
      </a>
    </div>
  );
}

export default function Services() {
  return (
    <section id="services" className="scroll-mt-20 bg-[#FFFCF7] py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.title} service={service} />
          ))}
        </div>
      </div>
    </section>
  );
}
