import { describe, expect, it } from "vitest";

import { parseFamilyPayload } from "./parse";
import { FAMILY_FALLBACK } from "./types";

function apiPayload(): Record<string, unknown> {
  return {
    patient_alias: "Patient A",
    procedure: "Day Surgery",
    stages: [
      { label: "Arriving", family_explanation: "You are checked in.", state: "done" },
      { label: "Preparing", family_explanation: "The team gets ready.", state: "current" },
      { label: "Heading to theatre", family_explanation: "You go through.", state: "upcoming" },
    ],
    current_stage: {
      label: "Preparing",
      family_explanation: "The team gets ready.",
      state: "current",
    },
    special_status: null,
    what_happens_next: "You will go to the theatre area.",
    expected_duration: { min_minutes: 20, max_minutes: 30 },
    last_updated_at: "2026-11-14T09:41:00Z",
    hospital_contact: { phone: "0000 000 000", text: "Call the ward." },
    hospital_visiting: "Visiting is arranged with the ward.",
  };
}

describe("parseFamilyPayload", () => {
  it("maps the API's snake_case into what the page renders", () => {
    const payload = parseFamilyPayload(apiPayload());

    expect(payload).not.toBeNull();
    expect(payload).toMatchObject({
      patientAlias: "Patient A",
      procedure: "Day Surgery",
      specialStatus: null,
      whatHappensNext: "You will go to the theatre area.",
      expectedDuration: { minMinutes: 20, maxMinutes: 30 },
      lastUpdatedAt: "2026-11-14T09:41:00Z",
      hospitalContact: { phone: "0000 000 000", text: "Call the ward." },
      hospitalVisiting: "Visiting is arranged with the ward.",
    });
    expect(payload?.stages).toHaveLength(3);
    expect(payload?.currentStage.label).toBe("Preparing");
  });

  it("refuses anything that is not a progress payload", () => {
    expect(parseFamilyPayload(null)).toBeNull();
    expect(parseFamilyPayload("nope")).toBeNull();
    expect(parseFamilyPayload({ error: "not_found" })).toBeNull();
  });

  it("works out the current stage from the list when the field is absent", () => {
    const body = apiPayload();
    delete body.current_stage;

    expect(parseFamilyPayload(body)?.currentStage.label).toBe("Preparing");
  });

  it("shows the fallback copy for a stage with no label", () => {
    const body = apiPayload();
    delete body.current_stage;
    body.stages = [{ state: "current" }];

    const payload = parseFamilyPayload(body);

    expect(payload?.currentStage.label).toBe(FAMILY_FALLBACK);
    expect(payload?.currentStage.explanation).toBe(FAMILY_FALLBACK);
    expect(payload?.currentStage.state).toBe("current");
  });

  it("treats a normal status as no status", () => {
    const body = apiPayload();
    body.special_status = { kind: "normal", message: "ignored" };

    expect(parseFamilyPayload(body)?.specialStatus).toBeNull();
  });

  it("keeps the approved wording of a real status", () => {
    const body = apiPayload();
    body.special_status = { kind: "delayed", message: "The team is running a little behind." };

    expect(parseFamilyPayload(body)?.specialStatus).toEqual({
      kind: "delayed",
      message: "The team is running a little behind.",
    });
  });

  it("uses the call-care-team fallback for an unknown status kind", () => {
    const body = apiPayload();
    body.special_status = { kind: "unrecognised_status", message: "Unknown wording." };

    expect(parseFamilyPayload(body)?.specialStatus).toEqual({
      kind: "call_care_team",
      message: FAMILY_FALLBACK,
    });
  });

  it("drops a duration it cannot read", () => {
    const body = apiPayload();
    body.expected_duration = { min_minutes: "20" };

    expect(parseFamilyPayload(body)?.expectedDuration).toBeNull();
  });

  it("treats an unknown stage state as still to come", () => {
    const body = apiPayload();
    body.stages = [{ label: "Arriving", family_explanation: "", state: "sideways" }];

    expect(parseFamilyPayload(body)?.stages[0].state).toBe("upcoming");
  });
});
