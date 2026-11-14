import Link from "next/link";

import { fetchApiHealth } from "@/lib/api";

export async function HomeHealthIndicator() {
  const health = await fetchApiHealth();
  const apiLabel = health.status === "ok" ? "API available" : "API unavailable";
  const databaseLabel = `Database ${health.database}`;

  return (
    <Link
      href="/status"
      aria-label={`System status: ${apiLabel}; ${databaseLabel}. View details`}
      className="inline-flex min-h-11 items-center gap-2 rounded-control px-2 text-xs text-muted underline-offset-2 hover:text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none"
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${health.status === "ok" ? "bg-brand" : "bg-warning-ink"}`}
      />
      <span>{apiLabel} · {databaseLabel}</span>
    </Link>
  );
}
