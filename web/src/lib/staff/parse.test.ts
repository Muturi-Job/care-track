import { describe, expect, it } from "vitest";

import { parseEpisode, parseEpisodes, parseErrorMessage, parseProcedureOptions } from "./parse";

describe("parseEpisode", () => {
  it("maps an API payload onto the shapes the screens use", () => {
    const episode = parseEpisode({
      id: "episode-1",
      patient_alias: "Patient A",
      ward_or_bed: "Ward 3, Bed 2",
      procedure_name: "Day Surgery",
      current_stage_position: 2,
      stage_label: "Preparing",
      is_final_stage: false,
      next_stage_label: "Heading to theatre",
      minutes_in_current_stage: 12,
      expected_minutes: 45,
      minutes_overdue: 3,
      status_flag: "delayed",
      delay_reason: "awaiting_bed",
      family_path: "/p/CODE",
      tracking_code: "CODE",
    });

    expect(episode).toMatchObject({
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
      minutesOverdue: 3,
      statusFlag: "delayed",
      delayReason: "awaiting_bed",
      familyPath: "/p/CODE",
    });
  });

  it("falls back to plain words for a surprising payload", () => {
    const episode = parseEpisode(null);

    expect(episode.alias).toBe("Unnamed patient");
    expect(episode.stageLabel).toBe("Stage not set");
    expect(episode.nextStageLabel).toBeNull();
    expect(episode.statusFlag).toBe("normal");
    expect(episode.delayReason).toBeNull();
    expect(episode.history).toEqual([]);
  });

  it("never shows a status or reason the API did not send", () => {
    expect(parseEpisode({ status_flag: "something-new" }).statusFlag).toBe("normal");
    expect(parseEpisode({ delay_reason: "made-up" }).delayReason).toBeNull();
  });

  it("keeps the stage history in the order the API sent it", () => {
    const episode = parseEpisode({
      history: [
        { event_type: "advanced", stage_label: "Preparing", occurred_at: "2026-01-02T10:00:00Z" },
        { event_type: "flagged", stage_label: "Admitted", occurred_at: "2026-01-01T09:00:00Z" },
        { nonsense: true },
      ],
    });

    expect(episode.history.map((entry) => entry.eventType)).toEqual(["advanced", "flagged"]);
    expect(episode.history[0].label).toBe("Preparing");
  });
});

describe("parseEpisodes", () => {
  it("returns an empty list instead of failing", () => {
    expect(parseEpisodes(null)).toEqual([]);
    expect(parseEpisodes({ episodes: "nope" })).toEqual([]);
  });
});

describe("parseProcedureOptions", () => {
  it("reads the procedure list for the create form", () => {
    const procedures = parseProcedureOptions({
      procedure_templates: [
        { id: "template-1", name: "Day Surgery", active: true },
        { id: "template-2", name: "Orthopaedic Surgery", active: false },
        { id: "", name: "Broken entry", active: true },
      ],
    });

    expect(procedures).toEqual([
      { id: "template-1", name: "Day Surgery", active: true },
      { id: "template-2", name: "Orthopaedic Surgery", active: false },
    ]);
  });
});

describe("parseErrorMessage", () => {
  it("prefers the API's message and otherwise uses the fallback", () => {
    expect(parseErrorMessage({ message: "This episode is already at its final stage." }, "fallback")).toBe(
      "This episode is already at its final stage.",
    );
    expect(parseErrorMessage({ error: "terminal_stage" }, "fallback")).toBe("fallback");
    expect(parseErrorMessage(null, "fallback")).toBe("fallback");
  });
});
