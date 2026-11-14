import Link from "next/link";

import { StaffProviders } from "./providers";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffProviders>
      <div className="border-b border-line bg-paper">
        <div className="mx-auto flex w-full max-w-5xl items-center px-page py-2">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              C
            </span>
            CareTrack staff
          </Link>
        </div>
      </div>

      {children}
    </StaffProviders>
  );
}
