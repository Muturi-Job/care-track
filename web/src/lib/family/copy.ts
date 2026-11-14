import type { ExpectedDuration, StageState } from "./types";

/** "Last checked 2 minutes ago": short, plain, and easy to test. */
export function describeAge(fromMs: number, nowMs: number): string {
  const seconds = Math.max(0, Math.round((nowMs - fromMs) / 1000));
  if (seconds < 45) return "just now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;

  const days = Math.round(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

/** A range, never one number that could read like a promise (rule 4). */
export function expectedDurationText(duration: ExpectedDuration | null): string | null {
  if (duration === null) return null;

  const { minMinutes, maxMinutes } = duration;
  if (minMinutes === maxMinutes) return `Usually about ${minMinutes} minutes.`;

  return `Usually about ${minMinutes} to ${maxMinutes} minutes.`;
}

/** A tap-to-call number, or null when there is nothing to dial. */
export function telHref(phone: string): string | null {
  const cleaned = phone.replace(/[^\d+]/g, "");

  return /\d/.test(cleaned) ? `tel:${cleaned}` : null;
}

/** The state is always written out, so colour is never the only signal. */
export function stageStateLabel(state: StageState): string {
  switch (state) {
    case "done":
      return "Done";
    case "current":
      return "Now";
    default:
      return "Coming up";
  }
}

/**
 * Absolute time, pinned to one locale and zone so the server-rendered HTML and
 * the browser agree (a relative phrase would drift during hydration).
 */
export function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(date);
}
