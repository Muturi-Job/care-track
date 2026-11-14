"use client";

import { useState } from "react";

import { sendFeedback } from "@/lib/family/client";
import { FEEDBACK_OPTIONS } from "@/lib/family/types";
import type { FeedbackAnswer } from "@/lib/family/types";

type FeedbackPromptProps = {
  code: string;
  onAnswer?: (code: string, answer: FeedbackAnswer) => Promise<void>;
};

/** One question, one tap, one row in the database: the answer and the code. */
export function FeedbackPrompt({ code, onAnswer = sendFeedback }: FeedbackPromptProps) {
  const [sent, setSent] = useState<FeedbackAnswer | null>(null);
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);

  async function answer(value: FeedbackAnswer) {
    setBusy(true);
    setFailure("");

    try {
      await onAnswer(code, value);
      setSent(value);
    } catch {
      setFailure("We could not save your answer. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="feedback-heading"
      className="mt-section rounded-card border border-line bg-paper p-card sm:p-5"
    >
      <h2 id="feedback-heading" className="text-base font-semibold text-ink">
        Did this page help you feel informed?
      </h2>

      {sent ? (
        <p role="status" className="mt-2 text-base leading-relaxed text-ink">
          Thank you. Your answer helps us make this page better.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {FEEDBACK_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                void answer(option.value);
              }}
              disabled={busy}
              className="min-h-12 min-w-24 flex-1 rounded-control border border-line bg-paper px-4 text-base font-semibold text-ink hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-muted sm:flex-none"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {failure ? (
        <p role="alert" className="mt-2 text-sm text-danger-ink">
          {failure}
        </p>
      ) : null}

      <p className="mt-3 text-caption text-muted">
        Your answer is not linked to any personal details.
      </p>
    </section>
  );
}
