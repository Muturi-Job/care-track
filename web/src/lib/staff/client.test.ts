import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchEpisodes, sendAdvance, sendCreateEpisode, StaffRequestError } from "./client";

type RecordedCall = { url: string; init: RequestInit };

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function stubFetch(calls: RecordedCall[], body: unknown = { episode: { id: "episode-1" } }) {
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return jsonResponse(body);
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("staff client", () => {
  it("sends a unique Idempotency-Key with every advance", async () => {
    const calls: RecordedCall[] = [];
    stubFetch(calls);

    await sendAdvance("episode-1");
    await sendAdvance("episode-1");

    expect(calls).toHaveLength(2);
    expect(calls[0].url).toBe("/api/staff/episodes/episode-1/advance");
    expect(calls[0].init.method).toBe("POST");

    const firstKey = (calls[0].init.headers as Record<string, string>)["idempotency-key"];
    const secondKey = (calls[1].init.headers as Record<string, string>)["idempotency-key"];

    expect(typeof firstKey).toBe("string");
    expect(firstKey.length).toBeGreaterThan(10);
    expect(firstKey).not.toBe(secondKey);
  });

  it("passes the search term to the list route", async () => {
    const calls: RecordedCall[] = [];
    stubFetch(calls, { episodes: [] });

    await fetchEpisodes(" Ward 3 ");

    expect(calls[0].url).toBe("/api/staff/episodes?q=Ward%203");
  });

  it("posts the three fields of a new episode", async () => {
    const calls: RecordedCall[] = [];
    stubFetch(calls, { episode: { id: "episode-9" } });

    const episode = await sendCreateEpisode({
      alias: "Patient B",
      bed: "Ward 1",
      procedureTemplateId: "template-2",
    });

    expect(calls[0].url).toBe("/api/staff/episodes");
    expect(calls[0].init.method).toBe("POST");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      alias: "Patient B",
      bed: "Ward 1",
      procedureTemplateId: "template-2",
    });
    expect(episode.id).toBe("episode-9");
  });

  it("shows the API's calm message when the request is refused", async () => {
    vi.stubGlobal("fetch", async () =>
      jsonResponse(
        {
          error: "staff_request_failed",
          message: "This episode is already at its final stage.",
        },
        422,
      ),
    );

    await expect(sendAdvance("episode-1")).rejects.toMatchObject({
      message: "This episode is already at its final stage.",
      status: 422,
    });
    await expect(sendAdvance("episode-1")).rejects.toBeInstanceOf(StaffRequestError);
  });

  it("says the API is unreachable rather than showing a stack trace", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });

    await expect(sendAdvance("episode-1")).rejects.toMatchObject({
      message: "Could not reach CareTrack. Please try again.",
    });
  });
});
