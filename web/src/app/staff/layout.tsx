import Link from "next/link";

import { StaffProviders } from "./providers";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffProviders>
      <div className="border-b border-neutral-200 bg-white/70">
        <div className="mx-auto flex w-full max-w-xl items-center px-4 py-2">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-sm font-medium text-neutral-700 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            CareTrack staff
          </Link>
        </div>
      </div>

      {children}
    </StaffProviders>
  );
}
