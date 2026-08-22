import { Suspense } from "react";
import { SuperAdminDashboard } from "@/components/super-admin";

export const metadata = {
  title: "Super Admin — HexaCards",
  description: "HexaCards super admin control panel.",
};

export default function SuperAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8]">
          <p className="text-sm font-medium text-[#5c5346]">Loading admin panel…</p>
        </div>
      }
    >
      <SuperAdminDashboard />
    </Suspense>
  );
}
