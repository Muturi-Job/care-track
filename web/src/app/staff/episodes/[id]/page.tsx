import Link from "next/link";
import { notFound } from "next/navigation";

import {
  describeHistoryEntry,
  flagLabel,
  formatMinutes,
  formatTimestamp,
} from "@/lib/staff/episodes";
import { loadEpisode } from "@/lib/staff/server";
import type { StaffEpisode } from "@/lib/staff/types";

export const dynamic = "force-dynamic";

// ACCESS CONTROL LATER: staff-only once real access control exists; Phase A
// deliberately has none (CLAUDE.md rule 1).

export default async function EpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let episode: StaffEpisode | null;

  try {
    episode = await loadEpisode(id);
  } catch {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-page py-8">
        <Link
          href="/staff"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Back to staff list
        </Link>
        <p role="alert" className="mt-4 rounded-card border border-warning-line bg-warning-soft p-card text-sm text-warning-ink">
          Could not load this episode. Please try again.
        </p>
      </main>
    );
  }

  if (episode === null) notFound();

  const flag = flagLabel(episode);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-page py-8">
      <Link
        href="/staff"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Back to staff list
      </Link>

      <h1 className="mt-2 text-page-title font-semibold tracking-tight text-ink">
        {episode.alias}
      </h1>
      <p className="text-sm text-muted">
        {episode.bed} · {episode.procedureName}
      </p>

      <section
        aria-labelledby="current-stage"
        className="mt-6 rounded-card border border-line bg-paper p-card shadow-card"
      >
        <h2
          id="current-stage"
          className="text-caption font-semibold tracking-wide text-muted uppercase"
        >
          Current stage
        </h2>
        <p className="mt-1 text-section-title font-semibold text-ink">{episode.stageLabel}</p>
        <p className="text-sm text-muted">
          {formatMinutes(episode.minutesInStage)} in this stage
        </p>

        {flag ? (
          <p
            className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
              episode.statusFlag === "delayed"
                ? "bg-warning-soft text-warning-ink"
                : "bg-info-soft text-info-ink"
            }`}
          >
            <StatusIcon kind={episode.statusFlag === "delayed" ? "delay" : "call"} />
            {flag}
          </p>
        ) : null}
      </section>

      <h2 className="mt-section text-section-title font-semibold text-ink">Stage history</h2>

      {episode.history.length === 0 ? (
        <p className="mt-2 rounded-card border border-line bg-paper p-card text-sm text-muted">
          No changes yet.
        </p>
      ) : (
        <ol className="mt-2 divide-y divide-line rounded-card border border-line bg-paper">
          {episode.history.map((entry, index) => (
            <li key={`${entry.at}-${entry.eventType}-${index}`} className="p-4">
              <p className="text-sm font-medium text-ink">{describeHistoryEntry(entry)}</p>
              <time dateTime={entry.at} className="text-caption text-muted">
                {formatTimestamp(entry.at)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}

function StatusIcon({ kind }: { kind: "delay" | "call" }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      {kind === "delay" ? (
        <>
          <circle cx="10" cy="10" r="7" />
          <path d="M10 6v4l2.5 1.5" />
        </>
      ) : (
        <path d="M5.5 3.5 7.5 3l1.5 3.5-1.7 1.7a10 10 0 0 0 4.5 4.5l1.7-1.7 3.5 1.5-.5 2a1.7 1.7 0 0 1-1.7 1.4A12.5 12.5 0 0 1 4.1 5.2a1.7 1.7 0 0 1 1.4-1.7Z" />
      )}
    </svg>
  );
}
