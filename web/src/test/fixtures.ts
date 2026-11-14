import type { FamilyPayload } from "@/lib/family/types";
import type { StaffEpisode } from "@/lib/staff/types";

/** A complete staff episode, so each test only states what it cares about. */
export function makeEpisode(overrides: Partial<StaffEpisode> = {}): StaffEpisode {
  return {
    id: "episode-1",
    alias: "Patient A",
    bed: "Ward 3, Bed 2",
    procedureName: "Day Surgery",
    stagePosition: 2,
    stageLabel: "Preparing",
    isFinalStage: false,
    nextStageLabel: "Heading to theatre",
    minutesInStage: 12,
    expectedMinutes: 45,
    minutesOverdue: 0,
    statusFlag: "normal",
    delayReason: null,
    familyPath: "/f/ABCDEFGHJK",
    trackingCode: "ABCDEFGHJK",
    history: [],
    ...overrides,
  };
}

/** A complete family payload, so each state test only changes one thing. */
export function makeFamilyPayload(overrides: Partial<FamilyPayload> = {}): FamilyPayload {
  return {
    patientAlias: "Patient A",
    procedure: "Day Surgery",
    stages: [
      { label: "Arriving", explanation: "You are checked in.", state: "done" },
      { label: "Preparing", explanation: "The team gets things ready.", state: "current" },
      {
        label: "Heading to theatre",
        explanation: "You go to the theatre area.",
        state: "upcoming",
      },
    ],
    currentStage: { label: "Preparing", explanation: "The team gets things ready.", state: "current" },
    specialStatus: null,
    whatHappensNext: "You will go to the theatre area.",
    expectedDuration: { minMinutes: 20, maxMinutes: 30 },
    lastUpdatedAt: "2026-11-14T09:41:00Z",
    hospitalContact: {
      phone: "0000 000 000",
      text: "The care team can be reached through the ward.",
    },
    hospitalVisiting: "Visiting is arranged with the ward. Please call before you visit.",
    ...overrides,
  };
}
