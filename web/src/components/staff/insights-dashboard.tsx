"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { ProcedureOption } from "@/lib/staff/types";

type Json = Record<string, unknown>;
type Tab = "overview" | "bottlenecks" | "delays" | "inquiries";
type Report = Json & { has_demo_data?: boolean; insights?: Json[] };

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "bottlenecks", label: "Bottlenecks" },
  { id: "delays", label: "Delays" },
  { id: "inquiries", label: "Family inquiries" },
];

function record(value: unknown): Json {
  return typeof value === "object" && value !== null ? value as Json : {};
}

function array(value: unknown): Json[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function text(value: unknown, fallback = "—"): string {
  return typeof value === "string" && value.length ? value : fallback;
}

function suppressed(value: unknown): boolean {
  return record(value).insufficient_data === true;
}

function display(value: unknown, suffix = ""): string {
  if (suppressed(value)) return "Not enough data yet";
  const parsed = num(value);
  return parsed === null ? "—" : `${parsed.toLocaleString()}${suffix}`;
}

function defaultFrom(): string {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return date.toISOString().slice(0, 10);
}

export function InsightsDashboard({ procedures }: { procedures: ProcedureOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const tabValue = search.get("tab");
  const tab: Tab = TABS.some((item) => item.id === tabValue) ? tabValue as Tab : "overview";
  const from = search.get("from") ?? defaultFrom();
  const to = search.get("to") ?? new Date().toISOString().slice(0, 10);
  const templateId = search.get("procedure_template_id") ?? "";
  const [report, setReport] = useState<Report | null>(null);
  const [quality, setQuality] = useState<Report | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [failedKey, setFailedKey] = useState("");
  const [attempt, setAttempt] = useState(0);

  const query = useMemo(() => {
    const params = new URLSearchParams({ from, to });
    if (templateId) params.set("procedure_template_id", templateId);
    return params.toString();
  }, [from, to, templateId]);
  const requestKey = `${tab}:${query}`;
  const loading = loadedKey !== requestKey && failedKey !== requestKey;
  const error = failedKey === requestKey;

  const updateQuery = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(search.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, search]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`/api/staff/analytics/${tab}?${query}`, { cache: "no-store" }),
      fetch(`/api/staff/analytics/data_quality?${query}`, { cache: "no-store" }),
    ]).then(async ([reportResponse, qualityResponse]) => {
      if (!reportResponse.ok || !qualityResponse.ok) throw new Error("analytics_unavailable");
      const [reportBody, qualityBody] = await Promise.all([reportResponse.json(), qualityResponse.json()]);
      if (!active) return;
      setFailedKey("");
      setReport(record(reportBody) as Report);
      setQuality(record(qualityBody) as Report);
      setLoadedKey(requestKey);
    }).catch(() => {
      if (active) setFailedKey(requestKey);
    });
    return () => { active = false; };
  }, [attempt, query, requestKey, tab]);

  const hasDemo = report?.has_demo_data === true || quality?.has_demo_data === true;
  const exportQuery = query;

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">CareTrack</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-page-title font-semibold tracking-tight text-ink">Insights</h1>
            {hasDemo ? <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning-ink">Demo data</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Date range"
            value={rangeChoice(from, to, search.get("range"))}
            onChange={(event) => {
              const today = new Date();
              const days = event.target.value === "7" ? 6 : 29;
              if (event.target.value === "custom") {
                updateQuery({ range: "custom" });
                return;
              }
              const start = new Date(today);
              start.setDate(start.getDate() - days);
              updateQuery({ from: start.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10), range: event.target.value });
            }}
            className="min-h-11 rounded-control border border-line bg-paper px-3 text-sm text-ink"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="custom">Custom</option>
          </select>
          {rangeChoice(from, to, search.get("range")) === "custom" ? (
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="insights-from">From</label>
              <input id="insights-from" type="date" value={from} onChange={(event) => updateQuery({ from: event.target.value })} className="min-h-11 w-36 rounded-control border border-line bg-paper px-2 text-sm" />
              <label className="sr-only" htmlFor="insights-to">To</label>
              <input id="insights-to" type="date" value={to} onChange={(event) => updateQuery({ to: event.target.value })} className="min-h-11 w-36 rounded-control border border-line bg-paper px-2 text-sm" />
            </div>
          ) : null}
          <label className="sr-only" htmlFor="procedure-filter">Procedure</label>
          <select
            id="procedure-filter"
            value={templateId}
            onChange={(event) => updateQuery({ procedure_template_id: event.target.value || null })}
            className="min-h-11 max-w-48 rounded-control border border-line bg-paper px-3 text-sm text-ink"
          >
            <option value="">All procedures</option>
            {procedures.map((procedure) => <option key={procedure.id} value={procedure.id}>{procedure.name}</option>)}
          </select>
          <a
            href={`/api/staff/analytics/export.csv?report=${tab === "inquiries" ? "inquiries" : tab}&${exportQuery}`}
            className="inline-flex min-h-11 items-center rounded-control border border-brand-line bg-paper px-3 text-sm font-semibold text-brand hover:bg-brand-soft"
          >
            Export CSV
          </a>
        </div>
      </header>

      <nav aria-label="Insights reports" role="tablist" className="mt-6 flex gap-2 overflow-x-auto border-b border-line">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => updateQuery({ tab: item.id })}
            className={`min-h-12 shrink-0 border-b-2 px-3 text-sm font-semibold ${tab === item.id ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-5 min-h-[32rem]">
        {loading ? <LoadingSkeleton /> : error ? (
          <div role="alert" className="rounded-card border border-warning-line bg-warning-soft p-card text-sm text-warning-ink">
            Insights could not be loaded. Please try again.
            <button type="button" className="ml-3 underline" onClick={() => setAttempt((value) => value + 1)}>Try again</button>
          </div>
        ) : report ? (
          <>
            <ConfidencePanel quality={quality} />
            {tab === "overview" ? <Overview report={report} /> :
              tab === "bottlenecks" ? <Bottlenecks report={report} /> :
                tab === "delays" ? <Delays report={report} /> : <InquiryReport report={report} />}
          </>
        ) : null}
      </div>
      <p className="mt-6 text-right">
        <Link href="/staff/insights/settings" className="text-sm font-semibold text-brand underline underline-offset-4">Metric settings</Link>
        <span className="px-2 text-muted">·</span>
        <Link href="/staff/insights/baseline-week" className="text-sm font-semibold text-brand underline underline-offset-4">Baseline week tally</Link>
        <span className="px-2 text-muted">·</span>
        <Link href={`/staff/insights/summary?${query}`} className="text-sm font-semibold text-brand underline underline-offset-4">Print summary</Link>
      </p>
    </>
  );
}

function rangeChoice(from: string, to: string, range: string | null): string {
  if (range === "custom") return "custom";
  const now = new Date().toISOString().slice(0, 10);
  const days7 = new Date();
  days7.setDate(days7.getDate() - 6);
  const days30 = new Date();
  days30.setDate(days30.getDate() - 29);
  if (to === now && from === days7.toISOString().slice(0, 10)) return "7";
  if (to === now && from === days30.toISOString().slice(0, 10)) return "30";
  return "custom";
}

function LoadingSkeleton() {
  return <div role="status" aria-label="Loading insights" className="space-y-4">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-card bg-paper shadow-card" />)}</div>
    <div className="h-64 animate-pulse rounded-card bg-paper shadow-card" />
  </div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-card border border-line bg-paper p-card shadow-card">
    <h2 className="text-section-title font-semibold text-ink">{title}</h2>
    <div className="mt-4">{children}</div>
  </section>;
}

export function Kpi({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <article className="min-h-28 rounded-card border border-line bg-paper p-4 shadow-card">
    <p className="text-sm font-medium text-muted">{label}</p>
    <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</p>
    {detail ? <p className="mt-1 text-xs text-muted">{detail}</p> : null}
  </article>;
}

function ConfidencePanel({ quality }: { quality: Report | null }) {
  return <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-card border border-brand-line bg-brand-soft px-4 py-3 text-sm text-ink">
    <span><strong>Data confidence</strong> · {display(quality?.complete_stage_history_rate, "%")} complete stage history</span>
    <span>{display(quality?.excluded_short_stage_count)} short stage durations excluded · {display(quality?.episodes_without_stage_events)} episodes with no stage events</span>
  </div>;
}

function Overview({ report }: { report: Report }) {
  const informed = record(report.informed_rate);
  const saved = record(report.estimated_staff_minutes_saved);
  const savedInputs = record(saved.inputs);
  const change = num(report.inquiries_per_episode_difference);
  const average = display(report.average_total_minutes, " min");
  const expected = display(report.expected_total_minutes, " min");
  return <>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi label="Episodes" value={display(report.episodes_count)} />
      <Kpi label="Average total time vs expected" value={average} detail={`Expected ${expected}`} />
      <Kpi label="On-time rate" value={display(report.on_time_rate, "%")} />
      <Kpi label="Delay rate" value={display(report.delay_rate, "%")} />
      <Kpi label="Inquiries per episode" value={display(report.inquiries_per_episode)} detail={`${change === null ? "No baseline comparison" : `${change > 0 ? "+" : ""}${change} vs baseline`}`} />
      <Kpi label="Informed rate" value={suppressed(informed) ? "Not enough data yet" : display(informed.rate, "%")} detail={suppressed(informed) ? undefined : `Yes ${display(informed.yes)} · Somewhat ${display(informed.somewhat)} · No ${display(informed.no)}`} />
      <Kpi label="Estimated staff hours saved" value={display(saved.hours, " hrs")} detail={`${display(saved.minutes)} minutes`} />
      <Kpi label="Family checks per episode" value={display(report.family_checks_per_episode)} />
    </div>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <Panel title="Generated insights">
        {array(report.insights).length === 0 ? <p className="text-sm text-muted">Not enough data yet to generate insights.</p> :
          <ul className="space-y-3">{array(report.insights).map((insight, index) => <li key={`${text(insight.type)}-${index}`} className="rounded-control border border-line bg-canvas p-4">
            <p className="font-semibold text-ink">{insightTitle(insight)}</p>
            <p className="mt-1 text-sm text-muted">{insightNumbers(insight)}</p>
          </li>)}</ul>}
      </Panel>
      <Panel title="Estimated staff time saved">
        <details>
          <summary className="min-h-11 cursor-pointer font-semibold text-brand">Formula and assumptions</summary>
          <p className="mt-2 text-sm leading-relaxed text-muted">{text(savedInputs.assumption)}</p>
          <p className="mt-2 text-sm text-muted">{display(savedInputs.inquiries)} inquiries × {display(savedInputs.minutes_per_inquiry)} minutes per inquiry = {display(saved.minutes)} minutes.</p>
        </details>
      </Panel>
    </div>
  </>;
}

function insightTitle(insight: Json): string {
  if (insight.type === "highest_minutes_lost") return `${text(insight.stage)} has the highest minutes lost`;
  if (insight.type === "highest_hourly_overrun") return `Highest average overrun is at ${text(insight.hour)}:00`;
  if (insight.type === "most_common_delay_reason") return `Most common recorded delay: ${text(insight.reason)}`;
  if (insight.type === "inquiries_vs_baseline") return "Inquiries compared with baseline";
  return "Pattern in the selected period";
}

function insightNumbers(insight: Json): string {
  return Object.entries(insight)
    .filter(([key]) => key !== "type")
    .map(([key, value]) => `${key.replaceAll("_", " ")}: ${String(value)}`)
    .join(" · ");
}

function Bottlenecks({ report }: { report: Report }) {
  const stages = array(report.stages);
  const heat = array(report.heatmap);
  return <div className="space-y-4">
    <Panel title="Stage time: median and 90th percentile vs expected">
      {stages.some((stage) => suppressed(stage)) ? <p className="mb-3 text-sm text-muted">Some groups are hidden until there are enough episodes.</p> : null}
      <div className="space-y-4">
        {stages.map((stage) => <div key={String(stage.position)} tabIndex={0} aria-label={`${text(stage.stage)}: median ${display(stage.median_minutes)} minutes, p90 ${display(stage.p90_minutes)} minutes, expected ${display(stage.expected_minutes)} minutes`} title={`${text(stage.stage)} · median ${display(stage.median_minutes)} · p90 ${display(stage.p90_minutes)} · expected ${display(stage.expected_minutes)}`}>
          <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{text(stage.stage)}</span>{suppressed(stage) ? <span className="text-muted">Not enough data yet</span> : <span className="text-muted">Median {display(stage.median_minutes)} · p90 {display(stage.p90_minutes)} · expected {display(stage.expected_minutes)}</span>}</div>
          {!suppressed(stage) ? <div className="space-y-1">
            <Bar label="Median" value={num(stage.median_minutes) ?? 0} max={chartMax(stages)} color="bg-brand" />
            <Bar label="P90" value={num(stage.p90_minutes) ?? 0} max={chartMax(stages)} color="bg-warning-line" />
            <Bar label="Expected" value={num(stage.expected_minutes) ?? 0} max={chartMax(stages)} color="bg-muted" />
          </div> : null}
        </div>)}
      </div>
      <table className="sr-only"><caption>Stage time values</caption><thead><tr><th>Stage</th><th>Median</th><th>90th percentile</th><th>Expected</th></tr></thead><tbody>{stages.map((stage) => <tr key={String(stage.position)}><td>{text(stage.stage)}</td><td>{suppressed(stage) ? "Not enough data yet" : display(stage.median_minutes)}</td><td>{suppressed(stage) ? "Not enough data yet" : display(stage.p90_minutes)}</td><td>{suppressed(stage) ? "Not enough data yet" : display(stage.expected_minutes)}</td></tr>)}</tbody></table>
    </Panel>
    <Panel title="Minutes lost by stage">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm"><thead><tr className="border-b border-line text-muted"><th className="py-2">Stage</th><th>Sample</th><th>Minutes lost</th><th>Over expected</th></tr></thead>
          <tbody>{stages.map((stage) => <tr key={String(stage.position)} className="border-b border-line last:border-0"><th className="py-3 font-medium">{text(stage.stage)}</th><td>{suppressed(stage) ? "Not enough data yet" : display(stage.sample_size)}</td><td>{display(stage.minutes_lost ?? stage)}</td><td>{display(stage.share_over_expected ?? stage, "%")}</td></tr>)}</tbody></table>
      </div>
    </Panel>
    <Panel title="Average overrun by weekday and hour">
      <p className="mb-3 text-sm text-muted">Average minutes over expected. Each cell has a text value and is keyboard focusable.</p>
      <Heatmap cells={heat} />
    </Panel>
  </div>;
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return <div className="flex items-center gap-2 text-xs">
    <span className="w-16 shrink-0 text-muted">{label}</span>
    <div className="h-3 flex-1 rounded-full bg-canvas"><div className={`h-3 rounded-full ${color}`} style={{ width: `${Math.min(value / max * 100, 100)}%` }} /></div>
    <span className="w-10 text-right text-muted">{value}</span>
  </div>;
}

function chartMax(stages: Json[]): number {
  return Math.max(1, ...stages.flatMap((stage) => [num(stage.median_minutes), num(stage.p90_minutes), num(stage.expected_minutes)]).filter((value): value is number => value !== null));
}

export function Heatmap({ cells }: { cells: Json[] }) {
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const lookup = new Map(cells.map((cell) => [`${cell.weekday}:${cell.hour}`, cell]));
  return <>
    <div className="overflow-x-auto">
      <div className="min-w-[48rem]">
        <div className="grid grid-cols-[2.4rem_repeat(24,minmax(1.3rem,1fr))] gap-1">
          <span />
          {Array.from({ length: 24 }, (_, hour) => <span key={hour} className="text-center text-[10px] text-muted">{hour}</span>)}
          {weekdays.map((day, weekday) => <div key={day} className="contents">
            <span className="self-center text-xs text-muted">{day}</span>
            {Array.from({ length: 24 }, (_, hour) => {
              const cell = lookup.get(`${weekday}:${hour}`);
              const value = num(cell?.average_overrun_minutes);
              const isSuppressed = !cell || suppressed(cell) || value === null;
              const level = value === null ? 0 : Math.min(value / 60, 1);
              const color = isSuppressed ? "#e8eee9" : `color-mix(in srgb, #d6a64c ${Math.round(level * 80)}%, #cfe4d5)`;
              const label = isSuppressed ? "Not enough data yet" : `${value} average minutes over expected, ${display(cell.count)} episodes`;
              return <button key={hour} type="button" tabIndex={0} aria-label={`${day} ${hour}:00: ${label}`} title={`${day} ${hour}:00 · ${label}`} className="flex aspect-square min-h-5 items-center justify-center rounded-[3px] border border-line text-[8px] font-medium text-ink focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-brand" style={{ backgroundColor: color }}>
                {isSuppressed ? "—" : value}
              </button>;
            })}
          </div>)}
        </div>
      </div>
    </div>
    <table className="sr-only"><caption>Weekday and hour overrun values</caption><thead><tr><th>Weekday</th><th>Hour</th><th>Average overrun</th><th>Sample size</th></tr></thead><tbody>{cells.map((cell) => <tr key={`${cell.weekday}-${cell.hour}`}><td>{weekdays[Number(cell.weekday)]}</td><td>{display(cell.hour)}</td><td>{suppressed(cell) ? "Not enough data yet" : display(cell.average_overrun_minutes)}</td><td>{suppressed(cell) ? "Not enough data yet" : display(cell.count)}</td></tr>)}</tbody></table>
  </>;
}

function Delays({ report }: { report: Report }) {
  const reasons = array(report.reason_mix);
  const trend = array(report.daily_trend);
  const stages = array(report.delays_by_stage);
  const calls = array(report.call_care_team_events);
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi label="Delay count" value={display(report.delay_count)} />
      <Kpi label="Total delay minutes" value={display(report.total_delay_minutes)} />
      <Kpi label="Average delay minutes" value={display(report.average_delay_minutes)} />
      <Kpi label="Call-the-care-team events" value={display(report.call_care_team_count)} />
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Daily delay trend"><MiniTrend rows={trend} label="Daily delays" /></Panel>
      <Panel title="Recorded delay reasons">
        <ul className="space-y-3">{reasons.map((row) => <li key={String(row.reason)}><div className="mb-1 flex justify-between text-sm"><span>{text(row.reason).replaceAll("_", " ")}</span><span>{suppressed(row) ? "Not enough data yet" : display(row.count)}</span></div><div className="h-3 rounded-full bg-canvas"><div className="h-3 rounded-full bg-warning-line" style={{ width: `${suppressed(row) ? 0 : Math.min((num(row.count) ?? 0) / Math.max(1, num(report.delay_count) ?? 1) * 100, 100)}%` }} /></div></li>)}</ul>
        <table className="sr-only"><caption>Delay reasons and counts</caption><thead><tr><th>Reason</th><th>Count</th></tr></thead><tbody>{reasons.map((row) => <tr key={String(row.reason)}><td>{text(row.reason)}</td><td>{display(row.count)}</td></tr>)}</tbody></table>
      </Panel>
      <Panel title="Delays by stage">
        <ul className="space-y-2">{stages.map((row) => <li key={String(row.position)} className="flex justify-between border-b border-line py-2 text-sm last:border-0"><span>{text(row.stage)}</span><strong>{suppressed(row) ? "Not enough data yet" : display(row.count)}</strong></li>)}</ul>
      </Panel>
      <Panel title="Call the care team">
        {suppressed(report.call_care_team_events) ? <p className="text-sm text-muted">Not enough data yet.</p> : calls.length === 0 ? <p className="text-sm text-muted">No events in this period.</p> : <ul className="max-h-72 space-y-2 overflow-y-auto">{calls.map((row, index) => <li key={`${row.date}-${row.time}-${index}`} className="flex justify-between gap-3 border-b border-line py-2 text-sm last:border-0"><span>{text(row.date)} · {text(row.time)}</span><span className="text-right font-medium">{text(row.stage)}</span></li>)}</ul>}
      </Panel>
    </div>
  </div>;
}

function InquiryReport({ report }: { report: Report }) {
  const channels = array(report.by_channel);
  const hourly = array(report.by_hour);
  const peak = hourly.reduce<Json | null>((best, row) => !best || (num(row.count) ?? 0) > (num(best.count) ?? 0) ? row : best, null);
  const feedback = array(report.feedback_by_week);
  const checksRatio = num(report.checks_to_inquiries_ratio);
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi label="Total inquiries" value={display(report.total)} />
      <Kpi label="Inquiries per episode" value={display(report.per_episode)} detail={`Baseline ${display(report.baseline_per_episode)}`} />
      <Kpi label="Family checks per episode" value={display(report.family_checks_per_episode)} />
      <Kpi label="Checks to inquiries" value={suppressed(report.checks_to_inquiries_ratio) ? "Not enough data yet" : checksRatio === null ? "—" : `${checksRatio}:1`} />
      <Kpi label="Informed rate" value={suppressed(report.informed_rate) ? "Not enough data yet" : display(record(report.informed_rate).rate, "%")} />
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Inquiries by channel">
        {channels.length === 0 ? <p className="text-sm text-muted">Not enough data yet.</p> : <ul className="space-y-3">{channels.map((row) => <li key={String(row.channel)} className="flex justify-between rounded-control bg-canvas px-3 py-2 text-sm"><span>{text(row.channel)}</span><strong>{suppressed(row) ? "Not enough data yet" : display(row.count)}</strong></li>)}</ul>}
      </Panel>
      <Panel title="Daily inquiry trend"><MiniTrend rows={array(report.by_day)} label="Daily inquiries" /></Panel>
      <Panel title="Peak inquiry hours"><MiniTrend rows={hourly} label="Inquiries by hour" xKey="hour" />{peak ? <p className="mt-3 text-sm text-muted">Busiest hour: {display(peak.hour)}:00 with {display(peak.count)} inquiries.</p> : null}</Panel>
      <Panel title="Informed rate and weekly feedback">
        <p className="mb-3 text-sm text-muted">Feedback is shown as counts, not linked to any episode.</p>
        <MiniTrend rows={feedback} label="Weekly feedback counts" xKey="week" />
        <table className="sr-only"><caption>Weekly family feedback counts</caption><thead><tr><th>Week</th><th>Yes</th><th>Somewhat</th><th>No</th></tr></thead><tbody>{feedback.map((row) => <tr key={String(row.week)}><td>{text(row.week)}</td><td>{display(row.yes)}</td><td>{display(row.somewhat)}</td><td>{display(row.no)}</td></tr>)}</tbody></table>
      </Panel>
    </div>
  </div>;
}

function MiniTrend({ rows, label, xKey = "date" }: { rows: Json[]; label: string; xKey?: string }) {
  const maximum = Math.max(1, ...rows.flatMap((row) => [num(row.count), num(row.yes), num(row.somewhat), num(row.no)]).filter((value): value is number => value !== null));
  if (rows.length === 0) return <p className="text-sm text-muted">Not enough data yet.</p>;
  return <>
    <div role="img" aria-label={label} className="flex h-40 items-end gap-1 overflow-x-auto border-b border-line px-1">
      {rows.map((row, index) => {
        const total = (num(row.count) ?? 0) + (num(row.yes) ?? 0) + (num(row.somewhat) ?? 0) + (num(row.no) ?? 0);
        const height = Math.max(4, total / maximum * 100);
        const hidden = suppressed(row);
        const label = hidden ? "Not enough data yet" : String(total);
        return <div key={`${String(row[xKey])}-${index}`} tabIndex={0} title={`${String(row[xKey])}: ${label}`} aria-label={`${String(row[xKey])}: ${label}`} className="flex min-w-3 flex-1 items-end justify-center focus-visible:outline-2 focus-visible:outline-brand">
          <span className="w-full rounded-t bg-brand" style={{ height: `${hidden ? 0 : height}%` }} />
        </div>;
      })}
    </div>
    <table className="sr-only"><caption>{label}</caption><thead><tr><th>Period</th><th>Count</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${String(row[xKey])}-${index}`}><td>{text(row[xKey])}</td><td>{suppressed(row) ? "Not enough data yet" : display(row.count ?? ((num(row.yes) ?? 0) + (num(row.somewhat) ?? 0) + (num(row.no) ?? 0)))}</td></tr>)}</tbody></table>
  </>;
}
