import Link from "next/link";

import { fetchApiHealth } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const health = await fetchApiHealth();
  const apiOk = health.status === "ok";

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-page py-8 sm:py-12">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Back to CareTrack
      </Link>

      <h1 className="mt-3 text-page-title font-semibold tracking-tight text-ink">
        System status
      </h1>

      <section
        aria-labelledby="system-status"
        className="mt-5 rounded-card border border-line bg-paper p-card shadow-card"
      >
        <h2
          id="system-status"
          className="text-caption font-semibold tracking-wide text-muted uppercase"
        >
          Service health
        </h2>

        <dl className="mt-4 space-y-3 text-sm text-ink">
          <div className="flex items-center gap-3">
            <dt className="w-20 text-muted">API</dt>
            <dd className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`inline-block h-2 w-2 rounded-full ${
                  apiOk ? "bg-brand" : "bg-warning-ink"
                }`}
              />
              <span>{`API: ${apiOk ? "ok" : "unavailable"}`}</span>
            </dd>
          </div>

          <div className="flex items-center gap-3">
            <dt className="w-20 text-muted">Database</dt>
            <dd className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`inline-block h-2 w-2 rounded-full ${
                  health.database === "ok" ? "bg-brand" : "bg-warning-ink"
                }`}
              />
              <span>{health.database}</span>
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
