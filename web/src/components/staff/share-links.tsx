"use client";

import { useEffect, useState } from "react";

import { familyShareMessage, whatsappShareUrl } from "@/lib/staff/share";

type ShareLinksProps = {
  /** Absolute family page URL. */
  url: string;
  alias: string;
  size?: "sm" | "md";
};

type CopyState = "idle" | "copied" | "failed";

const FEEDBACK_MS = 2_500;

export function ShareLinks({ url, alias, size = "md" }: ShareLinksProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const height = size === "sm" ? "min-h-11" : "min-h-12";

  useEffect(() => {
    if (copyState === "idle") return;

    const timer = setTimeout(() => setCopyState("idle"), FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copyState]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={copy}
          className={`${height} flex-1 rounded-control border border-line bg-paper px-3 text-sm font-semibold text-ink hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`}
        >
          {copyState === "copied" ? "Link copied" : "Copy family link"}
        </button>

        <a
          href={whatsappShareUrl(familyShareMessage(alias, url))}
          target="_blank"
          rel="noopener noreferrer"
          className={`${height} flex flex-1 items-center justify-center rounded-control bg-ink px-3 text-sm font-semibold text-white hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink`}
        >
          Share on WhatsApp
          <span className="sr-only"> (opens WhatsApp)</span>
        </a>
      </div>

      <p aria-live="polite" className="mt-1 min-h-4 text-caption text-danger-ink">
        {copyState === "failed" ? "Could not copy. Please try again." : ""}
      </p>
    </div>
  );
}
