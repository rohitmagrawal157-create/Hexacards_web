import { Suspense } from "react";
import { Navbar, Footer } from "@/components/landing";
import Login from "@/components/products/Login";

export const metadata = {
  title: "Sign In — HexaCards",
  description: "Sign in with your mobile number and OTP to continue checkout.",
};

export default function LoginPage() {
  return (
    <div className="min-h-full bg-[#FFFCF7] text-[#141414]">
      <Navbar />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="mx-auto max-w-md px-5 py-16 text-center text-sm text-[#5c5346]">
              Loading…
            </div>
          }
        >
          <Login />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
