import { format } from "date-fns";

import type {
  DelayReason,
  StageHistoryEntry,
  StaffEpisode,
  StatusFlag,
} from "./types";
import { DELAY_REASON_LABELS } from "./types";

/** "12 min", "1 h", "2 h 05 min": short enough for a phone card. */
export function formatMinutes(minutes: number): string {
  const whole = Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes) : 0;
  if (whole < 60) return `${whole} min`;

  const hours = Math.floor(whole / 60);
  const rest = whole % 60;

  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, "0")} min`;
}

export function overdueLabel(episode: Pick<StaffEpisode, "minutesOverdue">): string | null {
  return episode.minutesOverdue > 0 ? `Overdue by ${formatMinutes(episode.minutesOverdue)}` : null;
}

/**
 * Flagged episodes come first, then overdue ones: the top of the list is
 * always what needs a person.
 */
export function attentionRank(episode: StaffEpisode): number {
  if (episode.statusFlag !== "normal") return 0;

  return episode.minutesOverdue > 0 ? 1 : 2;
}

export function sortForStaff(episodes: StaffEpisode[]): StaffEpisode[] {
  return [...episodes].sort(
    (a, b) =>
      attentionRank(a) - attentionRank(b) ||
      b.minutesOverdue - a.minutesOverdue ||
      b.minutesInStage - a.minutesInStage,
  );
}

export function flagLabel(
  episode: Pick<StaffEpisode, "statusFlag" | "delayReason">,
): string | null {
  if (episode.statusFlag === "delayed") {
    const reason = episode.delayReason ? DELAY_REASON_LABELS[episode.delayReason] : null;

    return reason ? `Delayed: ${reason}` : "Delayed";
  }

  if (episode.statusFlag === "call_care_team") return "Call the care team";

  return null;
}

/** Optimistic updates: the card changes before the API answers. */
export function applyAdvance(episodes: StaffEpisode[], id: string): StaffEpisode[] {
  return episodes.map((episode) => {
    if (episode.id !== id) return episode;

    return {
      ...episode,
      stagePosition: episode.stagePosition + 1,
      stageLabel: episode.nextStageLabel ?? episode.stageLabel,
      nextStageLabel: null,
      minutesInStage: 0,
      minutesOverdue: 0,
    };
  });
}

export function applyFlag(
  episodes: StaffEpisode[],
  id: string,
  statusFlag: StatusFlag,
  delayReason: DelayReason | null,
): StaffEpisode[] {
  return episodes.map((episode) =>
    episode.id === id
      ? { ...episode, statusFlag, delayReason: statusFlag === "delayed" ? delayReason : null }
      : episode,
  );
}

export function applyClearFlag(episodes: StaffEpisode[], id: string): StaffEpisode[] {
  return episodes.map((episode) =>
    episode.id === id ? { ...episode, statusFlag: "normal", delayReason: null } : episode,
  );
}

export function describeHistoryEntry(entry: StageHistoryEntry): string {
  switch (entry.eventType) {
    case "advanced":
      return `Moved to ${entry.label}`;
    case "undone":
      return `Went back to ${entry.label}`;
    case "flagged":
      return `Flag set while at ${entry.label}`;
    case "flag_cleared":
      return `Flag cleared while at ${entry.label}`;
    default:
      return `Update while at ${entry.label}`;
  }
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return format(date, "d MMM yyyy, HH:mm");
}
