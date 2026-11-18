import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MetricSettingsForm } from "./metric-settings-form";

afterEach(() => vi.unstubAllGlobals());

describe("MetricSettingsForm", () => {
  it("loads settings and submits validated values", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return { ok: true, json: async () => ({ settings: {
          grace_minutes: 5,
          minutes_per_inquiry: 4,
          baseline_inquiries_per_episode: 3,
          minimum_sample_size: 5,
        } }) } as Response;
      }
      return { ok: true, json: async () => ({ settings: {
        grace_minutes: 5,
        minutes_per_inquiry: 3,
        baseline_inquiries_per_episode: 3,
        minimum_sample_size: 5,
      } }) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<MetricSettingsForm />);

    const minutes = await screen.findByLabelText(/Minutes per inquiry/);
    fireEvent.change(minutes, { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/staff/settings/metrics",
      expect.objectContaining({ method: "PATCH", body: expect.stringContaining('"minutes_per_inquiry":4') }),
    ));
    expect(await screen.findByText(/Settings saved/)).toBeTruthy();
  });

  it("shows analytics limitations and links to the metric definitions", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ settings: {
        grace_minutes: 5,
        minutes_per_inquiry: 3,
        baseline_inquiries_per_episode: 3,
        minimum_sample_size: 5,
      } }),
    }) as Response);
    vi.stubGlobal("fetch", fetchMock);
    render(<MetricSettingsForm />);

    expect(await screen.findByText(/staff may miss contacts or log several taps in a batch/i)).toBeTruthy();
    expect(screen.getByText(/patterns describe associations and do not establish causes/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /metric definitions, formulas, and data quality rules/i })
      .getAttribute("href"))
      .toBe("https://github.com/Muturi-Job/care-track/blob/main/docs/analytics.md");
  });
});
