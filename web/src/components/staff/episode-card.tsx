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
      className={`rounded-card border p-card shadow-card ${
        overdue ? "border-warning-line bg-warning-soft" : "border-line bg-paper"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="truncate text-lg font-semibold text-ink">
            {episode.alias}
          </h2>
          <p className="text-sm text-muted">
            {episode.bed} · {episode.procedureName}
          </p>
        </div>

        {overdue ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-warning-line bg-warning-soft px-3 py-1.5 text-xs font-semibold text-warning-ink">
            <StatusIcon kind="delay" />
            {overdue}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white">
          <StatusIcon kind="current" />
        </span>
        <div>
          <p className="text-caption font-semibold tracking-wide text-muted uppercase">Current stage</p>
          <p className="text-base font-semibold text-ink">{episode.stageLabel}</p>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted">
        {formatMinutes(episode.minutesInStage)} in this stage
        {episode.expectedMinutes !== null
          ? ` · usually about ${formatMinutes(episode.expectedMinutes)}`
          : ""}
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

      <button
        type="button"
        onClick={() => onAdvance(episode)}
        disabled={busy || noNextStage}
        className={`mt-4 flex min-h-12 w-full items-center justify-center rounded-control px-4 text-base font-semibold shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:cursor-not-allowed ${
          noNextStage
            ? "bg-line text-muted"
            : "bg-brand text-white hover:bg-brand-strong"
        }`}
      >
        {advanceLabel}
      </button>

      <details className="mt-3 rounded-control border border-line bg-paper">
        <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
          More actions
        </summary>

        <div className="space-y-3 border-t border-line p-3">
          <div>
            <label htmlFor={reasonId} className="block text-sm font-medium text-ink">
              Reason for delay
            </label>
            <select
              id={reasonId}
              value={reason}
              onChange={(event) => setReason(event.target.value as DelayReason)}
              className="mt-1 h-12 w-full rounded-control border border-line bg-paper px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
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
        className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
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
      className="flex min-h-12 w-full items-center rounded-control border border-line bg-paper px-3 text-sm font-semibold text-ink hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-muted"
    >
      {label}
    </button>
  );
}

function StatusIcon({ kind }: { kind: "delay" | "call" | "current" }) {
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
      ) : kind === "call" ? (
        <path d="M5.5 3.5 7.5 3l1.5 3.5-1.7 1.7a10 10 0 0 0 4.5 4.5l1.7-1.7 3.5 1.5-.5 2a1.7 1.7 0 0 1-1.7 1.4A12.5 12.5 0 0 1 4.1 5.2a1.7 1.7 0 0 1 1.4-1.7Z" />
      ) : (
        <>
          <path d="M10 3v7l4 2" />
          <circle cx="10" cy="10" r="7" />
        </>
      )}
    </svg>
  );
}
