"use client";

import { useEffect } from "react";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastMessage = {
  text: string;
  action?: ToastAction;
};

/** The undo window the toast offers (two taps: advance, then undo). */
export const TOAST_DURATION_MS = 10_000;

type ToastProps = {
  toast: ToastMessage | null;
  onDismiss: () => void;
};

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-4"
    >
      <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-2 rounded-2xl bg-neutral-900 p-3 text-white shadow-lg">
        <p className="flex-1 px-1 text-sm text-white">{toast.text}</p>

        {toast.action ? (
          <button
            type="button"
            onClick={toast.action.onClick}
            className="min-h-11 rounded-xl bg-white px-4 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {toast.action.label}
          </button>
        ) : null}

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="min-h-11 min-w-11 rounded-xl text-lg text-neutral-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          ×
        </button>
      </div>
    </div>
  );
}
