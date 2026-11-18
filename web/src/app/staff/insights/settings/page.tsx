import { MetricSettingsForm } from "@/components/staff/metric-settings-form";

export const dynamic = "force-dynamic";

// ACCESS CONTROL LATER: metric settings are staff-only once access control exists.
export default function InsightsSettingsPage() {
  return <main className="mx-auto w-full max-w-3xl flex-1 px-page py-8">
    <h1 className="text-page-title font-semibold tracking-tight text-ink">Insights settings</h1>
    <p className="mt-2 text-sm leading-relaxed text-muted">These assumptions affect the dashboard calculations and suppression thresholds.</p>
    <div className="mt-6"><MetricSettingsForm /></div>
  </main>;
}
