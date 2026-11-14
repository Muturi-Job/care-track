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
    familyPath: "/p/ABCDEFGHJK",
    trackingCode: "ABCDEFGHJK",
    history: [],
    ...overrides,
  };
}
