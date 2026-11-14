import type { Metadata } from "next";

import { FamilyLive } from "@/components/family/family-live";
import { FamilyUnavailable } from "@/components/family/family-unavailable";
import { loadFamily } from "@/lib/family/server";
import { FAMILY_MESSAGES } from "@/lib/family/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CareTrack - progress",
  robots: { index: false, follow: false },
};

// ACCESS CONTROL LATER: the tracking code in the URL is the whole of the
// access in Phase A (CLAUDE.md rule 3).

export default async function FamilyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const lookup = await loadFamily(code);

  if (lookup.status === "ok") {
    // Server-rendered first view; FamilyLive takes over for polling.
    return <FamilyLive code={code} initial={lookup.payload} initialEtag={lookup.etag} />;
  }

  if (lookup.status === "unavailable") {
    return <FamilyUnavailable kind="unavailable" message={FAMILY_MESSAGES.unavailable} code={code} />;
  }

  return <FamilyUnavailable kind={lookup.status} message={lookup.message} code={code} />;
}
