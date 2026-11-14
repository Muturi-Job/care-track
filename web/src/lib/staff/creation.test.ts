import { afterEach, describe, expect, it, vi } from "vitest";

import { staffCreationEnabled } from "./creation";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("staffCreationEnabled", () => {
  it("is enabled unless explicitly disabled", () => {
    vi.stubEnv("STAFF_CREATION_ENABLED", "");
    expect(staffCreationEnabled()).toBe(true);

    vi.stubEnv("STAFF_CREATION_ENABLED", "true");
    expect(staffCreationEnabled()).toBe(true);
  });

  it("is disabled when configured false", () => {
    vi.stubEnv("STAFF_CREATION_ENABLED", "false");
    expect(staffCreationEnabled()).toBe(false);
  });
});
