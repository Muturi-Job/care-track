import Link from "next/link";

import { StaffEpisodes } from "@/components/staff/staff-episodes";
import { siteOrigin } from "@/lib/staff/site";

export const dynamic = "force-dynamic";

// ACCESS CONTROL LATER: staff-only once real access control exists; Phase A
// deliberately has none (CLAUDE.md rule 1).

export default async function StaffPage() {
  const origin = await siteOrigin();

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Staff</h1>

        <Link
          href="/staff/episodes/new"
          className="inline-flex min-h-12 items-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        >
          New episode
        </Link>
      </div>

      <StaffEpisodes origin={origin} />
    </main>
  );
}
