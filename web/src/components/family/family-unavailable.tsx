import { FAMILY_MESSAGES } from "@/lib/family/types";

export type FamilyUnavailableKind = "expired" | "not_found" | "unavailable";

const HEADINGS: Record<FamilyUnavailableKind, string> = {
  expired: "This link has expired",
  not_found: "This link is not available",
  unavailable: "We cannot update this page",
};

type FamilyUnavailableProps = {
  kind: FamilyUnavailableKind;
  message: string;
  code: string;
};

/** Expired, unknown and unreachable links: one calm card, no data, no guesses. */
export function FamilyUnavailable({ kind, message, code }: FamilyUnavailableProps) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-page py-10">
      <div className="rounded-card border border-line bg-paper p-card shadow-card sm:p-6">
        <h1 className="text-page-title font-semibold tracking-tight text-ink">
          {HEADINGS[kind]}
        </h1>
        <p className="mt-3 text-body-copy text-ink">
          {message || FAMILY_MESSAGES.unavailable}
        </p>

        {kind === "unavailable" ? (
          <a
            href={`/f/${encodeURIComponent(code)}`}
            className="mt-5 inline-flex min-h-12 items-center rounded-control border border-line bg-paper px-4 text-base font-semibold text-ink hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Try again
          </a>
        ) : null}
      </div>
    </main>
  );
}
