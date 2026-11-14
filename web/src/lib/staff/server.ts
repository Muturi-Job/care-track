import { apiBaseUrl } from "@/lib/api";

import {
  parseEpisodeBody,
  parseEpisodes,
  parseErrorMessage,
  parseProcedureOptions,
} from "./parse";
import type {
  CreateEpisodeInput,
  DelayReason,
  ProcedureOption,
  StaffEpisode,
  StatusFlag,
} from "./types";

const TIMEOUT_MS = 5_000;

/** A failure the route handlers turn into calm JSON for the browser. */
export class StaffApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StaffApiError";
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: unknown;
};

/**
 * Server-side only: the browser talks to /api/staff/*, which calls the Rails
 * API from here (CLAUDE.md: the browser never talks to the API directly).
 */
async function request(path: string, options: RequestOptions = {}): Promise<Response> {
  const { method = "GET", headers = {}, body } = options;

  try {
    return await fetch(`${apiBaseUrl()}${path}`, {
      method,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        accept: "application/json",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new StaffApiError("The API is unavailable. Please try again.", 503);
  }
}

async function readBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function episodeFrom(response: Response, fallback: string): Promise<StaffEpisode> {
  const body = await readBody(response);

  if (!response.ok) {
    throw new StaffApiError(parseErrorMessage(body, fallback), response.status);
  }

  return parseEpisodeBody(body);
}

export async function loadEpisodes(query: string): Promise<StaffEpisode[]> {
  const trimmed = query.trim();
  const search = trimmed === "" ? "" : `?q=${encodeURIComponent(trimmed)}`;
  const response = await request(`/api/v1/episodes${search}`);
  const body = await readBody(response);

  if (!response.ok) {
    throw new StaffApiError(parseErrorMessage(body, "Could not load episodes."), response.status);
  }

  return parseEpisodes(body);
}

/** Returns null when the episode does not exist, so the page can show a 404. */
export async function loadEpisode(id: string): Promise<StaffEpisode | null> {
  const response = await request(`/api/v1/episodes/${encodeURIComponent(id)}`);
  if (response.status === 404) return null;

  const body = await readBody(response);

  if (!response.ok) {
    throw new StaffApiError(parseErrorMessage(body, "Could not load this episode."), response.status);
  }

  return parseEpisodeBody(body);
}

export async function loadProcedureOptions(): Promise<ProcedureOption[]> {
  const response = await request("/api/v1/procedure_templates");
  const body = await readBody(response);

  if (!response.ok) {
    throw new StaffApiError(parseErrorMessage(body, "Could not load procedures."), response.status);
  }

  return parseProcedureOptions(body);
}

export async function createEpisode(input: CreateEpisodeInput): Promise<StaffEpisode> {
  const response = await request("/api/v1/episodes", {
    method: "POST",
    body: {
      episode: {
        patient_alias: input.alias,
        ward_or_bed: input.bed,
        procedure_template_id: input.procedureTemplateId,
      },
    },
  });

  return episodeFrom(response, "Could not create the episode.");
}

export async function advanceEpisode(
  id: string,
  idempotencyKey: string,
): Promise<StaffEpisode> {
  const response = await request(`/api/v1/episodes/${encodeURIComponent(id)}/advance`, {
    method: "POST",
    headers: { "idempotency-key": idempotencyKey },
  });

  return episodeFrom(response, "Could not advance the episode.");
}

export async function undoEpisode(id: string): Promise<StaffEpisode> {
  const response = await request(`/api/v1/episodes/${encodeURIComponent(id)}/undo`, {
    method: "POST",
  });

  return episodeFrom(response, "Could not undo that advance.");
}

export async function flagEpisode(
  id: string,
  statusFlag: StatusFlag,
  delayReason: DelayReason | null,
): Promise<StaffEpisode> {
  const response = await request(`/api/v1/episodes/${encodeURIComponent(id)}/flag`, {
    method: "POST",
    body: { status_flag: statusFlag, delay_reason: delayReason },
  });

  return episodeFrom(response, "Could not update the flag.");
}

export async function clearFlag(id: string): Promise<StaffEpisode> {
  const response = await request(`/api/v1/episodes/${encodeURIComponent(id)}/flag/clear`, {
    method: "POST",
  });

  return episodeFrom(response, "Could not clear the flag.");
}
