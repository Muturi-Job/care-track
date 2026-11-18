import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FamilyPayload } from "@/lib/family/types";
import { makeFamilyPayload } from "@/test/fixtures";

import { FamilyLive } from "./family-live";

const START = new Date("2026-11-14T10:00:00Z");

function familyJson(overrides: Partial<FamilyPayload> = {}): Record<string, unknown> {
  const payload = makeFamilyPayload(overrides);

  return {
    patient_alias: payload.patientAlias,
    procedure: payload.procedure,
    stages: payload.stages.map((stage) => ({
      label: stage.label,
      family_explanation: stage.explanation,
      state: stage.state,
    })),
    current_stage: {
      label: payload.currentStage.label,
      family_explanation: payload.currentStage.explanation,
      state: payload.currentStage.state,
    },
    special_status: payload.specialStatus,
    what_happens_next: payload.whatHappensNext,
    expected_duration: payload.expectedDuration
      ? {
          min_minutes: payload.expectedDuration.minMinutes,
          max_minutes: payload.expectedDuration.maxMinutes,
        }
      : null,
    last_updated_at: payload.lastUpdatedAt,
    hospital_contact: payload.hospitalContact,
    hospital_visiting: payload.hospitalVisiting,
  };
}

/** A response-shaped object: jsdom has no fetch classes of its own. */
function fakeResponse(
  body: unknown,
  { status = 200, etag = null }: { status?: number; etag?: string | null } = {},
): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (name: string) => (name.toLowerCase() === "etag" && etag !== null ? etag : null),
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function renderLive(etag: string | null = 'W/"1"') {
  render(<FamilyLive code="ABCDEFGHJK" initial={makeFamilyPayload()} initialEtag={etag} />);
}

async function poll(ms = 10_000) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("FamilyLive", () => {
  it("renders the server's first view and pings once without polling", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderLive();

    expect(screen.getByRole("heading", { level: 2, name: "Preparing" })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/family/ABCDEFGHJK/session");
  });

  it("polls with the last ETag and shows the new stage, announcing it", async () => {
    const fetchMock = vi.fn(async () =>
      fakeResponse(
        familyJson({
          currentStage: {
            label: "Heading to theatre",
            explanation: "You go to the theatre area.",
            state: "current",
          },
        }),
        { etag: 'W/"2"' },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderLive('W/"1"');
    await poll();

    expect(fetchMock).toHaveBeenCalledWith("/api/family/ABCDEFGHJK?etag=W%2F%221%22", {
      cache: "no-store",
    });
    expect(screen.getByRole("heading", { level: 2, name: "Heading to theatre" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Now: Heading to theatre.");
  });

  it("costs nothing when nothing changed: a 304 keeps the page still and silent", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => fakeResponse(null, { status: 304 })));

    renderLive();
    await poll();

    expect(screen.getByRole("heading", { level: 2, name: "Preparing" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("");
    expect(screen.queryByText(/We could not refresh/)).toBeNull();
  });

  it("announces an update from the care team in its approved wording", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        fakeResponse(
          familyJson({
            specialStatus: {
              kind: "delayed",
              message: "The team is running a little behind schedule. We will keep updating this page.",
            },
          }),
        ),
      ),
    );

    renderLive();
    await poll();

    expect(screen.getAllByText(/running a little behind schedule/).length).toBeGreaterThan(0);
    expect(screen.getByRole("status").textContent).toContain(
      "The team is running a little behind schedule.",
    );
  });

  it("announces changed wording even when the special status kind stays the same", async () => {
    const initial = makeFamilyPayload({
      specialStatus: {
        kind: "delayed",
        message: "The team is running a little behind schedule.",
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        fakeResponse(
          familyJson({
            specialStatus: {
              kind: "delayed",
              message: "The team is still running a little behind schedule.",
            },
          }),
        ),
      ),
    );

    render(
      <FamilyLive code="ABCDEFGHJK" initial={initial} initialEtag='W/"1"' />,
    );
    await poll();

    expect(screen.getByRole("status").textContent).toContain(
      "The team is still running a little behind schedule.",
    );
  });

  it("keeps the last known status when a poll fails, then recovers on refresh", async () => {
    const fetchMock = vi.fn<() => Promise<Response>>();
    fetchMock.mockRejectedValue(new TypeError("network down"));
    vi.stubGlobal("fetch", fetchMock);

    renderLive();
    await poll();

    expect(screen.getByRole("heading", { level: 2, name: "Preparing" })).toBeTruthy();
    expect(screen.getByText(/We could not refresh just now\./)).toBeTruthy();

    await poll(2 * 60_000);

    expect(screen.getByText(/Last checked 2 minutes ago\./)).toBeTruthy();

    fetchMock.mockResolvedValue(fakeResponse(familyJson(), { etag: 'W/"2"' }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.queryByText(/We could not refresh just now/)).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Preparing" })).toBeTruthy();
  });

  it("replaces the page with a kind message when the link runs out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        fakeResponse(
          {
            error: "link_expired",
            message:
              "This tracking link is no longer active. Please call the care team if you need an update.",
          },
          { status: 410 },
        ),
      ),
    );

    renderLive();
    await poll();

    expect(screen.getByRole("heading", { level: 1, name: "This link has expired" })).toBeTruthy();
    expect(screen.getByText(/no longer active/)).toBeTruthy();
  });

  it("shows the friendly unknown-link message if the code stops existing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        fakeResponse(
          {
            error: "not_found",
            message: "We could not find this page. Please check the link, or call the care team.",
          },
          { status: 404 },
        ),
      ),
    );

    renderLive();
    await poll();

    expect(
      screen.getByRole("heading", { level: 1, name: "This link is not available" }),
    ).toBeTruthy();
    expect(screen.getByText(/We could not find this page/)).toBeTruthy();
  });
});
