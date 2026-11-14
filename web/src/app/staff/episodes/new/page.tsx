import Link from "next/link";

import { EpisodeForm } from "@/components/staff/episode-form";
import { loadProcedureOptions } from "@/lib/staff/server";
import { siteOrigin } from "@/lib/staff/site";
import type { ProcedureOption } from "@/lib/staff/types";

export const dynamic = "force-dynamic";

// ACCESS CONTROL LATER: staff-only once real access control exists; Phase A
// deliberately has none (CLAUDE.md rule 1).

export default async function NewEpisodePage() {
  const origin = await siteOrigin();

  let procedures: ProcedureOption[] = [];
  let failure = "";

  try {
    procedures = (await loadProcedureOptions()).filter((procedure) => procedure.active);
  } catch {
    failure = "Could not load the procedures list. Please check the API and try again.";
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <Link
        href="/staff"
        className="inline-flex min-h-11 items-center text-sm font-medium text-emerald-800 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
      >
        Back to staff list
      </Link>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">New episode</h1>
      <p className="mt-1 text-sm text-neutral-700">
        Alias, procedure and bed. That is all the family page needs.
      </p>

      <div className="mt-6">
        {failure ? (
          <p role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            {failure}
          </p>
        ) : (
          <EpisodeForm procedures={procedures} origin={origin} />
        )}
      </div>
    </main>
  );
}
