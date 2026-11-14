const DEFAULT_POLL_INTERVAL_MS = 10_000;
const MINIMUM_POLL_INTERVAL_MS = 1_000;

/**
 * How often the staff list and the family page ask for fresh data
 * (CLAUDE.md rule 5: simple polling, no websockets).
 */
export function pollIntervalMs(): number {
  const configured = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS);

  if (!Number.isFinite(configured) || configured < MINIMUM_POLL_INTERVAL_MS) {
    return DEFAULT_POLL_INTERVAL_MS;
  }

  return Math.floor(configured);
}
