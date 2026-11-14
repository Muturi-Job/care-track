"use client";

import { parseFamilyPayload } from "./parse";
import { FAMILY_MESSAGES } from "./types";
import type { FamilyPayload, FeedbackAnswer } from "./types";

export type FamilyPoll =
  | { status: "ok"; payload: FamilyPayload; etag: string | null }
  | { status: "expired"; message: string }
  | { status: "not_found"; message: string }
  | { status: "unchanged" }
  | { status: "failed" };

/**
 * One conditional poll. The ETag travels as a query parameter, so the server
 * route can set If-None-Match on the API call itself (browsers may drop that
 * header when JavaScript sets it).
 */
export async function pollFamily(code: string, etag: string | null): Promise<FamilyPoll> {
  const query = etag === null || etag === "" ? "" : `?etag=${encodeURIComponent(etag)}`;

  let response: Response;

  try {
    response = await fetch(`/api/family/${encodeURIComponent(code)}${query}`, {
      cache: "no-store",
    });
  } catch {
    return { status: "failed" };
  }

  if (response.status === 304) return { status: "unchanged" };

  if (response.status === 410) {
    return { status: "expired", message: await messageFrom(response, FAMILY_MESSAGES.linkExpired) };
  }

  if (response.status === 404) {
    return {
      status: "not_found",
      message: await messageFrom(response, FAMILY_MESSAGES.linkNotFound),
    };
  }

  if (!response.ok) return { status: "failed" };

  const payload = parseFamilyPayload(await response.json().catch(() => null));
  if (payload === null) return { status: "failed" };

  return { status: "ok", payload, etag: response.headers.get("etag") };
}

export async function sendFeedback(code: string, answer: FeedbackAnswer): Promise<void> {
  let response: Response;

  try {
    response = await fetch(`/api/family/${encodeURIComponent(code)}/feedback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answer }),
    });
  } catch {
    throw new Error("feedback_unreachable");
  }

  if (!response.ok) throw new Error("feedback_failed");
}

async function messageFrom(response: Response, fallback: string): Promise<string> {
  const body: unknown = await response.json().catch(() => null);

  if (typeof body === "object" && body !== null) {
    const { message } = body as Record<string, unknown>;
    if (typeof message === "string" && message.trim() !== "") return message;
  }

  return fallback;
}
