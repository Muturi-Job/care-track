import {
  describeAge,
  expectedDurationText,
  formatUpdatedAt,
  stageStateLabel,
  telHref,
} from "@/lib/family/copy";
import type { FamilyPayload, StageState } from "@/lib/family/types";

import type { ReactNode } from "react";

export type FamilyViewProps = {
  payload: FamilyPayload;
  /** True when the last poll failed: the data below is the last good answer. */
  stale?: boolean;
  lastCheckedAt?: number;
  now?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** The feedback prompt, rendered after the contact card. */
  feedback?: ReactNode;
};

/**
 * Pure view: one family page, every state. Server-rendered first, then handed
 * fresh payloads by FamilyLive as it polls.
 */
export function FamilyView({
  payload,
  stale = false,
  lastCheckedAt,
  now,
  onRefresh,
  refreshing = false,
  feedback,
}: FamilyViewProps) {
  const callHref = telHref(payload.hospitalContact.phone);
  const duration = expectedDurationText(payload.expectedDuration);
  const updated = formatUpdatedAt(payload.lastUpdatedAt);
  const status = payload.specialStatus;
  // No clock reads during render: FamilyLive owns the ticking `now`.
  const checkedAt = now ?? lastCheckedAt ?? 0;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-page py-8 sm:py-10">
      <header>
        <p className="text-caption font-semibold tracking-[0.16em] text-muted uppercase">
          Progress update
        </p>
        <h1 className="mt-1 text-page-title font-semibold tracking-tight text-ink sm:text-3xl">
          {payload.patientAlias}
        </h1>
        <p className="mt-1 text-base text-muted">{payload.procedure}</p>
      </header>

      {stale && lastCheckedAt !== undefined ? (
        <div
          role="status"
          className="mt-5 flex flex-col gap-3 rounded-card border border-line bg-paper p-card sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm leading-relaxed text-ink">
            We could not refresh just now. Last checked {describeAge(lastCheckedAt, checkedAt)}.
          </p>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="flex min-h-12 shrink-0 items-center justify-center rounded-control border border-line bg-paper px-4 text-sm font-semibold text-ink hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-muted"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      ) : null}

      <section
        aria-labelledby="current-stage"
        className="mt-6 rounded-card border border-brand-line bg-paper p-card shadow-card sm:p-6"
      >
        <p className="text-caption font-semibold tracking-[0.16em] text-muted uppercase">Now</p>
        <div className="mt-2 flex items-start gap-3">
          <HeartIcon className="mt-1 h-7 w-7 shrink-0 text-brand" />
          <h2
            id="current-stage"
            className="text-3xl leading-tight font-semibold text-ink sm:text-4xl"
          >
            {payload.currentStage.label}
          </h2>
        </div>
        <p className="mt-3 text-base leading-relaxed text-ink">
          {payload.currentStage.explanation}
        </p>
      </section>

      {status ? (
        <section
          aria-label="Update from the care team"
          className={`mt-5 rounded-card border p-card ${
            status.kind === "call_care_team"
              ? "border-brand-line bg-info-soft"
              : "border-warning-line bg-warning-soft"
          }`}
        >
          <p className="flex items-start gap-2 text-base leading-relaxed text-ink">
            <StatusIcon kind={status.kind === "call_care_team" ? "call" : "update"} />
            <span>{status.message}</span>
          </p>

          {status.kind === "call_care_team" && callHref ? (
            <a
              href={callHref}
              className="mt-3 flex min-h-14 items-center justify-center gap-2 rounded-control bg-brand px-4 text-lg font-semibold text-white shadow-card hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong"
            >
              <PhoneIcon className="h-5 w-5" />
              Call {payload.hospitalContact.phone}
            </a>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="next-heading" className="mt-section">
        <h2 id="next-heading" className="text-section-title font-semibold text-ink">
          What happens next
        </h2>
        <p className="mt-2 text-body-copy text-ink">
          {payload.whatHappensNext}
        </p>
        {duration ? <p className="mt-2 text-sm text-muted">{duration}</p> : null}
      </section>

      <section aria-labelledby="timeline-heading" className="mt-section">
        <h2 id="timeline-heading" className="text-section-title font-semibold text-ink">
          Where things are
        </h2>

        <ol className="mt-3 rounded-card border border-line bg-paper p-card">
          {payload.stages.map((stage, index) => (
            <li key={`${index}-${stage.label}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <StageMarker state={stage.state} />
                {index < payload.stages.length - 1 ? (
                  <span aria-hidden="true" className="mt-1 w-0.5 flex-1 bg-line" />
                ) : null}
              </div>

              <div className={index < payload.stages.length - 1 ? "pb-4" : ""}>
                <p
                  className={`text-base ${
                    stage.state === "current"
                      ? "font-semibold text-ink"
                      : "text-ink"
                  }`}
                >
                  {stage.label}
                </p>
                <p className="text-caption font-semibold tracking-wide text-muted uppercase">
                  {stageStateLabel(stage.state)}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {updated ? (
          <p className="mt-3 text-sm text-muted">
            Last updated{" "}
            <time dateTime={payload.lastUpdatedAt}>{updated}</time>
          </p>
        ) : null}
      </section>

      <section
        aria-labelledby="contact-heading"
        className="mt-section rounded-card border border-line bg-paper p-card sm:p-5"
      >
        <h2 id="contact-heading" className="text-section-title font-semibold text-ink">
          Who to contact
        </h2>
        <p className="mt-2 text-body-copy text-ink">
          {payload.hospitalContact.text}
        </p>

        {callHref ? (
          <a
            href={callHref}
            className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-control border border-brand px-4 text-base font-semibold text-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong"
          >
            <PhoneIcon className="h-5 w-5" />
            Call {payload.hospitalContact.phone}
          </a>
        ) : null}

        {payload.hospitalVisiting ? (
          <>
            <h3 className="mt-4 text-sm font-semibold text-ink">Visiting</h3>
            <p className="mt-1 text-body-copy text-ink">
              {payload.hospitalVisiting}
            </p>
          </>
        ) : null}
      </section>

      {feedback}
    </main>
  );
}

function StageMarker({ state }: { state: StageState }) {
  if (state === "done") {
    return (
      <span
        aria-hidden="true"
        className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white"
      >
        <CheckIcon className="h-4 w-4" />
      </span>
    );
  }

  if (state === "current") {
    return (
      <span
        aria-hidden="true"
        className="mt-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-brand"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-brand" />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="mt-1 h-6 w-6 rounded-full border-2 border-muted"
    />
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 20.5 4.8 13.3a4.6 4.6 0 0 1 0-6.5 4.6 4.6 0 0 1 6.5 0l.7.7.7-.7a4.6 4.6 0 0 1 6.5 0 4.6 4.6 0 0 1 0 6.5Z" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M6.6 3.5 9 3l1.7 4-2 2a12 12 0 0 0 6.3 6.3l2-2 4 1.7-.5 2.4a2 2 0 0 1-2 1.6A17 17 0 0 1 5 5.5a2 2 0 0 1 1.6-2Z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

function StatusIcon({ kind }: { kind: "call" | "update" }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mt-0.5 h-5 w-5 shrink-0 text-brand"
    >
      {kind === "call" ? (
        <path d="M5.5 3.5 7.5 3l1.5 3.5-1.7 1.7a10 10 0 0 0 4.5 4.5l1.7-1.7 3.5 1.5-.5 2a1.7 1.7 0 0 1-1.7 1.4A12.5 12.5 0 0 1 4.1 5.2a1.7 1.7 0 0 1 1.4-1.7Z" />
      ) : (
        <>
          <circle cx="10" cy="10" r="7" />
          <path d="M10 6v4l2.5 1.5" />
        </>
      )}
    </svg>
  );
}
