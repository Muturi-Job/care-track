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
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
        <Link
          href="/staff"
          className="inline-flex min-h-11 items-center text-sm font-medium text-emerald-800 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        >
          Back to staff list
        </Link>
        <p role="alert" className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Could not load this episode. Please try again.
        </p>
      </main>
    );
  }

  if (episode === null) notFound();

  const flag = flagLabel(episode);

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <Link
        href="/staff"
        className="inline-flex min-h-11 items-center text-sm font-medium text-emerald-800 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
      >
        Back to staff list
      </Link>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
        {episode.alias}
      </h1>
      <p className="text-sm text-neutral-700">
        {episode.bed} · {episode.procedureName}
      </p>

      <section
        aria-labelledby="current-stage"
        className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
      >
        <h2
          id="current-stage"
          className="text-xs font-medium tracking-wide text-neutral-600 uppercase"
        >
          Current stage
        </h2>
        <p className="mt-1 text-lg font-medium text-neutral-900">{episode.stageLabel}</p>
        <p className="text-sm text-neutral-700">
          {formatMinutes(episode.minutesInStage)} in this stage
        </p>

        {flag ? (
          <p
            className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              episode.statusFlag === "delayed"
                ? "bg-amber-200 text-amber-900"
                : "bg-sky-100 text-sky-900"
            }`}
          >
            {flag}
          </p>
        ) : null}
      </section>

      <h2 className="mt-6 text-lg font-semibold text-neutral-900">Stage history</h2>

      {episode.history.length === 0 ? (
        <p className="mt-2 rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          No changes yet.
        </p>
      ) : (
        <ol className="mt-2 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
          {episode.history.map((entry, index) => (
            <li key={`${entry.at}-${entry.eventType}-${index}`} className="p-4">
              <p className="text-sm font-medium text-neutral-900">{describeHistoryEntry(entry)}</p>
              <time dateTime={entry.at} className="text-xs text-neutral-600">
                {formatTimestamp(entry.at)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
