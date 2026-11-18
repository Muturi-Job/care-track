"use client";

import { newIdempotencyKey } from "./idempotency";
import { parseErrorMessage } from "./parse";
import type { CreateEpisodeInput, DelayReason, StaffEpisode, StatusFlag } from "./types";

/** What the browser sees when a staff request fails. */
export class StaffRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StaffRequestError";
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
};

const advanceKeys = new Map<string, string>();

async function send<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  let response: Response;

  try {
    response = await fetch(path, {
      method,
      headers: {
        accept: "application/json",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new StaffRequestError("Could not reach CareTrack. Please try again.", 0);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new StaffRequestError(parseErrorMessage(payload, "Please try again."), response.status);
  }

  return payload as T;
}

export async function fetchEpisodes(query: string): Promise<StaffEpisode[]> {
  const trimmed = query.trim();
  const search = trimmed === "" ? "" : `?q=${encodeURIComponent(trimmed)}`;
  const body = await send<{ episodes?: StaffEpisode[] }>(`/api/staff/episodes${search}`);

  return body.episodes ?? [];
}

export async function sendCreateEpisode(input: CreateEpisodeInput): Promise<StaffEpisode> {
  const body = await send<{ episode: StaffEpisode }>("/api/staff/episodes", {
    method: "POST",
    body: input,
  });

  return body.episode;
}

/**
 * Keep the key until a successful response: if the server advanced but the
 * response was lost, the next tap replays that result instead of advancing twice.
 */
export async function sendAdvance(id: string): Promise<StaffEpisode> {
  const key = advanceKeys.get(id) ?? newIdempotencyKey();
  advanceKeys.set(id, key);

  const body = await send<{ episode: StaffEpisode }>(
    `/api/staff/episodes/${encodeURIComponent(id)}/advance`,
    { method: "POST", headers: { "idempotency-key": key } },
  );
  advanceKeys.delete(id);

  return body.episode;
}

export async function sendUndo(id: string): Promise<StaffEpisode> {
  const body = await send<{ episode: StaffEpisode }>(
    `/api/staff/episodes/${encodeURIComponent(id)}/undo`,
    { method: "POST" },
  );

  return body.episode;
}

export async function sendFlag(
  id: string,
  statusFlag: StatusFlag,
  delayReason: DelayReason | null,
): Promise<StaffEpisode> {
  const body = await send<{ episode: StaffEpisode }>(
    `/api/staff/episodes/${encodeURIComponent(id)}/flag`,
    { method: "POST", body: { statusFlag, delayReason } },
  );

  return body.episode;
}

export async function sendClearFlag(id: string): Promise<StaffEpisode> {
  const body = await send<{ episode: StaffEpisode }>(
    `/api/staff/episodes/${encodeURIComponent(id)}/clear-flag`,
    { method: "POST" },
  );

  return body.episode;
}

export type InquiryChannel = "phone" | "desk" | "ward" | "other";

export async function logInquiry(
  episodeId: string,
  channel: InquiryChannel,
): Promise<{ id: string; inquiryCount: number }> {
  const body = await send<{ id: string; inquiry_count: number }>(
    `/api/staff/episodes/${encodeURIComponent(episodeId)}/inquiries`,
    {
      method: "POST",
      body: { channel },
      headers: { "idempotency-key": newIdempotencyKey() },
    },
  );
  return { id: body.id, inquiryCount: body.inquiry_count };
}

export async function undoInquiry(id: string): Promise<void> {
  await send<void>(`/api/staff/inquiries/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function errorMessage(error: unknown): string {
  return error instanceof StaffRequestError
    ? error.message
    : "Something went wrong. Please try again.";
}
