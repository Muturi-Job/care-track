import Link from "next/link";
import { PrintButton } from "@/components/staff/print-button";

export const dynamic = "force-dynamic";

// ACCESS CONTROL LATER: staff-only once access control exists.
export default function BaselineWeekPage() {
  return <main className="mx-auto w-full max-w-4xl flex-1 px-page py-8">
    <div className="mb-5 flex items-center justify-between print:hidden">
      <Link href="/staff/insights/settings" className="text-sm font-semibold text-brand underline">Back to settings</Link>
      <PrintButton label="Print tally sheet" />
    </div>
    <section className="baseline-print rounded-card border border-line bg-paper p-6 shadow-card">
      <p className="text-sm font-semibold text-brand">CareTrack · Baseline week</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink">Family inquiry tally</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Before using CareTrack, count family inquiries for one week and count the number of procedures. Keep totals only: do not write names, room numbers, or notes.</p>
      <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <p>Week beginning: ____________________</p>
        <p>Number of procedures: ______________</p>
      </div>
      <div className="mt-5 overflow-hidden rounded-control border border-line">
        <table className="w-full border-collapse text-left">
          <thead><tr className="bg-brand-soft text-ink"><th className="p-3">Day</th><th className="p-3">Phone</th><th className="p-3">Desk</th><th className="p-3">Ward</th><th className="p-3">Other</th><th className="p-3">Total</th></tr></thead>
          <tbody>{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Week total"].map((day) => <tr key={day} className="h-12 border-t border-line"><th className="px-3 font-medium">{day}</th>{Array.from({ length: 5 }, (_, index) => <td key={index} className="border-l border-line" />)}</tr>)}</tbody>
        </table>
      </div>
      <p className="mt-6 text-lg font-medium text-ink">Baseline inquiries per episode = total inquiries ÷ number of procedures</p>
      <p className="mt-2 text-sm text-muted">Weekly inquiry total: __________ ÷ procedures: __________ = __________ inquiries per episode</p>
    </section>
  </main>;
}
