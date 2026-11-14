"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ChangeEvent } from "react";

const TRACKING_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TRACKING_CODE_FORMAT = new RegExp(`^[${TRACKING_CODE_ALPHABET}]{10}$`);
const FAMILY_LINK_CODE = /\/f\/([a-z0-9]{10})(?:[/?#]|$)/i;
const ERROR_ID = "tracking-code-error";

export function normalizeTrackingCode(value: string): string {
  const linkMatch = value.match(FAMILY_LINK_CODE);
  const code = linkMatch?.[1] ?? value;

  return code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
}

export function TrackingCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);

  function updateCode(event: ChangeEvent<HTMLInputElement>) {
    setCode(normalizeTrackingCode(event.currentTarget.value));
    setInvalid(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!TRACKING_CODE_FORMAT.test(code)) {
      setInvalid(true);
      return;
    }

    router.push(`/f/${code}`);
  }

  return (
    <form className="mt-4" onSubmit={submit} noValidate>
      <label htmlFor="tracking-code" className="block text-sm font-semibold text-ink">
        Tracking code
      </label>
      <input
        id="tracking-code"
        name="trackingCode"
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        value={code}
        onChange={updateCode}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? ERROR_ID : undefined}
        placeholder="E.g. K7M2QX9PAB"
        className="mt-1 h-12 w-full rounded-control border border-line bg-paper px-3 text-base tracking-wider text-ink placeholder:tracking-normal placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      />
      {invalid ? (
        <p
          id={ERROR_ID}
          role="alert"
          className="mt-2 rounded-control border border-warning-line bg-warning-soft px-3 py-2 text-sm leading-relaxed text-warning-ink"
        >
          That code doesn&apos;t look right. Codes have 10 letters and numbers.
        </p>
      ) : null}
      <button
        type="submit"
        className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-control bg-brand px-4 text-base font-semibold text-white shadow-card transition-colors hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong motion-reduce:transition-none"
      >
        View progress
        <ArrowIcon className="h-4 w-4" />
      </button>
    </form>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M4 10h12m-5-5 5 5-5 5" />
    </svg>
  );
}
