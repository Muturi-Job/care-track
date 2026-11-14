import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeEpisode } from "@/test/fixtures";

import { StaffEpisodes } from "./staff-episodes";

function response(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StaffEpisodes", () => {
  it("sends the advance request and reports the new stage", async () => {
    const episode = makeEpisode();
    const updatedEpisode = { ...episode, stageLabel: "Heading to theatre" };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return response({ episode: updatedEpisode });
      }

      return response({ episodes: [episode] });
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
    });
    queryClient.setQueryData(["staff-episodes", ""], [episode]);

    render(
      <QueryClientProvider client={queryClient}>
        <StaffEpisodes origin="http://localhost:3000" />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Advance to: Heading to theatre" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/staff/episodes/episode-1/advance",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(await screen.findByText("Moved Patient A to Heading to theatre.")).toBeTruthy();
  });
});
