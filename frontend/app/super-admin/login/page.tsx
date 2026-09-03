import { Suspense } from "react";
import { SuperAdminLogin } from "@/components/super-admin";
import { HoneycombPageStatus } from "@/components/ui/honeycomb-loader";

export const metadata = {
  title: "Super Admin Sign In — HexaCards",
  description: "Sign in to the HexaCards super admin control panel.",
};

export default function SuperAdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA]">
          <HoneycombPageStatus label="Loading…" />
        </div>
      }
    >
      <SuperAdminLogin />
    </Suspense>
  );
}
