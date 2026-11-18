"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Settings = {
  grace_minutes: number;
  minutes_per_inquiry: number;
  baseline_inquiries_per_episode: number | null;
  minimum_sample_size: number;
};

const EMPTY: Settings = {
  grace_minutes: 5,
  minutes_per_inquiry: 3,
  baseline_inquiries_per_episode: 3,
  minimum_sample_size: 5,
};

const FIELD_DETAILS: { key: keyof Settings; label: string; description: string; min: number; max: number; step?: string }[] = [
  { key: "grace_minutes", label: "Grace minutes", description: "An episode is counted as on time when it finishes within this many minutes of the expected total.", min: 0, max: 240 },
  { key: "minutes_per_inquiry", label: "Minutes per inquiry", description: "Assumed staff time represented by one family inquiry. Used only for the estimated staff-hours-saved figure.", min: 1, max: 120 },
  { key: "baseline_inquiries_per_episode", label: "Baseline inquiries per episode", description: "Compare with a week before using CareTrack. Divide total inquiries by number of procedures.", min: 0, max: 10000, step: "any" },
  { key: "minimum_sample_size", label: "Minimum sample size", description: "Groups with fewer episodes than this are hidden as “Not enough data yet.”", min: 1, max: 10000 },
];

export function MetricSettingsForm() {
  const [values, setValues] = useState<Settings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/staff/settings/metrics", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("settings_load_failed");
        const body = await response.json() as { settings?: Partial<Settings> };
        if (active && body.settings) setValues({ ...EMPTY, ...body.settings });
      })
      .catch(() => { if (active) setMessage("Settings could not be loaded. Please try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/staff/settings/metrics", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ settings: values }),
      });
      const body = await response.json() as { settings?: Settings; details?: Record<string, string[]> };
      if (!response.ok) {
        const detail = Object.values(body.details ?? {}).flat().join(" ");
        setMessage(detail || "Check the values and try again.");
      } else {
        if (body.settings) setValues({ ...EMPTY, ...body.settings });
        setMessage("Settings saved. Insights will use these values on the next view.");
      }
    } catch {
      setMessage("Settings could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={save} className="rounded-card border border-line bg-paper p-card shadow-card">
    {loading ? <p role="status" className="text-sm text-muted">Loading settings…</p> : FIELD_DETAILS.map((field) => (
      <label key={field.key} className="mb-5 block">
        <span className="font-semibold text-ink">{field.label}</span>
        <span className="mt-1 block text-sm leading-relaxed text-muted">{field.description}</span>
        {field.key === "baseline_inquiries_per_episode" ? (
          <span className="mt-1 block text-xs text-muted">Measure this for one week before using CareTrack: total inquiries divided by number of procedures. <Link href="/staff/insights/baseline-week" className="font-semibold text-brand underline">Open the paper tally sheet</Link>.</span>
        ) : null}
        <input
          required={field.key !== "baseline_inquiries_per_episode"}
          type="number"
          min={field.min}
          max={field.max}
          step={field.step ?? "1"}
          value={values[field.key] ?? ""}
          onChange={(event) => {
            const value = event.target.value === "" ? null : Number(event.target.value);
            setValues((current) => ({ ...current, [field.key]: value }));
          }}
          className="mt-2 h-12 w-full rounded-control border border-line bg-paper px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        />
      </label>
    ))}
    <button type="submit" disabled={saving || loading} className="min-h-12 rounded-control bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-60">
      {saving ? "Saving…" : "Save settings"}
    </button>
    {message ? <p role={message.startsWith("Settings saved") ? "status" : "alert"} className="mt-3 text-sm text-muted">{message}</p> : null}
    <aside className="mt-8 rounded-control border border-line bg-white p-4" aria-labelledby="analytics-limitations-title">
      <h2 id="analytics-limitations-title" className="font-semibold text-ink">Analytics limitations</h2>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
        <li>Inquiry counts are a minimum: staff may miss contacts or log several taps in a batch.</li>
        <li>Estimated staff time is based on the configured minutes-per-inquiry assumption, not measured savings.</li>
        <li>Patterns describe associations and do not establish causes or clinical outcomes.</li>
      </ul>
      <Link
        href="https://github.com/Muturi-Job/care-track/blob/main/docs/analytics.md"
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block font-semibold text-brand underline"
      >
        Read metric definitions, formulas, and data quality rules
      </Link>
    </aside>
  </form>;
}
