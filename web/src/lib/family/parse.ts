import { FAMILY_FALLBACK } from "./types";
import type {
  ExpectedDuration,
  FamilyPayload,
  FamilyStage,
  FamilyStatus,
  StageState,
} from "./types";

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json {
  return typeof value === "object" && value !== null ? (value as Json) : {};
}

function asText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stageState(value: unknown): StageState {
  return value === "done" || value === "current" ? value : "upcoming";
}

function parseStage(value: unknown): FamilyStage {
  const raw = asRecord(value);

  return {
    label: asText(raw.label, FAMILY_FALLBACK),
    explanation: asText(raw.family_explanation, FAMILY_FALLBACK),
    state: stageState(raw.state),
  };
}

function parseStatus(value: unknown): FamilyStatus | null {
  if (value === null || value === undefined) return null;

  const raw = asRecord(value);
  const kind = asText(raw.kind, "");
  if (kind === "" || kind === "normal") return null;
  if (kind !== "delayed" && kind !== "call_care_team") {
    return { kind: "call_care_team", message: FAMILY_FALLBACK };
  }

  return { kind, message: asText(raw.message, FAMILY_FALLBACK) };
}

function parseDuration(value: unknown): ExpectedDuration | null {
  const raw = asRecord(value);
  const minMinutes = asNumber(raw.min_minutes);
  const maxMinutes = asNumber(raw.max_minutes);
  if (minMinutes === null || maxMinutes === null) return null;

  return { minMinutes, maxMinutes };
}

function parseContact(value: unknown): { phone: string; text: string } {
  const raw = asRecord(value);

  return {
    phone: asText(raw.phone, ""),
    text: asText(raw.text, FAMILY_FALLBACK),
  };
}

/**
 * Maps the family payload to what the page renders. Returns null when the body
 * is not a progress payload at all, so the caller can show "unavailable"
 * rather than an empty page.
 */
export function parseFamilyPayload(value: unknown): FamilyPayload | null {
  const raw = asRecord(value);
  if (!Array.isArray(raw.stages)) return null;

  const stages = raw.stages.map(parseStage);
  const parsedCurrent = raw.current_stage === undefined ? null : parseStage(raw.current_stage);

  return {
    patientAlias: asText(raw.patient_alias, "Patient"),
    procedure: asText(raw.procedure, "Procedure"),
    stages,
    currentStage: parsedCurrent ??
      stages.find((stage) => stage.state === "current") ?? {
        label: FAMILY_FALLBACK,
        explanation: FAMILY_FALLBACK,
        state: "current",
      },
    specialStatus: parseStatus(raw.special_status),
    whatHappensNext: asText(raw.what_happens_next, FAMILY_FALLBACK),
    expectedDuration: parseDuration(raw.expected_duration),
    lastUpdatedAt: asText(raw.last_updated_at, ""),
    hospitalContact: parseContact(raw.hospital_contact),
    hospitalVisiting: asText(raw.hospital_visiting, ""),
  };
}
