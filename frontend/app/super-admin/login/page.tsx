import { Suspense } from "react";
import { SuperAdminLogin } from "@/components/super-admin";

export const metadata = {
  title: "Super Admin Sign In — HexaCards",
  description: "Sign in to the HexaCards super admin control panel.",
};

export default function SuperAdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA]">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#BC7C10]/25 border-t-[#BC7C10]" />
            <p className="mt-3 text-sm font-medium text-[#5c5346]">Loading…</p>
          </div>
        </div>
      }
    >
      <SuperAdminLogin />
    </Suspense>
  );
}
