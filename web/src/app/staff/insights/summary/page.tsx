import { InsightsSummary } from "@/components/staff/insights-summary";

export const dynamic = "force-dynamic";

// ACCESS CONTROL LATER: management insights are staff-only once access control exists.
export default async function InsightsSummaryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["from", "to", "procedure_template_id"]) {
    const value = query[key];
    if (typeof value === "string") params.set(key, value);
  }
  return <main className="mx-auto w-full max-w-5xl flex-1 px-page py-8 print:max-w-none print:p-0">
    <InsightsSummary query={params.toString()} />
  </main>;
}
