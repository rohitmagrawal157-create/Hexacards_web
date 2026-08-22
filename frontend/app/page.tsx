import {
  Navbar,
  Hero,
  Clients,
  Products,
  Feature,
  HowItWorks,
  // WhyHexa,
  Industries,
  Testimonials,
  FAQ,
  Footer,
  Franchise,
} from "@/components/landing";

export default function HomePage() {
  return (
    <div className="min-h-full bg-white text-[#141414]">
      <div className="bg-white">
        <Navbar />
        <Hero />
        <Clients />
        <Products />
        <Feature />
        <HowItWorks />
        {/* <WhyHexa /> */}
        <Industries />
        <Testimonials />
        <Franchise />
        <FAQ />
      </div>
      <Footer />
    </div>
  );
}
