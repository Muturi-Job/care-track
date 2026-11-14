import { describe, expect, it } from "vitest";

import { makeEpisode } from "@/test/fixtures";

import {
  applyAdvance,
  applyClearFlag,
  applyFlag,
  describeHistoryEntry,
  formatMinutes,
  overdueLabel,
  sortForStaff,
} from "./episodes";

describe("formatMinutes", () => {
  it("stays short enough for a phone card", () => {
    expect(formatMinutes(0)).toBe("0 min");
    expect(formatMinutes(12)).toBe("12 min");
    expect(formatMinutes(59)).toBe("59 min");
    expect(formatMinutes(60)).toBe("1 h");
    expect(formatMinutes(65)).toBe("1 h 05 min");
    expect(formatMinutes(125)).toBe("2 h 05 min");
  });

  it("never shows a negative or broken time", () => {
    expect(formatMinutes(-5)).toBe("0 min");
    expect(formatMinutes(Number.NaN)).toBe("0 min");
  });
});

describe("overdueLabel", () => {
  it("is quiet when the stage is on time", () => {
    expect(overdueLabel(makeEpisode())).toBeNull();
  });

  it("says how late a stage is", () => {
    expect(overdueLabel(makeEpisode({ minutesOverdue: 25 }))).toBe("Overdue by 25 min");
  });
});

describe("sortForStaff", () => {
  it("puts flagged episodes first, then overdue ones", () => {
    const onTrack = makeEpisode({ id: "on-track", minutesInStage: 5 });
    const overdue = makeEpisode({ id: "overdue", minutesOverdue: 30, minutesInStage: 50 });
    const flagged = makeEpisode({
      id: "flagged",
      statusFlag: "delayed",
      delayReason: "awaiting_bed",
      minutesInStage: 8,
    });

    const sorted = sortForStaff([onTrack, overdue, flagged]);

    expect(sorted.map((episode) => episode.id)).toEqual(["flagged", "overdue", "on-track"]);
  });

  it("leaves the input array alone", () => {
    const episodes = [makeEpisode({ id: "on-track" }), makeEpisode({ id: "overdue", minutesOverdue: 10 })];

    sortForStaff(episodes);

    expect(episodes.map((episode) => episode.id)).toEqual(["on-track", "overdue"]);
  });
});

describe("applyAdvance", () => {
  it("moves the card to the next stage before the API answers", () => {
    const [advanced] = applyAdvance([makeEpisode()], "episode-1");

    expect(advanced.stageLabel).toBe("Heading to theatre");
    expect(advanced.nextStageLabel).toBeNull();
    expect(advanced.stagePosition).toBe(3);
    expect(advanced.minutesInStage).toBe(0);
    expect(advanced.minutesOverdue).toBe(0);
  });

  it("leaves other episodes untouched", () => {
    const other = makeEpisode({ id: "episode-2" });

    expect(applyAdvance([other], "episode-1")).toEqual([other]);
  });
});

describe("applyFlag", () => {
  it("shows the delay reason straight away", () => {
    const [flagged] = applyFlag([makeEpisode()], "episode-1", "delayed", "awaiting_team");

    expect(flagged.statusFlag).toBe("delayed");
    expect(flagged.delayReason).toBe("awaiting_team");
  });

  it("keeps no reason on a call-the-care-team flag", () => {
    const [flagged] = applyFlag([makeEpisode()], "episode-1", "call_care_team", "other");

    expect(flagged.statusFlag).toBe("call_care_team");
    expect(flagged.delayReason).toBeNull();
  });
});

describe("applyClearFlag", () => {
  it("clears the flag and its reason", () => {
    const flagged = makeEpisode({ statusFlag: "delayed", delayReason: "other" });
    const [cleared] = applyClearFlag([flagged], "episode-1");

    expect(cleared.statusFlag).toBe("normal");
    expect(cleared.delayReason).toBeNull();
  });
});

describe("describeHistoryEntry", () => {
  it("explains each event in plain words", () => {
    expect(describeHistoryEntry({ eventType: "advanced", label: "Preparing", at: "" })).toBe(
      "Moved to Preparing",
    );
    expect(describeHistoryEntry({ eventType: "undone", label: "Admitted", at: "" })).toBe(
      "Went back to Admitted",
    );
    expect(describeHistoryEntry({ eventType: "flagged", label: "Preparing", at: "" })).toBe(
      "Flag set while at Preparing",
    );
    expect(describeHistoryEntry({ eventType: "flag_cleared", label: "Preparing", at: "" })).toBe(
      "Flag cleared while at Preparing",
    );
  });

  it("does not guess at an unknown event", () => {
    expect(describeHistoryEntry({ eventType: "something-new", label: "Preparing", at: "" })).toBe(
      "Update while at Preparing",
    );
  });
});
