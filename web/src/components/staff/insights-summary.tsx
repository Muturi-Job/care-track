"use client";

import { useEffect, useState } from "react";

type Summary = {
  episodes_count?: number;
  average_total_minutes?: number;
  expected_total_minutes?: number;
  on_time_rate?: number;
  delay_rate?: number;
  inquiries_per_episode?: number;
  insights?: Record<string, unknown>[];
};

export function InsightsSummary({ query }: { query: string }) {
  const [data, setData] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(`/api/staff/analytics/overview?${query}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("summary_unavailable");
        const body: unknown = await response.json();
        if (active) setData(typeof body === "object" && body !== null ? body as Summary : {});
      })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [query]);

  return <article className="summary-print rounded-card border border-line bg-paper p-8 shadow-card print:border-0 print:p-3 print:shadow-none">
    <div className="flex items-start justify-between gap-4">
      <div><p className="text-sm font-semibold tracking-wide text-brand uppercase">CareTrack · Management summary</p><h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink">Procedure insights</h1><p className="mt-2 text-sm text-muted">{query.replaceAll("&", " · ").replaceAll("=", ": ")}</p></div>
      <button type="button" onClick={() => window.print()} className="rounded-control bg-brand px-4 py-3 text-sm font-semibold text-white print:hidden">Print</button>
    </div>
    {failed ? <p role="alert" className="mt-8 text-warning-ink">The summary could not be loaded.</p> : !data ? <p role="status" className="mt-8 text-muted">Loading summary…</p> : <>
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <SummaryKpi label="Episodes" value={data.episodes_count} />
        <SummaryKpi label="Average / expected total time" value={`${value(data.average_total_minutes)} / ${value(data.expected_total_minutes)} min`} />
        <SummaryKpi label="On-time rate" value={`${value(data.on_time_rate)}%`} />
        <SummaryKpi label="Delay rate" value={`${value(data.delay_rate)}%`} />
        <SummaryKpi label="Inquiries per episode" value={data.inquiries_per_episode} />
      </div>
      <section className="mt-8">
        <h2 className="text-2xl font-semibold text-ink">Top insights</h2>
        <ol className="mt-3 space-y-3">{(data.insights ?? []).slice(0, 3).map((insight, index) => <li key={index} className="rounded-control border border-line bg-canvas p-4">
          <span className="mr-2 font-semibold text-brand">{index + 1}.</span>{String(insight.type ?? "Insight").replaceAll("_", " ")}
          <p className="mt-1 text-sm text-muted">{Object.entries(insight).filter(([key]) => key !== "type").map(([key, item]) => `${key.replaceAll("_", " ")}: ${String(item)}`).join(" · ")}</p>
        </li>)}</ol>
      </section>
    </>}
  </article>;
}

function SummaryKpi({ label, value: raw }: { label: string; value: unknown }) {
  return <div className="rounded-card border border-line bg-canvas p-5"><p className="text-sm text-muted">{label}</p><p className="mt-2 text-3xl font-semibold text-ink">{value(raw)}</p></div>;
}

function value(raw: unknown): string {
  return typeof raw === "number" ? raw.toLocaleString() : "—";
}
