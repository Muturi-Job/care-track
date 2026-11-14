import Link from "next/link";
import { Suspense } from "react";

import { HomeHealthIndicator } from "@/components/home-health-indicator";
import { TrackingCodeForm } from "@/components/tracking-code-form";
import { telHref } from "@/lib/family/copy";

export const dynamic = "force-dynamic";

const DEFAULT_CONTACT_PHONE = "0000 000 000";

const steps = [
  {
    number: "1",
    title: "Staff update the stage",
    description: "A quick update when your loved one reaches a new milestone.",
  },
  {
    number: "2",
    title: "Families see it live",
    description: "Follow their progress without waiting for an anxious hallway update.",
  },
  {
    number: "3",
    title: "No apps or accounts",
    description: "Open the link from the ward. Nothing to install or sign up for.",
  },
];

export default function HomePage() {
  const phone = process.env.HOSPITAL_CONTACT_PHONE ?? DEFAULT_CONTACT_PHONE;
  const callHref = telHref(phone);

  return (
    <main className="mx-auto w-full max-w-[60rem] flex-1 px-4 py-6 sm:px-page sm:py-10">
      <header className="relative isolate overflow-hidden rounded-card px-4 py-8 text-center sm:px-10 sm:py-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-line/55 via-brand-soft/40 to-canvas"
        />
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-card">
          <HeartPulseIcon className="h-7 w-7" />
        </div>
        <p className="mt-4 text-xs font-semibold tracking-[0.14em] text-brand uppercase">
          CareTrack
        </p>
        <h1 className="mx-auto mt-3 max-w-3xl text-3xl leading-tight font-semibold tracking-tight text-ink sm:text-5xl sm:leading-tight">
          Know where they are, every step of the way.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          A calm, live view of a loved one&apos;s progress through a hospital procedure.
        </p>
      </header>

      <section
        aria-label="Choose how to use CareTrack"
        className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        <section
          aria-labelledby="family-heading"
          className="rounded-card border border-brand-line bg-brand-soft p-5 shadow-card sm:p-6"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-brand">
              <HeartIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-caption font-semibold tracking-wide text-brand uppercase">
                Family
              </p>
              <h2 id="family-heading" className="mt-0.5 text-xl font-semibold text-ink">
                I&apos;m a family member
              </h2>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            Follow your loved one&apos;s progress with the tracking code the ward gave you.
          </p>

          <TrackingCodeForm />

          <details className="mt-3 rounded-control">
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-brand underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
              Where do I find my code?
            </summary>
            <p className="pb-2 text-sm leading-relaxed text-ink">
              It is in the message or link the ward sent you.
            </p>
          </details>
        </section>

        <section
          aria-labelledby="staff-heading"
          className="flex flex-col rounded-card border border-line bg-paper p-5 shadow-card sm:p-6"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-info-soft text-info-ink">
              <StaffIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-caption font-semibold tracking-wide text-info-ink uppercase">
                Clinical team
              </p>
              <h2 id="staff-heading" className="mt-0.5 text-xl font-semibold text-ink">
                I&apos;m hospital staff
              </h2>
            </div>
          </div>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
            Update patient stages in one tap and share progress links with families.
          </p>
          <Link
            href="/staff"
            className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-control bg-ink px-4 text-base font-semibold text-white shadow-card transition-colors hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong motion-reduce:transition-none"
          >
            <StaffIcon className="h-5 w-5" />
            Open staff dashboard
          </Link>
        </section>
      </section>

      <section aria-labelledby="how-heading" className="mt-8 sm:mt-10">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="how-heading" className="text-section-title font-semibold text-ink">
            How it works
          </h2>
          <p className="text-caption font-medium text-muted">3 simple steps</p>
        </div>
        <ol className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {steps.map((step) => (
            <li
              key={step.number}
              className="flex gap-3 rounded-card border border-line bg-paper p-4"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-sm font-bold text-brand">
                {step.number}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-ink">{step.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <aside className="mt-5 flex items-start gap-3 rounded-card border border-line bg-paper px-4 py-3">
        <LockIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <p className="text-sm leading-relaxed text-ink">
          We only show first names and progress. Never medical details.
        </p>
      </aside>

      <footer className="mt-6 flex flex-col items-center gap-3 border-t border-line pt-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="flex min-h-11 items-center gap-2 text-sm text-muted">
          <PhoneIcon className="h-4 w-4 text-brand" />
          Need help?{" "}
          {callHref ? (
            <a
              href={callHref}
              className="inline-flex min-h-11 items-center font-semibold text-brand underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Call the ward
            </a>
          ) : (
            <span className="font-semibold text-ink">Call the ward</span>
          )}
        </p>
        <Suspense
          fallback={
            <p className="flex min-h-11 items-center text-xs text-muted">System status checking</p>
          }
        >
          <HomeHealthIndicator />
        </Suspense>
      </footer>
    </main>
  );
}

function HeartPulseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.8 8.7c0 5.1-8.8 11-8.8 11s-8.8-5.9-8.8-11a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z" />
      <path d="M5.5 11h3l1.5-2.5 2.2 5 1.6-2.5h4.7" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 21s-8.5-5.7-8.5-12A4.9 4.9 0 0 1 12 6.3 4.9 4.9 0 0 1 20.5 9c0 6.3-8.5 12-8.5 12Z" />
    </svg>
  );
}

function StaffIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="3.5" y="6" width="17" height="14" rx="2" />
      <path d="M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6M12 10v6m-3-3h6" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 1 1 8 0v3m-4 4v3" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M6.6 3.5 9 3l1.7 4-2 2a12 12 0 0 0 6.3 6.3l2-2 4 1.7-.5 2.4a2 2 0 0 1-2 1.6A17 17 0 0 1 5 5.5a2 2 0 0 1 1.6-2Z" />
    </svg>
  );
}
