import { apiBaseUrl } from "@/lib/api";

import { parseFamilyPayload } from "./parse";
import { FAMILY_MESSAGES } from "./types";
import type { FamilyPayload } from "./types";

const TIMEOUT_MS = 4_000;

export type FamilyLookup =
  | { status: "ok"; payload: FamilyPayload; etag: string | null }
  | { status: "expired"; message: string }
  | { status: "not_found"; message: string }
  | { status: "unavailable" };

/** Server-side first view: one fetch, so the HTML arrives complete. */
export async function loadFamily(code: string): Promise<FamilyLookup> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl()}/api/v1/family/${encodeURIComponent(code)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return { status: "unavailable" };
  }

  if (response.status === 410) {
    return { status: "expired", message: await messageFrom(response, FAMILY_MESSAGES.linkExpired) };
  }

  if (response.status === 404) {
    return {
      status: "not_found",
      message: await messageFrom(response, FAMILY_MESSAGES.linkNotFound),
    };
  }

  if (!response.ok) return { status: "unavailable" };

  const payload = parseFamilyPayload(await response.json().catch(() => null));
  if (payload === null) return { status: "unavailable" };

  return { status: "ok", payload, etag: response.headers.get("etag") };
}

/** The API's approved wording wins; the local fallback is only a safety net. */
async function messageFrom(response: Response, fallback: string): Promise<string> {
  const body: unknown = await response.json().catch(() => null);

  if (typeof body === "object" && body !== null) {
    const { message } = body as Record<string, unknown>;
    if (typeof message === "string" && message.trim() !== "") return message;
  }

  return fallback;
}
