import { describe, expect, it } from "vitest";

import {
  describeAge,
  expectedDurationText,
  formatUpdatedAt,
  stageStateLabel,
  telHref,
} from "./copy";

const MINUTE = 60_000;

describe("describeAge", () => {
  it("keeps very fresh checks vague", () => {
    expect(describeAge(0, 10_000)).toBe("just now");
  });

  it("counts minutes, hours and days in plain words", () => {
    expect(describeAge(0, MINUTE)).toBe("1 minute ago");
    expect(describeAge(0, 2 * MINUTE)).toBe("2 minutes ago");
    expect(describeAge(0, 60 * MINUTE)).toBe("1 hour ago");
    expect(describeAge(0, 3 * 60 * MINUTE)).toBe("3 hours ago");
    expect(describeAge(0, 50 * 60 * MINUTE)).toBe("2 days ago");
  });

  it("never shows a negative age if the clock jumps", () => {
    expect(describeAge(10_000, 0)).toBe("just now");
  });
});

describe("expectedDurationText", () => {
  it("says nothing when no time is set", () => {
    expect(expectedDurationText(null)).toBeNull();
  });

  it("gives a range, not one number", () => {
    expect(expectedDurationText({ minMinutes: 20, maxMinutes: 30 })).toBe(
      "Usually about 20 to 30 minutes.",
    );
  });

  it("collapses a single value", () => {
    expect(expectedDurationText({ minMinutes: 15, maxMinutes: 15 })).toBe("Usually about 15 minutes.");
  });
});

describe("telHref", () => {
  it("builds a dialable number from spaced copy", () => {
    expect(telHref("0000 000 000")).toBe("tel:0000000000");
    expect(telHref("+44 20 7946 0000")).toBe("tel:+442079460000");
  });

  it("returns nothing when there is no number to dial", () => {
    expect(telHref("")).toBeNull();
    expect(telHref("Ask the ward")).toBeNull();
  });
});

describe("stageStateLabel", () => {
  it("always writes the state out, so colour is not the only signal", () => {
    expect(stageStateLabel("done")).toBe("Done");
    expect(stageStateLabel("current")).toBe("Now");
    expect(stageStateLabel("upcoming")).toBe("Coming up");
  });
});

describe("formatUpdatedAt", () => {
  it("formats a real timestamp for a UK reader", () => {
    const text = formatUpdatedAt("2026-11-14T09:41:00Z");

    expect(text).toContain("14 Nov");
    expect(text).toContain("09:41");
  });

  it("shows nothing rather than Invalid Date", () => {
    expect(formatUpdatedAt("")).toBe("");
    expect(formatUpdatedAt("not a date")).toBe("");
  });
});
