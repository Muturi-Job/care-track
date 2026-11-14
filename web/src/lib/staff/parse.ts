import type {
  DelayReason,
  ProcedureOption,
  StageHistoryEntry,
  StaffEpisode,
  StatusFlag,
} from "./types";
import { DELAY_REASONS } from "./types";

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json {
  return typeof value === "object" && value !== null ? (value as Json) : {};
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function asStatusFlag(value: unknown): StatusFlag {
  return value === "delayed" || value === "call_care_team" ? value : "normal";
}

export function asDelayReason(value: unknown): DelayReason | null {
  return DELAY_REASONS.find((reason) => reason === value) ?? null;
}

function parseHistoryEntry(value: unknown): StageHistoryEntry | null {
  const raw = asRecord(value);
  const eventType = asNullableString(raw.event_type);
  if (!eventType) return null;

  return {
    eventType,
    label: asString(raw.stage_label, "Stage not set"),
    at: asString(raw.occurred_at, ""),
  };
}

function parseHistory(value: unknown): StageHistoryEntry[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(parseHistoryEntry)
    .filter((entry): entry is StageHistoryEntry => entry !== null);
}

/**
 * Maps one episode from the API to the shape the screens render.
 * Unknown or missing fields fall back to plain language instead of crashing.
 */
export function parseEpisode(value: unknown): StaffEpisode {
  const raw = asRecord(value);

  return {
    id: asString(raw.id, ""),
    alias: asString(raw.patient_alias, "Unnamed patient"),
    bed: asString(raw.ward_or_bed, "Bed not set"),
    procedureName: asString(raw.procedure_name, "Procedure not set"),
    stagePosition: asNumber(raw.current_stage_position, 1),
    stageLabel: asString(raw.stage_label, "Stage not set"),
    isFinalStage: raw.is_final_stage === true,
    nextStageLabel: asNullableString(raw.next_stage_label),
    minutesInStage: asNumber(raw.minutes_in_current_stage),
    expectedMinutes: asNullableNumber(raw.expected_minutes),
    minutesOverdue: asNumber(raw.minutes_overdue),
    statusFlag: asStatusFlag(raw.status_flag),
    delayReason: asDelayReason(raw.delay_reason),
    familyPath: asString(raw.family_path, ""),
    trackingCode: asString(raw.tracking_code, ""),
    history: parseHistory(raw.history),
  };
}

export function parseEpisodes(value: unknown): StaffEpisode[] {
  const raw = asRecord(value);

  return Array.isArray(raw.episodes) ? raw.episodes.map(parseEpisode) : [];
}

export function parseEpisodeBody(value: unknown): StaffEpisode {
  return parseEpisode(asRecord(value).episode);
}

export function parseProcedureOptions(value: unknown): ProcedureOption[] {
  const raw = asRecord(value);
  if (!Array.isArray(raw.procedure_templates)) return [];

  return raw.procedure_templates.flatMap((template) => {
    const entry = asRecord(template);
    const id = asNullableString(entry.id);
    const name = asNullableString(entry.name);
    if (!id || !name) return [];

    return [{ id, name, active: entry.active !== false }];
  });
}

/** A calm sentence for a failure, never a raw error code. */
export function parseErrorMessage(value: unknown, fallback: string): string {
  const raw = asRecord(value);
  const message = asNullableString(raw.message);

  return message ?? fallback;
}
