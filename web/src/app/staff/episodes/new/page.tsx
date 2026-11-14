import Link from "next/link";

import { EpisodeForm } from "@/components/staff/episode-form";
import { loadProcedureOptions } from "@/lib/staff/server";
import { staffCreationEnabled } from "@/lib/staff/creation";
import { siteOrigin } from "@/lib/staff/site";
import type { ProcedureOption } from "@/lib/staff/types";

export const dynamic = "force-dynamic";

// ACCESS CONTROL LATER: staff-only once real access control exists; Phase A
// deliberately has none (CLAUDE.md rule 1).

export default async function NewEpisodePage() {
  const creationEnabled = staffCreationEnabled();
  const origin = await siteOrigin();

  let procedures: ProcedureOption[] = [];
  let failure = "";

  try {
    procedures = (await loadProcedureOptions()).filter((procedure) => procedure.active);
  } catch {
    failure = "Could not load the procedures list. Please check the API and try again.";
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-page py-8">
      <Link
        href="/staff"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Back to staff list
      </Link>

      <h1 className="mt-2 text-page-title font-semibold tracking-tight text-ink">New episode</h1>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Alias, procedure and bed. That is all the family page needs.
      </p>

      <div className="mt-6">
        {!creationEnabled ? (
          <p role="status" className="rounded-card border border-line bg-paper p-card text-sm text-ink">
            Creating episodes is currently turned off.
          </p>
        ) : failure ? (
          <p role="alert" className="rounded-card border border-warning-line bg-warning-soft p-card text-sm text-warning-ink">
            {failure}
          </p>
        ) : (
          <EpisodeForm procedures={procedures} origin={origin} />
        )}
      </div>
    </main>
  );
}
