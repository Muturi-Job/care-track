import { describe, expect, it } from "vitest";

import { parseHealth } from "./api";

describe("parseHealth", () => {
  it("reports ok when the API and database are healthy", () => {
    expect(parseHealth({ status: "ok", database: "ok" })).toEqual({
      reachable: true,
      status: "ok",
      database: "ok",
    });
  });

  it("reports degraded when the API answered but the database did not", () => {
    expect(parseHealth({ status: "degraded", database: "unavailable" })).toEqual({
      reachable: true,
      status: "degraded",
      database: "unavailable",
    });
  });

  it("treats an unrecognised status as unreachable", () => {
    expect(parseHealth({ status: "something-new", database: "ok" })).toEqual({
      reachable: false,
      status: "unreachable",
      database: "unknown",
    });
  });

  it("treats a non-object payload as unreachable", () => {
    expect(parseHealth(null).reachable).toBe(false);
    expect(parseHealth("ok").reachable).toBe(false);
  });

  it("does not invent a database status it does not understand", () => {
    expect(parseHealth({ status: "ok", database: "banana" }).database).toBe("unknown");
  });
});
