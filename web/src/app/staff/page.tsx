import Link from "next/link";

import { StaffEpisodes } from "@/components/staff/staff-episodes";
import { staffCreationEnabled } from "@/lib/staff/creation";
import { siteOrigin } from "@/lib/staff/site";

export const dynamic = "force-dynamic";

// ACCESS CONTROL LATER: staff-only once real access control exists; Phase A
// deliberately has none (CLAUDE.md rule 1).

export default async function StaffPage() {
  const origin = await siteOrigin();
  const creationEnabled = staffCreationEnabled();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-page py-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">CareTrack</p>
          <h1 className="mt-1 text-page-title font-semibold tracking-tight text-ink">
            Staff Procedure Board
          </h1>
        </div>

        {creationEnabled ? (
          <Link
            href="/staff/episodes/new"
            className="inline-flex min-h-12 items-center rounded-control bg-brand px-5 text-sm font-semibold text-white shadow-card hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong"
          >
            <span aria-hidden="true" className="mr-2 text-lg leading-none">+</span>
            Add patient
          </Link>
        ) : null}
      </div>

      <StaffEpisodes origin={origin} />
    </main>
  );
}
