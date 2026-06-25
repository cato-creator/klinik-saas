import type { Metadata } from "next";
import { requireAffiliate } from "@/lib/affiliate/guard";
import AffiliateNav from "./affiliate-nav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Affiliator — Dashboard" };

export default async function AffiliateLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAffiliate();

  return (
    <div className="min-h-screen bg-gray-50">
      <AffiliateNav name={ctx.fullName} />
      <main className="min-w-0 overflow-x-hidden md:ml-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-8">{children}</div>
      </main>
    </div>
  );
}
