"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { flagLabel, formatMinutes, overdueLabel } from "@/lib/staff/episodes";
import { DELAY_REASONS, DELAY_REASON_LABELS } from "@/lib/staff/types";
import type { DelayReason, StaffEpisode } from "@/lib/staff/types";

import { ShareLinks } from "./share-links";

export type EpisodeCardProps = {
  episode: StaffEpisode;
  /** Absolute family page URL, built once on the server. */
  familyUrl: string;
  busy?: boolean;
  onAdvance: (episode: StaffEpisode) => void;
  onDelay: (episode: StaffEpisode, reason: DelayReason) => void;
  onCallCareTeam: (episode: StaffEpisode) => void;
  onClearFlag: (episode: StaffEpisode) => void;
};

export function EpisodeCard({
  episode,
  familyUrl,
  busy = false,
  onAdvance,
  onDelay,
  onCallCareTeam,
  onClearFlag,
}: EpisodeCardProps) {
  const headingId = useId();
  const reasonId = useId();
  const [reason, setReason] = useState<DelayReason>(DELAY_REASONS[0]);

  const overdue = overdueLabel(episode);
  const flag = flagLabel(episode);
  const noNextStage = episode.isFinalStage || episode.nextStageLabel === null;

  const advanceLabel = episode.isFinalStage
    ? "Final stage reached"
    : episode.nextStageLabel !== null
      ? `Advance to: ${episode.nextStageLabel}`
      : "Updating…";

  return (
    <article
      aria-labelledby={headingId}
      className={`rounded-2xl border p-4 shadow-sm ${
        overdue ? "border-amber-300 bg-amber-50" : "border-neutral-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="truncate text-lg font-semibold text-neutral-900">
            {episode.alias}
          </h2>
          <p className="text-sm text-neutral-700">
            {episode.bed} · {episode.procedureName}
          </p>
        </div>

        {overdue ? (
          <span className="shrink-0 rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold text-amber-900">
            {overdue}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-base font-medium text-neutral-900">{episode.stageLabel}</p>
      <p className="text-sm text-neutral-700">
        {formatMinutes(episode.minutesInStage)} in this stage
        {episode.expectedMinutes !== null
          ? ` · usually about ${formatMinutes(episode.expectedMinutes)}`
          : ""}
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

      <button
        type="button"
        onClick={() => onAdvance(episode)}
        disabled={busy || noNextStage}
        className={`mt-4 flex min-h-12 w-full items-center justify-center rounded-xl px-4 text-base font-semibold shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed ${
          noNextStage
            ? "bg-neutral-200 text-neutral-700"
            : "bg-emerald-700 text-white hover:bg-emerald-800"
        }`}
      >
        {advanceLabel}
      </button>

      <details className="mt-3 rounded-xl border border-neutral-200 bg-white">
        <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-semibold text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
          More actions
        </summary>

        <div className="space-y-3 border-t border-neutral-200 p-3">
          <div>
            <label htmlFor={reasonId} className="block text-sm font-medium text-neutral-900">
              Reason for delay
            </label>
            <select
              id={reasonId}
              value={reason}
              onChange={(event) => setReason(event.target.value as DelayReason)}
              className="mt-1 h-12 w-full rounded-xl border border-neutral-300 bg-white px-3 text-base text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              {DELAY_REASONS.map((value) => (
                <option key={value} value={value}>
                  {DELAY_REASON_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <MenuButton label="Mark as delayed" disabled={busy} onClick={() => onDelay(episode, reason)} />
          <MenuButton
            label="Call the care team"
            disabled={busy}
            onClick={() => onCallCareTeam(episode)}
          />
          {episode.statusFlag !== "normal" ? (
            <MenuButton label="Clear flag" disabled={busy} onClick={() => onClearFlag(episode)} />
          ) : null}
        </div>
      </details>

      <div className="mt-3">
        <ShareLinks url={familyUrl} alias={episode.alias} size="sm" />
      </div>

      <Link
        href={`/staff/episodes/${episode.id}`}
        className="inline-flex min-h-11 items-center text-sm font-medium text-emerald-800 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
      >
        View stage history
      </Link>
    </article>
  );
}

function MenuButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-12 w-full items-center rounded-xl border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:text-neutral-500"
    >
      {label}
    </button>
  );
}
