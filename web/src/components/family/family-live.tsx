"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { pollFamily } from "@/lib/family/client";
import type { FamilyPayload } from "@/lib/family/types";
import { pollIntervalMs } from "@/lib/poll-interval";

import { FamilyUnavailable } from "./family-unavailable";
import { FamilyView } from "./family-view";
import { FeedbackPrompt } from "./feedback-prompt";

type FamilyLiveProps = {
  code: string;
  /** The first view, fetched on the server so the HTML arrives complete. */
  initial: FamilyPayload;
  initialEtag: string | null;
};

const AGO_TICK_MS = 30_000;

/** The server-rendered page, then one conditional poll every ten seconds. */
export function FamilyLive({ code, initial, initialEtag }: FamilyLiveProps) {
  const [payload, setPayload] = useState(initial);
  const [trouble, setTrouble] = useState<{ status: "expired" | "not_found"; message: string } | null>(
    null,
  );
  const [failed, setFailed] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [announcement, setAnnouncement] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const etag = useRef(initialEtag);
  const inFlight = useRef(false);
  const announcementKey = useRef(statusKey(initial));

  const check = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);

    const result = await pollFamily(code, etag.current);

    inFlight.current = false;
    setRefreshing(false);

    if (result.status === "failed") {
      setFailed(true);
      return;
    }

    if (result.status === "expired" || result.status === "not_found") {
      setTrouble({ status: result.status, message: result.message });
      return;
    }

    setFailed(false);
    setLastCheckedAt(Date.now());
    setNow(Date.now());

    if (result.status === "unchanged") return;

    const nextKey = statusKey(result.payload);
    if (nextKey !== announcementKey.current) {
      announcementKey.current = nextKey;
      setAnnouncement(describeChange(result.payload));
    }

    etag.current = result.etag;
    setPayload(result.payload);
  }, [code]);

  useEffect(() => {
    const timer = setInterval(() => {
      void check();
    }, pollIntervalMs());

    return () => clearInterval(timer);
  }, [check]);

  // Keeps "Last checked 2 minutes ago" honest without re-rendering every second.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), AGO_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  if (trouble) {
    return <FamilyUnavailable kind={trouble.status} message={trouble.message} code={code} />;
  }

  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <FamilyView
        payload={payload}
        stale={failed}
        lastCheckedAt={lastCheckedAt}
        now={now}
        onRefresh={() => {
          void check();
        }}
        refreshing={refreshing}
        feedback={<FeedbackPrompt code={code} />}
      />
    </>
  );
}

/** What a change means in one short sentence for a screen reader. */
function describeChange(payload: FamilyPayload): string {
  if (payload.specialStatus) return `Status updated. ${payload.specialStatus.message}`;

  return `Now: ${payload.currentStage.label}.`;
}

function statusKey(payload: FamilyPayload): string {
  return JSON.stringify([
    payload.currentStage.label,
    payload.specialStatus?.kind ?? "normal",
    payload.specialStatus?.message ?? "",
  ]);
}
