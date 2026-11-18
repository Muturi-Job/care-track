import Link from "next/link";

import { StaffProviders } from "./providers";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffProviders>
      <div className="border-b border-line bg-paper print:hidden">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-page py-2">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              C
            </span>
            CareTrack staff
          </Link>
          <nav aria-label="Staff navigation" className="flex items-center gap-3">
            <Link href="/staff" className="min-h-11 inline-flex items-center text-sm font-medium text-muted hover:text-brand">Board</Link>
            <Link href="/staff/insights" className="min-h-11 inline-flex items-center text-sm font-semibold text-brand hover:underline">Insights</Link>
          </nav>
        </div>
      </div>

      {children}
    </StaffProviders>
  );
}
