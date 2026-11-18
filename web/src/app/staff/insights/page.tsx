import { Suspense } from "react";

import { InsightsDashboard } from "@/components/staff/insights-dashboard";
import { loadProcedureOptions } from "@/lib/staff/server";
import type { ProcedureOption } from "@/lib/staff/types";

export const dynamic = "force-dynamic";

// ACCESS CONTROL LATER: insights are staff-only once access control exists.
export default async function InsightsPage() {
  let procedures: ProcedureOption[] = [];
  try {
    procedures = await loadProcedureOptions();
  } catch {
    procedures = [];
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-page py-6 sm:py-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-paper" />}>
        <InsightsDashboard procedures={procedures} />
      </Suspense>
    </main>
  );
}
