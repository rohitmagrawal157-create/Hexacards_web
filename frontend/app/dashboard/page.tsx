import { Suspense } from "react";
import { Dashboard } from "@/components/user-dashboard";

export const metadata = {
  title: "Dashboard — HexaCards",
  description: "Manage your HexaCards, orders, and account.",
};

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F7F7F5]">
          <p className="text-sm font-medium text-[#5c5346]">Loading dashboard…</p>
        </div>
      }
    >
      <Dashboard />
    </Suspense>
  );
}
