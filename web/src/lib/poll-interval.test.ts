import { afterEach, describe, expect, it, vi } from "vitest";

import { pollIntervalMs } from "./poll-interval";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("pollIntervalMs", () => {
  it("uses the configured interval", () => {
    vi.stubEnv("NEXT_PUBLIC_POLL_INTERVAL_MS", "5000");

    expect(pollIntervalMs()).toBe(5000);
  });

  it("falls back to ten seconds when unset or nonsense", () => {
    vi.stubEnv("NEXT_PUBLIC_POLL_INTERVAL_MS", "");
    expect(pollIntervalMs()).toBe(10_000);

    vi.stubEnv("NEXT_PUBLIC_POLL_INTERVAL_MS", "soon");
    expect(pollIntervalMs()).toBe(10_000);
  });

  it("ignores an interval that would hammer the API", () => {
    vi.stubEnv("NEXT_PUBLIC_POLL_INTERVAL_MS", "10");

    expect(pollIntervalMs()).toBe(10_000);
  });
});
