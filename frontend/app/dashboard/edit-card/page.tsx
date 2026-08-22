import { Suspense } from "react";
import EditCard from "@/components/user-dashboard/EditCard";

export const metadata = {
  title: "Edit Card — HexaCards",
  description: "Edit your HexaCards contact info, social links, and appearance.",
};

export default function EditCardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8]">
          <p className="text-sm font-medium text-[#5c5346]">Loading editor…</p>
        </div>
      }
    >
      <EditCard />
    </Suspense>
  );
}
