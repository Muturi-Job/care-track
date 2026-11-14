import { fetchApiHealth } from "@/lib/api";

// Always ask the API on each request; the status must never be baked in at
// build time or served from a cache.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const health = await fetchApiHealth();
  const apiOk = health.status === "ok";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-10 px-6 py-16">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">CareTrack</h1>
        <p className="text-lg text-neutral-600">
          A calm, live view of a patient&apos;s progress through a procedure.
        </p>
      </header>

      <section
        aria-labelledby="system-status"
        className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
      >
        <h2
          id="system-status"
          className="text-xs font-medium tracking-wide text-neutral-500 uppercase"
        >
          System status
        </h2>

        <dl className="mt-4 space-y-3 text-sm text-neutral-800">
          <div className="flex items-center gap-3">
            <dt className="w-20 text-neutral-500">API</dt>
            <dd className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`inline-block h-2 w-2 rounded-full ${
                  apiOk ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              <span>{`API: ${apiOk ? "ok" : "unavailable"}`}</span>
            </dd>
          </div>

          <div className="flex items-center gap-3">
            <dt className="w-20 text-neutral-500">Database</dt>
            <dd className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`inline-block h-2 w-2 rounded-full ${
                  health.database === "ok" ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              <span>{health.database}</span>
            </dd>
          </div>
        </dl>
      </section>

      <p className="text-sm text-neutral-500">
        Phase A scaffold: family tracking pages and staff updates come next.
      </p>
    </main>
  );
}
