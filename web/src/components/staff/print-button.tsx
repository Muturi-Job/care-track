"use client";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return <button type="button" onClick={() => window.print()} className="min-h-11 rounded-control bg-brand px-4 text-sm font-semibold text-white print:hidden">
    {label}
  </button>;
}
